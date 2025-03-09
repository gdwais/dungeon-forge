import { OpenAIEmbeddings } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";

export class Retriever {
  private vectorStore!: Chroma;

  constructor(
    private readonly openAIApiKey: string,
    private readonly collectionName: string = "default_collection"
  ) {}

  async initialize() {
    // Connect to existing ChromaDB collection
    this.vectorStore = await Chroma.fromExistingCollection(
      new OpenAIEmbeddings({ openAIApiKey: this.openAIApiKey }),
      { collectionName: this.collectionName }
    );
  }

  getRetriever() {
    if (!this.vectorStore) {
      throw new Error("Vector store not initialized. Call initialize() first.");
    }
    return this.vectorStore.asRetriever();
  }
} 