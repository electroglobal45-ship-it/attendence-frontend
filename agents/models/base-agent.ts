import { AgentConfig, Task, TaskResult, AgentMemory } from '../types';

export abstract class BaseAgent {
  public config: AgentConfig;
  protected memory: AgentMemory[] = [];
  protected skillsLearned: Set<string> = new Set();

  constructor(config: AgentConfig) {
    this.config = config;
  }

  abstract execute(task: Task): Promise<TaskResult>;

  /**
   * Check if this agent can handle the given task
   */
  canHandle(task: Task): boolean {
    const taskType = task.type.toLowerCase();
    return this.config.specializations.some(spec => 
      taskType.includes(spec.toLowerCase())
    );
  }

  /**
   * Calculate confidence score for handling this task (0-1)
   */
  getConfidenceScore(task: Task): number {
    let score = 0;
    
    // Base score from specialization match
    const matches = this.config.specializations.filter(spec =>
      task.type.toLowerCase().includes(spec.toLowerCase()) ||
      task.description.toLowerCase().includes(spec.toLowerCase())
    );
    score += matches.length * 0.3;

    // Bonus for previous successful similar tasks
    const similarTasks = this.memory.filter(m => 
      m.task.type === task.type && m.success
    );
    score += Math.min(similarTasks.length * 0.1, 0.4);

    // Language compatibility bonus
    if (task.context?.language && 
        this.config.capabilities.supportedLanguages.includes(task.context.language)) {
      score += 0.2;
    }

    return Math.min(score, 1);
  }

  /**
   * Learn from task execution
   */
  async learn(task: Task, result: TaskResult): Promise<void> {
    this.memory.push({
      timestamp: new Date(),
      task,
      result,
      success: result.success,
      duration: result.duration
    });

    if (result.success) {
      await this.extractSkills(task, result);
    }

    // Keep memory size manageable
    if (this.memory.length > 100) {
      this.memory = this.memory.slice(-100);
    }
  }

  /**
   * Extract skills from successful task execution
   */
  protected abstract extractSkills(task: Task, result: TaskResult): Promise<void>;

  /**
   * Get agent statistics
   */
  getStats() {
    const totalTasks = this.memory.length;
    const successfulTasks = this.memory.filter(m => m.success).length;
    const avgDuration = this.memory.reduce((sum, m) => sum + (m.duration || 0), 0) / totalTasks || 0;

    return {
      id: this.config.id,
      model: this.config.model,
      totalTasks,
      successRate: totalTasks > 0 ? successfulTasks / totalTasks : 0,
      avgDuration,
      skillsLearned: this.skillsLearned.size,
      specializations: this.config.specializations
    };
  }

  /**
   * Get learned skills
   */
  getSkills(): string[] {
    return Array.from(this.skillsLearned);
  }
}
