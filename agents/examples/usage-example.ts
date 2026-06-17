/**
 * Examples of how to use the multi-agent system in your project
 */

import { AgentOrchestrator } from '../orchestrator';
import { taskTracker } from '../integration/task-tracker';
import { Task } from '../types';

// Example 1: Direct agent execution
async function example1_DirectExecution() {
  const orchestrator = new AgentOrchestrator();

  const task: Task = {
    type: 'code-generation',
    description: 'Create a new API endpoint for user attendance',
    context: {
      language: 'typescript',
      framework: 'express',
      requirements: [
        'RESTful endpoint',
        'Input validation',
        'Error handling',
        'Documentation'
      ]
    }
  };

  const result = await orchestrator.executeTask(task);
  console.log('Result:', result);
}

// Example 2: Track existing function execution
async function example2_TrackExistingFunction() {
  // Wrap your existing function
  const result = await taskTracker.trackTask(
    'data-processing',
    'Process monthly attendance report',
    async () => {
      // Your existing code here
      const data = await processAttendanceData();
      return data;
    }
  );

  return result;
}

// Example 3: Collaborative task execution
async function example3_CollaborativeExecution() {
  const orchestrator = new AgentOrchestrator();

  const complexTask: Task = {
    type: 'feature-development',
    description: 'Build a complete attendance dashboard with real-time updates',
    context: {
      language: 'typescript',
      framework: 'react',
      requirements: [
        'Real-time data updates',
        'Interactive charts',
        'Export functionality',
        'Mobile responsive'
      ]
    }
  };

  // Multiple agents will collaborate on this
  const result = await orchestrator.executeCollaborativeTask(complexTask);
  console.log('Collaborative result:', result);
}

// Example 4: Manual task logging
async function example4_ManualLogging() {
  await taskTracker.logTaskExecution(
    'bug-fix',
    'Fixed memory leak in attendance calculation',
    true,
    {
      files: ['src/services/attendance.service.ts'],
      linesChanged: 15,
      impact: 'high'
    }
  );
}

// Example 5: Integration with existing codebase
class AttendanceService {
  async generateReport(employeeId: string) {
    return await taskTracker.trackTask(
      'report-generation',
      `Generate attendance report for employee ${employeeId}`,
      async () => {
        // Your existing report generation logic
        const report = await this.buildReport(employeeId);
        return report;
      }
    );
  }

  private async buildReport(employeeId: string) {
    // Existing implementation
    return {};
  }
}

// Example 6: Get learning statistics
async function example6_GetStatistics() {
  const stats = await taskTracker.getStats();
  
  console.log('\n📊 Agent Learning Statistics:');
  console.log(`Total tasks executed: ${stats.totalTasks}`);
  console.log(`Overall success rate: ${(stats.successRate * 100).toFixed(1)}%`);
  
  for (const [agentName, agentStats] of Object.entries(stats.agents)) {
    console.log(`\n${agentName}:`);
    console.log(`  - Tasks: ${(agentStats as any).totalTasks}`);
    console.log(`  - Success: ${((agentStats as any).successRate * 100).toFixed(1)}%`);
    console.log(`  - Skills: ${(agentStats as any).skillsLearned}`);
  }
}

// Helper function (mock)
async function processAttendanceData() {
  return { processed: true };
}

// Run examples
if (require.main === module) {
  (async () => {
    console.log('🚀 Running multi-agent system examples...\n');
    
    // await example1_DirectExecution();
    // await example2_TrackExistingFunction();
    await example6_GetStatistics();
  })();
}
