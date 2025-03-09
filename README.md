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

3. Build the project:
   ```
   npm run build
   ```

4. Start the application:
   ```
   npm start
   ```

For development with automatic reloading:
   ```
   npm run dev
   ```

## Usage

Once running, DungeonForge can help with:

- Creating new characters with `!create character`
- Looking up rules with `!rules [topic]`
- Generating story hooks with `!hook [theme]`
- Developing character backstories with `!backstory [character name]`

## Project Structure 