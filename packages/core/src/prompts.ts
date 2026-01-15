/**
 * LLM prompt templates for changelog summaries and queries
 */

import type { Commit } from './types';

/**
 * Format a commit as markdown for inclusion in prompts
 */
function formatCommitForPrompt(commit: Commit): string {
  const lines: string[] = [];

  lines.push(`## ${commit.version} - ${commit.message}`);
  lines.push(`**Date:** ${new Date(commit.timestamp).toISOString().split('T')[0]}`);
  lines.push(`**Author:** ${commit.author.name}`);

  if (commit.comments.length > 0) {
    lines.push('');
    lines.push('**Comments:**');
    commit.comments.forEach(comment => {
      lines.push(`- ${comment.author.name}: ${comment.text}`);
    });
  }

  if (commit.annotations.length > 0) {
    lines.push('');
    lines.push('**Annotations:**');
    commit.annotations.forEach(annotation => {
      lines.push(`- ${annotation.label}`);
    });
  }

  if (commit.metrics) {
    lines.push('');
    lines.push('**Activity:**');
    if (commit.metrics.nodesDelta !== undefined) {
      lines.push(`- Nodes: ${commit.metrics.nodesDelta > 0 ? '+' : ''}${commit.metrics.nodesDelta}`);
    }
    if (commit.metrics.feedbackCount > 0) {
      lines.push(`- Feedback items: ${commit.metrics.feedbackCount}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format multiple commits as markdown
 */
function formatCommitsForPrompt(commits: Commit[]): string {
  if (commits.length === 0) {
    return 'No commits in this period.';
  }

  return commits.map(formatCommitForPrompt).join('\n\n---\n\n');
}

/**
 * Generate a summary prompt for a time period (weekly or monthly)
 */
export function generateSummaryPrompt(
  commits: Commit[],
  period: 'weekly' | 'monthly'
): string {
  const periodLabel = period === 'weekly' ? 'week' : 'month';
  const commitsContext = formatCommitsForPrompt(commits);

  return `You are a design changelog summarization assistant. Your task is to create a concise, informative summary of design changes over the past ${periodLabel}.

# Changelog Data

${commitsContext}

# Instructions

Create a ${period} summary that:
1. Highlights the most significant design changes
2. Groups related changes together (e.g., all changes to a specific component or flow)
3. Notes any trends or patterns in the activity
4. Mentions key contributors
5. Uses clear, non-technical language suitable for stakeholders

Format the summary as markdown with appropriate headings and bullet points. Keep it concise but informative - aim for 3-5 paragraphs or bullet-point sections.

Do not include speculative information or recommendations unless explicitly supported by the commit data.`;
}

/**
 * Generate a query prompt for natural language Q&A
 */
export function generateQueryPrompt(
  commits: Commit[],
  query: string
): string {
  const commitsContext = formatCommitsForPrompt(commits);

  return `You are a design changelog query assistant. Your task is to answer questions about design changes based on the commit history.

# User Question

${query}

# Relevant Changelog Data

${commitsContext}

# Instructions

Answer the user's question based on the commit data provided above. Your response should:
1. Directly address the question asked
2. Reference specific commits, versions, or dates when relevant
3. Quote or paraphrase commit messages, comments, and annotations as evidence
4. Be concise and factual
5. Acknowledge if the commit data doesn't contain enough information to fully answer the question

If no relevant commits are provided, state that no matching changes were found.

Do not make assumptions or provide information not supported by the commit data.`;
}

/**
 * Options for customizing prompt generation
 */
export interface PromptOptions {
  /** Whether to include activity metrics in commit formatting */
  includeMetrics?: boolean;
  /** Whether to include comments in commit formatting */
  includeComments?: boolean;
  /** Whether to include annotations in commit formatting */
  includeAnnotations?: boolean;
  /** Maximum number of commits to include */
  maxCommits?: number;
}

/**
 * Generate a summary prompt with custom options
 */
export function generateCustomSummaryPrompt(
  commits: Commit[],
  period: 'weekly' | 'monthly',
  options: PromptOptions = {}
): string {
  const { maxCommits } = options;

  let filteredCommits = commits;
  if (maxCommits !== undefined && maxCommits > 0) {
    filteredCommits = commits.slice(0, maxCommits);
  }

  // Note: includeMetrics, includeComments, includeAnnotations options
  // are reserved for future enhancement
  return generateSummaryPrompt(filteredCommits, period);
}

/**
 * Generate a query prompt with custom options
 */
export function generateCustomQueryPrompt(
  commits: Commit[],
  query: string,
  options: PromptOptions = {}
): string {
  const { maxCommits } = options;

  let filteredCommits = commits;
  if (maxCommits !== undefined && maxCommits > 0) {
    filteredCommits = commits.slice(0, maxCommits);
  }

  return generateQueryPrompt(filteredCommits, query);
}
