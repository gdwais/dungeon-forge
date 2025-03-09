import { ChromaClient } from 'chromadb';
import { OpenAIEmbeddingFunction } from 'chromadb';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const OPENAI_API_KEY = process.env.OPEN_AI_API_KEY;
const COLLECTION_NAME = 'dungeonforge_collection';
const PDF_DIRECTORY = path.join(__dirname, 'files');
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

if (!OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY environment variable is not set');
  process.exit(1);
}

async function main() {
  console.log('Starting RAG import process...');
  
  // Initialize Chroma client
  const client = new ChromaClient();
  
  // Initialize embedding function with OpenAI
  const embedder = new OpenAIEmbeddingFunction({
    openai_api_key: OPENAI_API_KEY as string,
    openai_model: 'text-embedding-ada-002'
  });
  
  // Get or create collection
  let collection;
  try {
    collection = await client.getCollection({
      name: COLLECTION_NAME,
      embeddingFunction: embedder
    });
    console.log(`Using existing collection: ${COLLECTION_NAME}`);
  } catch (error) {
    collection = await client.createCollection({
      name: COLLECTION_NAME,
      embeddingFunction: embedder
    });
    console.log(`Created new collection: ${COLLECTION_NAME}`);
  }
  
  // Clear existing collection
  if (!fs.existsSync(PDF_DIRECTORY)) {
    console.error(`Directory not found: ${PDF_DIRECTORY}`);
    process.exit(1);
  }
  
  // Get all PDF files
  const files = fs.readdirSync(PDF_DIRECTORY)
    .filter(file => file.toLowerCase().endsWith('.pdf'))
    .map(file => path.join(PDF_DIRECTORY, file));
  
  if (files.length === 0) {
    console.log('No PDF files found in the directory');
    process.exit(0);
  }
  
  console.log(`Found ${files.length} PDF files to process`);
  
  // Text splitter for chunking
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP
  });
  
  // Process each PDF file
  for (const filePath of files) {
    const fileName = path.basename(filePath);
    console.log(`Processing: ${fileName}`);
    
    try {
      // Load PDF
      const loader = new PDFLoader(filePath);
      const docs = await loader.load();
      console.log(`Loaded ${docs.length} pages from ${fileName}`);
      
      // Split text into chunks
      const chunks = await textSplitter.splitDocuments(docs);
      console.log(`Split into ${chunks.length} chunks`);
      
      // Prepare data for Chroma
      const ids = chunks.map((_, i) => `${fileName.replace('.pdf', '')}_chunk_${i}`);
      const texts = chunks.map(chunk => chunk.pageContent);
      const metadatas = chunks.map(chunk => ({
        source: fileName,
        page: chunk.metadata.loc?.pageNumber || 0,
        text: chunk.pageContent.slice(0, 100) + '...' // Preview of content
      }));
      
      // Add chunks to collection
      await collection.add({
        ids: ids,
        documents: texts,
        metadatas: metadatas
      });
      
      console.log(`Added ${chunks.length} chunks from ${fileName} to Chroma`);
    } catch (error) {
      console.error(`Error processing ${fileName}:`, error);
    }
  }
  
  console.log('RAG import process completed successfully');
}

main().catch(error => {
  console.error('Error in RAG import process:', error);
  process.exit(1);
});
