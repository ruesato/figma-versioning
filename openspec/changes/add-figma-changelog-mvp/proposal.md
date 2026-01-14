# Change: Add Figma Design Changelog MVP

## Why

Design iteration history in Figma is fragmented: version history lacks context, comments and annotations aren't tied to design states, and stakeholders must interrupt designers to understand what changed. Designers need a Git-style workflow for creating meaningful version checkpoints, and stakeholders need a self-service way to track design evolution.

## What Changes

### MVP Capabilities

- **Commit Management:** Create commits with messages, version numbers (semantic or date-based), automatic comment/annotation capture, and activity metrics
- **Changelog Rendering:** Dedicated Figma page with programmatically generated frames showing commit history
- **Activity Histogram:** Visual representation of change volume over time with clickable navigation
- **PAT Authentication:** Secure onboarding flow for Figma REST API access (comments, version history)

### Post-MVP Capabilities

- **LLM Integration:** Optional AI-powered weekly/monthly summaries and natural language querying
- **MCP Server:** External read-only access to changelog data for AI agents and workflows

## Impact

- **New specs:** commit-management, changelog-rendering, activity-histogram, pat-authentication, llm-integration, mcp-server
- **New code:**
  - `packages/core/` - Shared types, schemas, prompt templates
  - `packages/figma-plugin/` - Figma plugin with Preact UI
  - `packages/mcp-server/` - Node.js MCP server (post-MVP)
- **Dependencies:** create-figma-plugin, Preact, Nano Stores, TailwindCSS
- **External integrations:** Figma Plugin API, Figma REST API, Claude-compatible LLM endpoints

## Scope Boundaries

### In Scope (MVP)

- Commit creation with message and auto-versioning
- Comment and annotation capture via REST API / Plugin API
- Node count metrics (frames, components, instances, text)
- Changelog page rendering as Figma frames
- Activity histogram on changelog page and in plugin UI
- PAT-based authentication for REST API features
- Basic onboarding flow

### Out of Scope (Future)

- **BREAKING** Auto-change detection (tracking specific node additions/deletions)
- Commit reminders or scheduled prompts
- Export to markdown/HTML
- Slack/Teams notifications
- Branch-specific changelogs
- Customizable changelog templates
- Visual diff between versions
- Write access via MCP server

## Key Constraints

| Constraint | Mitigation |
|------------|------------|
| Figma 2GB memory limit | Minimal bundle (Preact ~4KB, Nano Stores ~1KB); clean up node references after traversal |
| Node traversal performance | Use `findAllWithCriteria`, `skipInvisibleInstanceChildren = true` |
| Plugin data 100KB/entry limit | Chunk commits across keys; archive/compress old commits |
| REST API rate limits | Cache timestamps; batch requests; graceful degradation |
| 30-day version history (Starter) | Store commits in plugin data independent of Figma versions |
| MCP read-only (v1) | REST API cannot write pluginData; commits require plugin |
