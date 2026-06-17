import * as fs from 'fs/promises';
import * as path from 'path';
import { Task, TaskResult } from '../types';

export class SkillGenerator {
  private agentName: string;
  private skillsDir: string;

  constructor(agentName: string) {
    this.agentName = agentName;
    this.skillsDir = path.join(__dirname, '../skills');
  }

  async generateSkillFile(skill: any, task: Task, result: TaskResult): Promise<void> {
    try {
      // Ensure skills directory exists
      await fs.mkdir(this.skillsDir, { recursive: true });

      // Create skill filename
      const timestamp = new Date().toISOString().split('T')[0];
      const sanitizedName = skill.name.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
      const filename = `${this.agentName}-${sanitizedName}-${timestamp}.md`;
      const filepath = path.join(this.skillsDir, filename);

      // Generate markdown content
      const content = this.generateMarkdownContent(skill, task, result);

      // Write file
      await fs.writeFile(filepath, content, 'utf-8');
      console.log(`📚 Generated skill file: ${filename}`);

      // Update skill index
      await this.updateSkillIndex(skill, filename);
    } catch (error) {
      console.error('Failed to generate skill file:', error);
    }
  }

  private generateMarkdownContent(skill: any, task: Task, result: TaskResult): string {
    const lines: string[] = [];

    // Header
    lines.push(`# ${skill.name}`);
    lines.push('');
    lines.push(`**Agent:** ${this.agentName.toUpperCase()}`);
    lines.push(`**Generated:** ${skill.timestamp.toISOString()}`);
    lines.push(`**Success Rate:** ${(result.confidence * 100).toFixed(1)}%`);
    lines.push('');

    // Description
    lines.push('## Description');
    lines.push('');
    lines.push(skill.description);
    lines.push('');

    // Original Task
    lines.push('## Original Task');
    lines.push('');
    lines.push(`**Type:** ${task.type}`);
    lines.push(`**Description:** ${task.description}`);
    lines.push('');

    // Patterns Identified
    if (skill.patterns && skill.patterns.length > 0) {
      lines.push('## Patterns Identified');
      lines.push('');
      skill.patterns.forEach((pattern: string) => {
        lines.push(`- ${pattern}`);
      });
      lines.push('');
    }

    // Examples
    if (skill.examples && skill.examples.length > 0) {
      lines.push('## Examples');
      lines.push('');
      skill.examples.forEach((example: string, index: number) => {
        lines.push(`### Example ${index + 1}`);
        lines.push('');
        lines.push(example);
        lines.push('');
      });
    }

    // Metrics
    if (skill.metrics) {
      lines.push('## Performance Metrics');
      lines.push('');
      lines.push('```json');
      lines.push(JSON.stringify(skill.metrics, null, 2));
      lines.push('```');
      lines.push('');
    }

    // Code Templates
    if (skill.codeTemplates && skill.codeTemplates.length > 0) {
      lines.push('## Code Templates');
      lines.push('');
      skill.codeTemplates.forEach((template: any, index: number) => {
        lines.push(`### Template ${index + 1}`);
        lines.push('');
        lines.push('```typescript');
        lines.push(template.code || '// Template code here');
        lines.push('```');
        lines.push('');
      });
    }

    // Recommendations
    lines.push('## When to Use');
    lines.push('');
    lines.push(`This skill is best applied when:`);
    lines.push(`- Working on ${task.type} tasks`);
    lines.push(`- Dealing with similar patterns: ${skill.patterns.join(', ')}`);
    lines.push('');

    // Future Improvements
    lines.push('## Future Improvements');
    lines.push('');
    lines.push('- [ ] Enhance pattern recognition');
    lines.push('- [ ] Add more examples');
    lines.push('- [ ] Optimize performance');
    lines.push('');

    return lines.join('\n');
  }

  private async updateSkillIndex(skill: any, filename: string): Promise<void> {
    const indexPath = path.join(this.skillsDir, 'README.md');
    
    try {
      let content = '';
      
      try {
        content = await fs.readFile(indexPath, 'utf-8');
      } catch {
        // File doesn't exist, create header
        content = '# Agent Skills Index\n\n';
        content += 'This directory contains auto-generated skill documentation from agent task executions.\n\n';
        content += '## Skills by Agent\n\n';
      }

      // Add entry
      const entry = `- [${skill.name}](./${filename}) - ${skill.description}\n`;
      content += entry;

      await fs.writeFile(indexPath, content, 'utf-8');
    } catch (error) {
      console.error('Failed to update skill index:', error);
    }
  }
}
