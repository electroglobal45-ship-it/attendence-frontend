# 🚀 Quick Start Guide

Get your multi-agent system up and running in 5 minutes!

## Step 1: Setup (2 minutes)

```bash
# Navigate to agents directory
cd agents

# Install dependencies and build
npm install
npm run build
```

## Step 2: Test It Works (1 minute)

```bash
# Run a simple task
npm run execute code-generation "Create a TypeScript interface for User"

# Check statistics
npm run stats
```

## Step 3: Integrate Into Your Code (2 minutes)

Add to any file in your project:

```typescript
import { taskTracker } from './agents/integration/task-tracker';

// Wrap your existing function
async function yourFunction() {
  return await taskTracker.trackTask(
    'task-type',           // What kind of task
    'Task description',    // What it does
    async () => {
      // Your existing code here
      return result;
    }
  );
}
```

## That's It! 🎉

The system will now:
- ✅ Track all task executions
- ✅ Route tasks to the best agent
- ✅ Learn from each execution
- ✅ Generate skill documentation automatically
- ✅ Improve routing over time

## Common Task Types

Use these task types for optimal routing:

| Task Type | Best Agent | Example |
|-----------|------------|---------|
| `code-generation` | GPT | Creating new functions, components |
| `architecture-design` | Claude | Designing system architecture |
| `data-analysis` | Gemini | Analyzing patterns, metrics |
| `debugging` | Claude | Finding and fixing bugs |
| `refactoring` | GPT | Improving existing code |
| `testing` | Gemini | Generating test cases |
| `optimization` | Gemini | Performance improvements |
| `code-review` | Claude | Reviewing code quality |

## View Your Progress

```bash
# See learned skills
dir agents\skills

# View execution history
type agents\memory\task-history.json

# Check agent statistics
npm run stats
```

## Next Steps

1. Read `AGENTS_DOCUMENTATION.md` for detailed features
2. Try examples in `agents/examples/`
3. Review generated skills in `agents/skills/`
4. Adjust config in `agents/config/agent-config.json`

## Need Help?

- 📖 Full docs: `AGENTS_DOCUMENTATION.md`
- 🔧 Integration guide: `agents/INTEGRATION_GUIDE.md`
- 💡 Examples: `agents/examples/`
- ⚙️ Configuration: `agents/config/agent-config.json`

**Happy coding with AI agents! 🤖**
