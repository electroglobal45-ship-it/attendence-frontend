# Agent Memory

This directory stores the execution history and learning data for all agents.

## Files

- **task-history.json**: Complete history of all task executions
- **performance-metrics.json**: Aggregated performance statistics
- **learning-patterns.json**: Identified patterns across all tasks

## Data Retention

- Task history is kept for 90 days by default
- Configure retention in `config/agent-config.json`
- Old entries are automatically archived

## Privacy

- Sensitive data should never be stored in task history
- Review the data retention policy for your organization
- Consider encrypting memory files in production

---

*Memory files are auto-generated and updated by the agent system*
