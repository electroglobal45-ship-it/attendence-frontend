import { AgentOrchestrator } from '../orchestrator';
import { Task } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Integrates the agent system with your project's task execution
 * Automatically captures tasks and improves agent capabilities
 */
export class TaskTracker {
  private orchestrator: AgentOrchestrator;
  private trackingEnabled: boolean = true;

  constructor() {
    this.orchestrator = new AgentOrchestrator();
  }

  /**
   * Wrap any async function to track its execution
   */
  trackTask<T>(
    taskType: string,
    taskDescription: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return this.executeWithTracking(taskType, taskDescription, fn);
  }

  private async executeWithTracking<T>(
    taskType: string,
    taskDescription: string,
    fn: () => Promise<T>
  ): Promise<T> {
    if (!this.trackingEnabled) {
      return fn();
    }

    const task: Task = {
      id: this.generateTaskId(),
      type: taskType,
      description: taskDescription,
      context: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      }
    };

    console.log(`\n📝 Tracking task: ${taskType}`);

    try {
      // Execute the actual function
      const result = await fn();

      // Have the agent learn from this execution
      await this.orchestrator.executeTask({
        ...task,
        type: `${taskType}-learning`,
        description: `Learn from successful ${taskType}: ${taskDescription}`
      });

      return result;
    } catch (error: any) {
      // Learn from failures too
      await this.orchestrator.executeTask({
        ...task,
        type: `${taskType}-failure-analysis`,
        description: `Analyze failure in ${taskType}: ${error.message}`
      });

      throw error;
    }
  }

  /**
   * Manually log a task execution for learning
   */
  async logTaskExecution(
    taskType: string,
    description: string,
    success: boolean,
    metadata?: any
  ): Promise<void> {
    const task: Task = {
      id: this.generateTaskId(),
      type: taskType,
      description,
      context: {
        ...metadata,
        success,
        timestamp: new Date().toISOString()
      }
    };

    await this.orchestrator.executeTask(task);
  }

  /**
   * Get aggregated learning statistics
   */
  async getStats() {
    return await this.orchestrator.getStats();
  }

  /**
   * Enable or disable tracking
   */
  setTrackingEnabled(enabled: boolean) {
    this.trackingEnabled = enabled;
  }

  private generateTaskId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const taskTracker = new TaskTracker();
