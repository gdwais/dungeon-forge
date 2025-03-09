# DungeonForge

DungeonForge is an AI-powered assistant designed to enhance your Dungeons & Dragons 5th Edition experience. This tool helps players and Dungeon Masters with character creation, rule lookups, story generation, and more.

## Features

- **Character Creation**: Generate complete D&D 5e characters with backstories
- **Rules Reference**: Quick access to D&D 5e Player's Handbook rules through a RAG (Retrieval-Augmented Generation) system
- **Story Hooks**: Generate compelling adventure hooks and plot ideas
- **Character Development**: Get suggestions for character progression, equipment, and roleplaying
- **Backstory Generation**: Create rich character backstories that tie into campaign settings

## Technical Overview

DungeonForge is built using TypeScript and Node.js with the following components:

- **RAG System**: Retrieval-augmented generation system containing indexed D&D 5e Player's Handbook content
- **In-Memory Store**: Maintains session state and remembers character information
- **AI Generation**: Creates narratives, character concepts, and gameplay suggestions

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/dungeonforge.git
   cd dungeonforge
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up required files (not included in the repository):
   
   Create a `.env` file in the root directory based on the provided `.env.example`:
   ```
   NODE_ENV=development
   DATABASE_URL="postgresql://admin:password@localhost:5005/dungeonforge"
   CHROMA_URL="http://localhost:8005"
   TAVILY_API_KEY="your_tavily_api_key_here"
   OPEN_AI_API_KEY="your_openai_api_key_here"
   ```

   Create a `data` directory in the root folder for document storage:
   ```
   mkdir -p data/documents
   ```

   Add your D&D reference documents in PDF format to the `data/documents` folder. These will be used by the RAG system for rule lookups.

   If you're using Docker for the database and vector store:
   ```
   docker-compose up -d
   ```
   This will start the PostgreSQL database and ChromaDB vector store services.

4. Build the project:
   ```
   npm run build
   ```

5. Start the application:
   ```
   npm start
   ```

For development with automatic reloading:
   ```
   npm run dev
   ```

## Usage

DungeonForge provides a command-line interface with the following commands:

- **Roll dice**: Roll dice using standard D&D notation
  ```
  forge roll 2d6+3
  forge roll 1d20
  ```

- **Look up rules**: Search for D&D rules and information
  ```
  forge lookup "strength check"
  forge lookup "wizard spells"
  ```

- **Help**: Display available commands
  ```
  forge help
  ```

The tool will stream responses in real-time with proper formatting for better readability.

## Project Structure 