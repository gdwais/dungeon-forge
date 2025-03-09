import chalk from 'chalk';

// Define types for the chunk structure
interface Message {
  content?: string;
  name?: string;
  tool_call_id?: string;
  additional_kwargs?: {
    tool_calls?: Array<{
      function?: {
        name?: string;
      };
    }>;
    function_call?: {
      name?: string;
    };
  };
}

interface StreamChunk {
  tools?: {
    messages?: Message[];
  };
  agent?: {
    messages?: Message[];
  };
  content?: string;
  type?: string;
  role?: string;
}

/**
 * Wraps text at a specific width
 * @param text Text to wrap
 * @param width Maximum width for each line
 * @returns Text with line breaks inserted
 */
export const wrapText = (text: string, width: number): string => {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  words.forEach(word => {
    if (currentLine.length + word.length + 1 <= width) {
      currentLine += (currentLine.length === 0 ? '' : ' ') + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  });
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines.join('\n');
};

/**
 * Applies markdown-like formatting to text
 * @param text Text to format
 * @returns Formatted text with chalk styling
 */
export const applyMarkdownFormatting = (text: string): string => {
  return text
    // Bold text: **text** or __text__
    .replace(/\*\*(.*?)\*\*|__(.*?)__/g, (_, g1, g2) => chalk.bold(g1 || g2))
    // Italic text: *text* or _text_
    .replace(/\*(.*?)\*|_(.*?)_/g, (_, g1, g2) => chalk.italic(g1 || g2))
    // Code: `text`
    .replace(/`(.*?)`/g, (_, g1) => chalk.yellow(g1));
};

/**
 * Formats and prints a paragraph with appropriate styling
 * @param paragraph Paragraph text to format and print
 * @param width Maximum width for text wrapping (default: 100)
 */
export const formatAndPrintParagraph = (paragraph: string, width = 100): void => {
  if (!paragraph.trim()) return;
  
  // Check if it's a heading (ends with a colon or is all caps)
  if (paragraph.trim().endsWith(':') || /^[A-Z\s]+$/.test(paragraph.trim())) {
    console.log(chalk.cyan.bold(paragraph.trim()));
  } else {
    // Wrap text at specified width for better readability
    const wrappedText = wrapText(paragraph.trim(), width);
    
    // Apply markdown-like formatting
    const formattedText = applyMarkdownFormatting(wrappedText);
    
    console.log(chalk.white(formattedText));
  }
  console.log(''); // Add empty line between paragraphs
};

/**
 * Extracts content from a stream chunk
 * @param chunk Stream chunk to extract content from
 * @returns Object containing content and system message info
 */
export const extractContentFromChunk = (chunk: StreamChunk): { 
  chunkContent: string; 
  isSystemMessage: boolean; 
  systemMessageInfo: string;
} => {
  let chunkContent = '';
  let isSystemMessage = false;
  let systemMessageInfo = '';
  
  // Check if content is in tools.messages
  if (chunk.tools?.messages && Array.isArray(chunk.tools.messages)) {
    for (const message of chunk.tools.messages) {
      if (message.content && typeof message.content === 'string') {
        chunkContent += message.content;
      }
      
      // Check if this is a tool call
      if (message.name || message.tool_call_id) {
        isSystemMessage = true;
        systemMessageInfo = `Using ${message.name || 'tool'} to find information`;
      }
    }
  }
  
  // Check if content is in agent.messages
  if (chunk.agent?.messages && Array.isArray(chunk.agent.messages)) {
    for (const message of chunk.agent.messages) {
      if (message.content && typeof message.content === 'string') {
        chunkContent += message.content;
      }
      
      // Check for tool calls in agent messages
      if (message.additional_kwargs?.tool_calls && Array.isArray(message.additional_kwargs.tool_calls)) {
        isSystemMessage = true;
        const toolCalls = message.additional_kwargs.tool_calls;
        if (toolCalls.length > 0 && toolCalls[0].function) {
          systemMessageInfo = `Using ${toolCalls[0].function.name || 'tool'} to find information`;
        } else {
          systemMessageInfo = 'Using tools to find information';
        }
      }
      
      // Check for function calls
      if (message.additional_kwargs?.function_call) {
        isSystemMessage = true;
        systemMessageInfo = `Executing function: ${message.additional_kwargs.function_call.name || 'unknown'}`;
      }
    }
  }
  
  // Check for other system indicators
  if (chunk.type === 'system' || chunk.role === 'system' || 
      (typeof chunk.content === 'string' && chunk.content.startsWith('System:'))) {
    isSystemMessage = true;
    systemMessageInfo = 'Processing your request';
  }
  
  // Fallback: check if content is directly in the chunk
  if (!chunkContent && chunk.content && typeof chunk.content === 'string') {
    chunkContent = chunk.content;
  }
  
  return { chunkContent, isSystemMessage, systemMessageInfo };
};

/**
 * Processes a stream of chunks and displays the content
 * @param stream Async iterable stream of chunks
 * @param options Optional configuration
 */
export const processStream = async (
  stream: AsyncIterable<StreamChunk>, 
  options: { 
    debugMode?: boolean;
    headerText?: string;
    footerText?: string;
    textWidth?: number;
  } = {}
): Promise<void> => {
  const { 
    debugMode = false,
    headerText = '\n╔══════════════════ RESULT ══════════════════╗',
    footerText = '╚═══════════════════════════════════════════╝',
    textWidth = 100
  } = options;
  
  // Print header
  console.log(chalk.magenta.bold(headerText));
  
  let content = '';
  
  // Process the stream chunks
  for await (const chunk of stream) {
    // Debug: log the chunk structure
    if (debugMode) {
      console.log('Chunk structure:', JSON.stringify(chunk, null, 2));
    }
    
    const { chunkContent, isSystemMessage, systemMessageInfo } = extractContentFromChunk(chunk);
    
    // If this is a system message, print an abbreviated result
    if (isSystemMessage) {
      console.log(chalk.dim(`[System: ${systemMessageInfo}]`));
    }
    
    // If we found content, process it
    if (chunkContent) {
      // Accumulate content
      content += chunkContent;
      
      // Check if we have complete paragraphs to display
      if (content.includes('\n\n')) {
        const parts = content.split('\n\n');
        // Keep the last part (potentially incomplete paragraph) for the next iteration
        const lastPart = parts.pop() || '';
        
        // Process complete paragraphs
        for (const paragraph of parts) {
          formatAndPrintParagraph(paragraph, textWidth);
        }
        
        // Update content with the remaining incomplete paragraph
        content = lastPart;
      }
    }
  }
  
  // Process any remaining content after the stream ends
  if (content.trim()) {
    const paragraphs = content.split('\n\n');
    for (const paragraph of paragraphs) {
      formatAndPrintParagraph(paragraph, textWidth);
    }
  }
  
  // Print footer
  console.log(chalk.magenta.bold(footerText));
}; 