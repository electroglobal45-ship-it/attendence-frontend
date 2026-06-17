/**
 * Multi-Agent System
 * Main entry point for the agent orchestration system
 */

export { AgentOrchestrator } from './orchestrator';
export { taskTracker, TaskTracker } from './integration/task-tracker';
export { ClaudeAgent } from './models/claude-agent';
export { GPTAgent } from './models/gpt-agent';
export { GeminiAgent } from './models/gemini-agent';
export { BaseAgent } from './models/base-agent';

export * from './types';

// Quick start helper
export async function initializeAgents() {
  const { AgentOrchestrator } = await import('./orchestrator');
  return new AgentOrchestrator();
}
