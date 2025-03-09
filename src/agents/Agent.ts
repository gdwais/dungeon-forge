import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
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

    const model = new ChatOpenAI({
      model: "gpt-4o-mini",
      apiKey: this.openaiApiKey,
    }).bindTools(tools);
    const toolNode = new ToolNode(tools);

    const callModel = async (state: typeof MessagesAnnotation.State) => {
      const response = await model.invoke(state.messages);
      return { messages: [response] };
    };

    const shouldContinue = async ({
      messages,
    }: typeof MessagesAnnotation.State) => {
      const lastMessage = messages[messages.length - 1] as AIMessage;

      // If the LLM makes a tool call, then we route to the "tools" node
      if (lastMessage.tool_calls?.length) {
        return "tools";
      }
      return "__end__";
    };

    const workflow = new StateGraph(MessagesAnnotation)
      .addNode("agent", callModel)
      .addEdge("__start__", "agent")
      .addNode("tools", toolNode)
      .addEdge("tools", "agent")
      .addConditionalEdges("agent", shouldContinue);

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
