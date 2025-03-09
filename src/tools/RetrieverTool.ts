import { BaseRetriever } from "@langchain/core/retrievers";
import { DynamicTool } from "@langchain/core/tools";

export class RetrieverTool extends DynamicTool {
  constructor(retriever: BaseRetriever) {
    super({
      name: "search_documents",
      description:
        "Searches through the loaded documents to find relevant information. Use this when you need to answer questions about specific topics in the knowledge base.",
      func: async (query: string) => {
        const docs = await retriever.getRelevantDocuments(query);
        return docs.map((doc) => doc.pageContent).join("\n\n");
      },
    });
  }
} 