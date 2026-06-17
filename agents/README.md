# Multi-Agent System

This folder contains the multi-agent AI system for the Attendance Management project. The system uses multiple AI models (Claude, GPT, Gemini) to handle different types of tasks and continuously learns from each execution.

## Architecture

```
agents/
├── models/           # AI model configurations
├── orchestrator/     # Task routing and coordination
├── skills/          # Learned capabilities (auto-generated)
├── memory/          # Task execution history
└── config/          # Agent configurations
```

## Features

- **Multi-Model Support**: Claude (reasoning), GPT (code generation), Gemini (analysis)
- **Intelligent Task Routing**: Automatically assigns tasks to the best-suited agent
- **Skill Learning**: Generates skill documentation from successful task executions
- **Performance Tracking**: Monitors agent performance and improves over time
- **Collaborative Mode**: Agents can work together on complex tasks

## Usage

```typescript
import { AgentOrchestrator } from './agents/orchestrator';

const orchestrator = new AgentOrchestrator();
const result = await orchestrator.executeTask({
  type: 'code-generation',
  description: 'Create a new API endpoint',
  context: { /* relevant context */ }
});
```

## Agent Specializations

- **Claude**: Complex reasoning, architecture decisions, code reviews
- **GPT**: Code generation, refactoring, documentation
- **Gemini**: Data analysis, testing, optimization

## Skill Learning

After each task execution, the system:
1. Analyzes the task and solution
2. Extracts patterns and techniques
3. Generates/updates skill.md files
4. Improves future task routing
