#!/usr/bin/env node

/**
 * Command-line interface for the multi-agent system
 */

import { AgentOrchestrator } from './orchestrator';
import { Task } from './types';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const orchestrator = new AgentOrchestrator();

  switch (command) {
    case 'execute':
      await executeTask(orchestrator, args);
      break;
    case 'stats':
      await showStats(orchestrator);
      break;
    case 'skills':
      await listSkills(orchestrator);
      break;
    case 'help':
    default:
      showHelp();
      break;
  }
}

async function executeTask(orchestrator: AgentOrchestrator, args: string[]) {
  const taskType = args[1];
  const description = args.slice(2).join(' ');

  if (!taskType || !description) {
    console.error('Usage: agents execute <task-type> <description>');
    return;
  }

  const task: Task = {
    type: taskType,
    description: description
  };

  console.log('\n🚀 Starting task execution...\n');
  const result = await orchestrator.executeTask(task);

  console.log('\n✅ Task completed!\n');
  console.log('Result:', JSON.stringify(result, null, 2));
}

async function showStats(orchestrator: AgentOrchestrator) {
  console.log('\n📊 Agent Statistics\n');
  const stats = await orchestrator.getStats();
  console.log(JSON.stringify(stats, null, 2));
}

async function listSkills(orchestrator: AgentOrchestrator) {
  console.log('\n📚 Learned Skills\n');
  // Implementation to list all skill files
  console.log('Skills listing coming soon...');
}

function showHelp() {
  console.log(`
🤖 Multi-Agent System CLI

Usage:
  agents execute <task-type> <description>  Execute a task
  agents stats                               Show agent statistics
  agents skills                              List learned skills
  agents help                                Show this help

Examples:
  agents execute code-generation "Create a REST API endpoint"
  agents execute debugging "Fix the authentication bug"
  agents execute data-analysis "Analyze user attendance patterns"
  `);
}

main().catch(console.error);
