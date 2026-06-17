import { ClaudeAgent } from '../models/claude-agent';
import { GPTAgent } from '../models/gpt-agent';
import { GeminiAgent } from '../models/gemini-agent';
import { BaseAgent } from '../models/base-agent';
import { Task, TaskResult, AgentConfig } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';

export class AgentOrchestrator {
  private agents: Map<string, BaseAgent> = new Map();
  private config: any;
  private taskHistory: any[] = [];

  constructor() {
    this.loadConfig();
  }

  private async loadConfig() {
    try {
      const configPath = path.join(__dirname, '../config/agent-config.json');
      const configData = await fs.readFile(configPath, 'utf-8');
      this.config = JSON.parse(configData);
      
      await this.initializeAgents();
    } catch (error) {
      console.error('Failed to load agent configuration:', error);
      // Use default config
      this.config = this.getDefaultConfig();
      await this.initializeAgents();
    }
  }

  private async initializeAgents() {
    // Initialize Claude
    if (this.config.agents.claude?.enabled) {
      const claudeAgent = new ClaudeAgent(this.config.agents.claude);
      this.agents.set('claude', claudeAgent);
      console.log('✅ Claude Agent initialized');
    }

    // Initialize GPT
    if (this.config.agents.gpt?.enabled) {
      const gptAgent = new GPTAgent(this.config.agents.gpt);
      this.agents.set('gpt', gptAgent);
      console.log('✅ GPT Agent initialized');
    }

    // Initialize Gemini
    if (this.config.agents.gemini?.enabled) {
      const geminiAgent = new GeminiAgent(this.config.agents.gemini);
      this.agents.set('gemini', geminiAgent);
      console.log('✅ Gemini Agent initialized');
    }
  }

  /**
   * Execute a task using the most suitable agent
   */
  async executeTask(task: Task): Promise<TaskResult> {
    console.log(`\n🎯 Orchestrating task: ${task.type}`);
    console.log(`📝 Description: ${task.description}`);

    // Select best agent for this task
    const agent = await this.selectAgent(task);
    
    if (!agent) {
      return {
        success: false,
        error: 'No suitable agent found for this task',
        agent: 'none',
        duration: 0,
        confidence: 0
      };
    }

    console.log(`🤖 Selected agent: ${agent.config.id}`);

    // Execute task
    const result = await agent.execute(task);

    // Record in history
    this.taskHistory.push({
      task,
      result,
      timestamp: new Date(),
      agent: agent.config.id
    });

    // Save history periodically
    if (this.taskHistory.length % 10 === 0) {
      await this.saveTaskHistory();
    }

    return result;
  }

  /**
   * Execute task collaboratively using multiple agents
   */
  async executeCollaborativeTask(task: Task): Promise<TaskResult> {
    console.log(`\n🤝 Collaborative execution: ${task.type}`);

    const agents = this.selectMultipleAgents(task);
    
    if (agents.length === 0) {
      return {
        success: false,
        error: 'No suitable agents found',
        agent: 'none',
        duration: 0,
        confidence: 0
      };
    }

    const results: TaskResult[] = [];
    
    // Execute in parallel or sequence based on task dependencies
    for (const agent of agents) {
      const result = await agent.execute(task);
      results.push(result);
    }

    // Combine results
    return this.combineResults(results);
  }

  /**
   * Select the best agent for a task based on specialization and past performance
   */
  private async selectAgent(task: Task): Promise<BaseAgent | null> {
    let bestAgent: BaseAgent | null = null;
    let highestScore = 0;

    for (const [name, agent] of this.agents) {
      if (!agent.canHandle(task)) continue;

      const score = agent.getConfidenceScore(task);
      console.log(`  ${name}: confidence ${(score * 100).toFixed(1)}%`);

      if (score > highestScore) {
        highestScore = score;
        bestAgent = agent;
      }
    }

    // Fallback to configured default agent
    if (!bestAgent && this.config.routing?.fallback) {
      bestAgent = this.agents.get(this.config.routing.fallback) || null;
    }

    return bestAgent;
  }

  /**
   * Select multiple agents for collaborative tasks
   */
  private selectMultipleAgents(task: Task): BaseAgent[] {
    const selectedAgents: Array<{ agent: BaseAgent; score: number }> = [];

    for (const [name, agent] of this.agents) {
      if (agent.canHandle(task)) {
        const score = agent.getConfidenceScore(task);
        selectedAgents.push({ agent, score });
      }
    }

    // Sort by confidence and return top agents
    return selectedAgents
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map(item => item.agent);
  }

  /**
   * Combine results from multiple agents
   */
  private combineResults(results: TaskResult[]): TaskResult {
    const successful = results.filter(r => r.success);
    
    if (successful.length === 0) {
      return results[0]; // Return first result if all failed
    }

    // Combine successful results
    return {
      success: true,
      data: {
        combined: true,
        results: successful.map(r => r.data),
        agents: successful.map(r => r.agent)
      },
      agent: 'collaborative',
      duration: Math.max(...results.map(r => r.duration)),
      confidence: successful.reduce((sum, r) => sum + r.confidence, 0) / successful.length
    };
  }

  /**
   * Get statistics for all agents
   */
  async getStats() {
    const stats: any = {
      agents: {},
      totalTasks: this.taskHistory.length,
      successRate: 0
    };

    for (const [name, agent] of this.agents) {
      stats.agents[name] = agent.getStats();
    }

    const successful = this.taskHistory.filter(h => h.result.success).length;
    stats.successRate = this.taskHistory.length > 0 
      ? successful / this.taskHistory.length 
      : 0;

    return stats;
  }

  /**
   * Save task history to file
   */
  private async saveTaskHistory() {
    try {
      const historyPath = path.join(__dirname, '../memory/task-history.json');
      await fs.mkdir(path.dirname(historyPath), { recursive: true });
      await fs.writeFile(
        historyPath, 
        JSON.stringify(this.taskHistory, null, 2)
      );
    } catch (error) {
      console.error('Failed to save task history:', error);
    }
  }

  private getDefaultConfig() {
    return {
      agents: {
        claude: {
          id: 'claude-agent',
          model: 'claude-3-5-sonnet',
          specializations: ['reasoning', 'architecture'],
          enabled: true
        },
        gpt: {
          id: 'gpt-agent',
          model: 'gpt-4',
          specializations: ['code-generation'],
          enabled: true
        },
        gemini: {
          id: 'gemini-agent',
          model: 'gemini-pro',
          specializations: ['analysis'],
          enabled: true
        }
      },
      routing: {
        strategy: 'capability-based',
        fallback: 'claude',
        collaborative: true
      }
    };
  }
}
