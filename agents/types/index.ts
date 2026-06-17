/**
 * Core type definitions for the multi-agent system
 */

export interface Task {
  id?: string;
  type: string;
  description: string;
  priority?: 'low' | 'medium' | 'high';
  context?: TaskContext;
  dependencies?: string[];
  deadline?: Date;
}

export interface TaskContext {
  language?: string;
  framework?: string;
  files?: string[];
  existingCode?: string;
  requirements?: string[];
  constraints?: string[];
  [key: string]: any;
}

export interface TaskResult {
  success: boolean;
  data?: any;
  error?: string;
  agent: string;
  duration: number;
  confidence: number;
  artifacts?: TaskArtifact[];
  recommendations?: string[];
}

export interface TaskArtifact {
  type: 'code' | 'documentation' | 'test' | 'config';
  name: string;
  content: string;
  path?: string;
}

export interface AgentConfig {
  id: string;
  model: string;
  provider: string;
  specializations: string[];
  capabilities: AgentCapabilities;
  priority?: number;
  enabled?: boolean;
}

export interface AgentCapabilities {
  maxTokens: number;
  supportedLanguages: string[];
  tools: string[];
  [key: string]: any;
}

export interface AgentMemory {
  timestamp: Date;
  task: Task;
  result: TaskResult;
  success: boolean;
  duration: number;
}

export interface Skill {
  name: string;
  description: string;
  agent: string;
  examples: string[];
  patterns: string[];
  successRate?: number;
  usageCount?: number;
  timestamp: Date;
}

export interface AgentStats {
  id: string;
  model: string;
  totalTasks: number;
  successRate: number;
  avgDuration: number;
  skillsLearned: number;
  specializations: string[];
}
