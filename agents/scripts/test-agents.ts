/**
 * Test script to verify agent system is working
 */

import { AgentOrchestrator } from '../orchestrator';
import { Task } from '../types';

async function runTests() {
  console.log('🧪 Testing Multi-Agent System\n');

  const orchestrator = new AgentOrchestrator();

  // Test 1: Code Generation (GPT)
  console.log('Test 1: Code Generation Task');
  const codeGenTask: Task = {
    type: 'code-generation',
    description: 'Generate a TypeScript interface for user attendance data'
  };
  
  const result1 = await orchestrator.executeTask(codeGenTask);
  console.log(`✓ Success: ${result1.success}`);
  console.log(`  Agent: ${result1.agent}`);
  console.log(`  Confidence: ${(result1.confidence * 100).toFixed(1)}%`);
  console.log(`  Duration: ${result1.duration}ms\n`);

  // Test 2: Data Analysis (Gemini)
  console.log('Test 2: Data Analysis Task');
  const analysisTask: Task = {
    type: 'data-analysis',
    description: 'Analyze attendance patterns for the last month'
  };
  
  const result2 = await orchestrator.executeTask(analysisTask);
  console.log(`✓ Success: ${result2.success}`);
  console.log(`  Agent: ${result2.agent}`);
  console.log(`  Confidence: ${(result2.confidence * 100).toFixed(1)}%`);
  console.log(`  Duration: ${result2.duration}ms\n`);

  // Test 3: Architecture Design (Claude)
  console.log('Test 3: Architecture Design Task');
  const designTask: Task = {
    type: 'architecture-design',
    description: 'Design a scalable attendance tracking system'
  };
  
  const result3 = await orchestrator.executeTask(designTask);
  console.log(`✓ Success: ${result3.success}`);
  console.log(`  Agent: ${result3.agent}`);
  console.log(`  Confidence: ${(result3.confidence * 100).toFixed(1)}%`);
  console.log(`  Duration: ${result3.duration}ms\n`);

  // Show overall statistics
  console.log('📊 Overall Statistics:');
  const stats = await orchestrator.getStats();
  console.log(JSON.stringify(stats, null, 2));

  console.log('\n✅ All tests completed!');
}

runTests().catch(console.error);
