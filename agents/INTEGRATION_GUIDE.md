# Multi-Agent System Integration Guide

## Quick Start

### 1. Install Dependencies

```bash
cd agents
npm install
npm run build
```

### 2. Basic Usage in Your Code

```typescript
import { taskTracker } from './agents/integration/task-tracker';

// Wrap any async function to enable learning
async function processData() {
  return await taskTracker.trackTask(
    'data-processing',
    'Process user attendance data',
    async () => {
      // Your existing code
      return result;
    }
  );
}
```

### 3. CLI Usage

```bash
# Execute a task
npm run execute code-generation "Create a new API endpoint"

# View statistics
npm run stats

# List learned skills
npm run skills
```

## Integration Methods

### Method 1: Automatic Tracking (Recommended)

Wrap your existing functions with the task tracker:

```typescript
import { taskTracker } from './agents/integration/task-tracker';

class YourService {
  async yourMethod() {
    return await taskTracker.trackTask(
      'task-type',
      'Description of what this does',
      async () => {
        // Your existing implementation
        return result;
      }
    );
  }
}
```

### Method 2: Direct Agent Execution

For new features, directly invoke agents:

```typescript
import { AgentOrchestrator } from './agents/orchestrator';

const orchestrator = new AgentOrchestrator();
const result = await orchestrator.executeTask({
  type: 'code-generation',
  description: 'Create attendance report endpoint',
  context: {
    language: 'typescript',
    framework: 'express'
  }
});
```

### Method 3: Manual Logging

Log completed tasks for learning:

```typescript
import { taskTracker } from './agents/integration/task-tracker';

await taskTracker.logTaskExecution(
  'bug-fix',
  'Fixed memory leak in calculation',
  true,
  { impact: 'high', files: ['service.ts'] }
);
```

## Configuration

Edit `agents/config/agent-config.json` to:
- Enable/disable specific agents
- Adjust agent priorities
- Configure skill learning parameters
- Set memory retention policies

## Monitoring

### View Statistics

```typescript
const stats = await taskTracker.getStats();
console.log(stats);
```

### Access Learned Skills

Skills are automatically saved to `agents/skills/` in Markdown format.

### Task History

Full execution history is stored in `agents/memory/task-history.json`.

## Best Practices

1. **Be Specific**: Provide detailed task descriptions
2. **Add Context**: Include relevant metadata (language, framework, etc.)
3. **Review Skills**: Periodically review generated skills
4. **Monitor Performance**: Check agent statistics regularly
5. **Iterate**: Adjust configurations based on results

## Troubleshooting

### Agents Not Learning
- Check that `skillLearning.enabled` is `true` in config
- Verify tasks are completing successfully
- Ensure write permissions to `agents/skills/` directory

### Poor Task Routing
- Review agent specializations in config
- Check confidence scores in task results
- Consider adding more specific task types

### Memory Issues
- Adjust `memory.maxHistorySize` in config
- Enable periodic cleanup in production
- Consider external storage for long-term history

## Examples

See `agents/examples/usage-example.ts` for complete examples of:
- Direct execution
- Function wrapping
- Collaborative tasks
- Statistical analysis

## Architecture

```
agents/
├── models/              # Agent implementations
│   ├── base-agent.ts
│   ├── claude-agent.ts
│   ├── gpt-agent.ts
│   └── gemini-agent.ts
├── orchestrator/        # Task routing
├── integration/         # Project integration
├── utils/              # Utilities
├── config/             # Configuration
├── skills/             # Learned skills (auto-generated)
├── memory/             # Execution history
└── examples/           # Usage examples
```

## Next Steps

1. Run the examples to see the system in action
2. Integrate tracking into your key services
3. Review generated skills after a few executions
4. Adjust agent configurations based on your needs
5. Expand agent capabilities as patterns emerge
