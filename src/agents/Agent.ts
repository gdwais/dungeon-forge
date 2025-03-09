import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { END } from "@langchain/langgraph";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import { pull } from "langchain/hub";
import { DateTool } from "../tools/DateTool";
import { RetrieverTool } from "../tools/RetrieverTool";
import { Retriever } from "../retrieval/Retriever";

export class Agent {
  private app?: ReturnType<typeof StateGraph.prototype.compile>;
  private readonly retriever: Retriever;

  constructor(
    private readonly tavilyApiKey: string,
    private readonly openaiApiKey: string,
    private readonly collectionName: string = "dungeonforge_collection"
  ) {
    this.tavilyApiKey = tavilyApiKey;
    this.openaiApiKey = openaiApiKey;
    this.collectionName = collectionName;
    this.retriever = new Retriever(this.openaiApiKey, this.collectionName);
  }

  async initialize() {
    await this.retriever.initialize();
    
    const tools = [
      new TavilySearchResults({ maxResults: 5, apiKey: this.tavilyApiKey }),
      new DateTool(),
      new RetrieverTool(this.retriever.getRetriever()),
    ];

    // Define the relevance grading tool
    const relevanceGradingTool = {
      name: "give_relevance_score",
      description: "Give a relevance score to the retrieved documents.",
      schema: z.object({
        binaryScore: z.string().describe("Relevance score 'yes' or 'no'"),
      })
    };

    // Create the tool node
    const toolNode = new ToolNode(tools);

    // Define the agent node
    const agent = async (state: typeof MessagesAnnotation.State): Promise<Partial<typeof MessagesAnnotation.State>> => {
      console.log("---CALL AGENT---");

      const { messages } = state;
      // Filter out relevance scoring messages
      const filteredMessages = messages.filter((message) => {
        if ("tool_calls" in message && Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
          return message.tool_calls[0].name !== "give_relevance_score";
        }
        return true;
      });

      const model = new ChatOpenAI({
        model: "gpt-4o-mini",
        apiKey: this.openaiApiKey,
        streaming: true,
      }).bindTools(tools);

      const response = await model.invoke(filteredMessages);
      return {
        messages: [response],
      };
    };

    // Define the query rewriting node
    const rewrite = async (state: typeof MessagesAnnotation.State): Promise<Partial<typeof MessagesAnnotation.State>> => {
      console.log("---TRANSFORM QUERY---");

      const { messages } = state;
      const question = messages[0].content as string;
      const prompt = ChatPromptTemplate.fromTemplate(
        `Look at the input and try to reason about the underlying semantic intent / meaning. \n 
Here is the initial question:
\n ------- \n
{question} 
\n ------- \n
Formulate an improved question that will help retrieve the most relevant D&D 5e information:`,
      );

      const model = new ChatOpenAI({
        model: "gpt-4o-mini",
        apiKey: this.openaiApiKey,
        temperature: 0,
      });
      
      const response = await prompt.pipe(model).invoke({ question });
      return {
        messages: [response],
      };
    };

    // Define the document relevance grading node
    const gradeDocuments = async (state: typeof MessagesAnnotation.State): Promise<Partial<typeof MessagesAnnotation.State>> => {
      console.log("---GET RELEVANCE---");

      const { messages } = state;
      
      const model = new ChatOpenAI({
        model: "gpt-4o-mini",
        apiKey: this.openaiApiKey,
        temperature: 0,
      }).bindTools([relevanceGradingTool], {
        tool_choice: relevanceGradingTool.name,
      });

      const prompt = ChatPromptTemplate.fromTemplate(
        `You are a grader assessing relevance of retrieved docs to a user question about D&D 5e.
Here are the retrieved docs:
\n ------- \n
{context} 
\n ------- \n
Here is the user question: {question}
If the content of the docs are relevant to the user's question about D&D 5e, score them as relevant.
Give a binary score 'yes' or 'no' score to indicate whether the docs are relevant to the question.
Yes: The docs are relevant to the question.
No: The docs are not relevant to the question.`,
      );

      const chain = prompt.pipe(model);

      // Find the last tool message (which should contain the retrieved documents)
      const lastToolMessage = messages.slice().reverse().find(
        (msg) => msg._getType() === "tool"
      ) as ToolMessage | undefined;

      if (!lastToolMessage) {
        throw new Error("No tool message found in the conversation history");
      }

      const score = await chain.invoke({
        question: messages[0].content as string,
        context: lastToolMessage.content as string,
      });

      return {
        messages: [score]
      };
    };

    // Define the answer generation node
    const generate = async (state: typeof MessagesAnnotation.State): Promise<Partial<typeof MessagesAnnotation.State>> => {
      console.log("---GENERATE---");

      const { messages } = state;
      const question = messages[0].content as string;
      
      // Extract the most recent ToolMessage
      const lastToolMessage = messages.slice().reverse().find(
        (msg) => msg._getType() === "tool"
      ) as ToolMessage | undefined;
      
      if (!lastToolMessage) {
        throw new Error("No tool message found in the conversation history");
      }

      const docs = lastToolMessage.content as string;

      // Try to pull the RAG prompt from LangChain Hub, or use a fallback if that fails
      let prompt;
      try {
        prompt = await pull<ChatPromptTemplate>("rlm/rag-prompt");
      } catch (error) {
        // Fallback prompt if the hub pull fails
        prompt = ChatPromptTemplate.fromTemplate(
          `You are a helpful D&D 5e assistant. Use the following pieces of retrieved context to answer the question. 
If you don't know the answer, just say that you don't know.

Context:
{context}

Question: {question}

Answer the question based on the context provided. Be comprehensive and detailed in your response.`
        );
      }

      const llm = new ChatOpenAI({
        model: "gpt-4o-mini",
        apiKey: this.openaiApiKey,
        temperature: 0,
        streaming: true,
      });

      const ragChain = prompt.pipe(llm);

      const response = await ragChain.invoke({
        context: docs,
        question,
      });

      return {
        messages: [response],
      };
    };

    // Define the edge functions
    const shouldRetrieve = (state: typeof MessagesAnnotation.State): string => {
      const { messages } = state;
      console.log("---DECIDE TO RETRIEVE---");
      const lastMessage = messages[messages.length - 1];

      if ("tool_calls" in lastMessage && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls.length) {
        console.log("---DECISION: RETRIEVE---");
        return "retrieve";
      }
      // If there are no tool calls then we finish.
      return END;
    };

    const checkRelevance = (state: typeof MessagesAnnotation.State): string => {
      console.log("---CHECK RELEVANCE---");

      const { messages } = state;
      const lastMessage = messages[messages.length - 1];
      if (!("tool_calls" in lastMessage)) {
        throw new Error("The 'checkRelevance' node requires the most recent message to contain tool calls.");
      }
      
      const toolCalls = (lastMessage as AIMessage).tool_calls;
      if (!toolCalls || !toolCalls.length) {
        throw new Error("Last message was not a function message");
      }

      if (toolCalls[0].args.binaryScore === "yes") {
        console.log("---DECISION: DOCS RELEVANT---");
        return "yes";
      }
      console.log("---DECISION: DOCS NOT RELEVANT---");
      return "no";
    };

    // Build the workflow graph
    const workflow = new StateGraph(MessagesAnnotation)
      // Add nodes
      .addNode("rewrite", rewrite)
      .addNode("agent", agent)
      .addNode("tools", toolNode)
      .addNode("grade_documents", gradeDocuments)
      .addNode("generate", generate)
      
      // Add edges
      .addEdge("__start__", "rewrite")
      .addEdge("rewrite", "agent")
      .addConditionalEdges("agent", shouldRetrieve, {
        retrieve: "tools",
        [END]: "generate",
      })
      .addEdge("tools", "grade_documents")
      .addConditionalEdges("grade_documents", checkRelevance, {
        yes: "generate",
        no: "agent",
      })
      .addEdge("generate", END);

    this.app = workflow.compile();
  }

  async lookup(query: string) {
    if (!this.app) {
      throw new Error("Agent not initialized. Call initialize() first.");
    }
    return await this.app.invoke({
      messages: [new HumanMessage(query)],
    });
  }

  async streamAsk(question: string) {
    if (!this.app) {
      throw new Error("Agent not initialized. Call initialize() first.");
    }
    return await this.app.stream({
      messages: [new HumanMessage(question)],
    });
  }
}
