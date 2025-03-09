#!/usr/bin/env node

import { Command } from 'commander';
import { DiceRoller } from './utils/DiceRoller';
import { Agent } from './agents/Agent';
import dotenv from 'dotenv';
import chalk from 'chalk';
import { processStream } from './utils/StreamHandler';

dotenv.config();

const tavilyApiKey = process.env.TAVILY_API_KEY as string;
const openaiApiKey = process.env.OPEN_AI_API_KEY as string;

if (!tavilyApiKey || !openaiApiKey) {
  throw new Error('TAVILY_API_KEY and OPEN_AI_API_KEY must be set');
}

const program = new Command();
const diceRoller = new DiceRoller();
const agent = new Agent(tavilyApiKey, openaiApiKey);

program
  .name('forge')
  .description('AI-powered D&D assistant')
  .version('1.0.0');

program
  .command('roll')
  .description('Roll dice (e.g., 2d6, 1d20)')
  .argument('<dice>', 'Dice notation (e.g., 2d6, 1d20)')
  .action((dice) => {
    try {
      console.log(chalk.cyan(`Rolling ${chalk.bold(dice)}...`));
      const result = diceRoller.roll(dice);
      console.log(chalk.yellow(`Rolls: [${result.rolls.join(', ')}]`));
      console.log(chalk.green(`Total: ${chalk.bold(result.total)}`));
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error(chalk.red(`Error: ${err.message}`));
      } else {
        console.error(chalk.red('An unknown error occurred'));
      }
      console.log(chalk.yellow('Please use valid dice notation like "2d6" or "1d20+5"'));
    }
  });

program
  .command('lookup')
  .description('Look up D&D rules or information')
  .argument('<query>', 'What to look up')
  .action(async (query) => {
    try {
      console.log(chalk.cyan(`Looking up: ${chalk.bold(query)}`));
      console.log(chalk.yellow("Searching for information..."));
      await agent.initialize();
      
      // Stream the response using the utility function
      const stream = await agent.streamAsk(query);
      await processStream(stream, { textWidth: 400 });
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error(chalk.red(`Error during lookup: ${err.message}`));
      } else {
        console.error(chalk.red('An unknown error occurred during lookup'));
      }
    }
  });

// Add explicit help command
program
  .command('help')
  .description('Display help information')
  .action(() => {
    program.outputHelp();
  });

// Default command when no arguments are provided
if (process.argv.length === 2) {
  console.log(chalk.green.bold("Welcome to DungeonForge - Your AI-powered D&D assistant!"));
  console.log(chalk.yellow(`Type ${chalk.cyan('forge help')} to see available commands.`));
}

program.parse(); 