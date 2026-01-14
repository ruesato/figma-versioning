# Project Context

## Purpose

Figma Design Changelog is a Figma plugin that brings Git-style version control semantics to design workflows. The project enables:

- **Designers** to create "commits" that capture the current state of their work with descriptive messages
- **Automatic capture** of comments and annotations since the last commit
- **Visual changelog** rendered as Figma elements on a dedicated page
- **Activity histogram** showing change volume over time
- **LLM-powered features** (optional) for summaries and natural language querying
- **MCP server** (post-MVP) for external LLM access to changelog data

The primary goal is to reduce stakeholder time-to-understanding for design changes without constant check-ins.

## Tech Stack

### Figma Plugin (Primary)
- **TypeScript** - Primary language
- **Figma Plugin API** - For in-Figma operations (create frames, read annotations, save versions)
- **Figma REST API** - For comments, version history (requires PAT)
- **create-figma-plugin** - Build tooling and plugin scaffold
- **Preact** - UI framework (~4KB bundle) with `@create-figma-plugin/ui` components
- **Nano Stores** - Lightweight state management (~1KB), works well with Preact
- **TailwindCSS** - Styling (via create-figma-plugin template)

#### UI Framework Rationale

Preact was chosen over alternatives after evaluating memory and bundle size constraints:

| Framework | Bundle Size | Verdict |
|-----------|-------------|---------|
| Preact | ~4KB | Chosen — lightweight, React-like DX, pre-built Figma-styled components |
| Vanilla JS | 0KB | Rejected — no component library, high maintenance burden for complex UI |
| Svelte | Near-zero | Rejected — no Figma component library, would need to build from scratch |
| React | ~80KB | Rejected — too heavy for embedded plugin context |

The `@create-figma-plugin/ui` library provides production-grade components matching Figma's UI design with automatic Light/Dark/FigJam theme support, saving significant development time.

### MCP Server (Post-MVP)
- **Node.js** - Runtime
- **TypeScript** - Primary language
- **MCP SDK** - Model Context Protocol implementation
- **Figma REST API** - For reading plugin data from files

### Shared (Monorepo)
- **pnpm** - Package manager

> **Note on animations:** Avoid heavy animation libraries in the plugin UI. CSS transitions are preferred over JavaScript-based animation libraries to minimize memory overhead. The `@create-figma-plugin/ui` components include appropriate micro-interactions.

## Project Conventions

### Code Style
- ES modules (import/export) syntax, not CommonJS (require)
- Destructure imports when possible (e.g., `import { foo } from 'bar'`)
- Do not hard code colors — use design tokens from `@create-figma-plugin/ui` CSS variables (they auto-adapt to Figma's Light/Dark/FigJam themes)
- No emojis in code or documentation unless explicitly requested

### Architecture Patterns

**Monorepo Structure:**
```
figma-design-changelog/
├── packages/
│   ├── core/              # Shared types, schemas, prompt templates
│   │   ├── types.ts       # Commit, CommitMetrics, etc.
│   │   ├── prompts.ts     # LLM prompt templates
│   │   └── search.ts      # Keyword search logic
│   ├── figma-plugin/      # Figma plugin (primary product)
│   └── mcp-server/        # MCP server (optional add-on)
```

**Data Storage:**
- Commit data stored in Figma file via `setPluginData()` / `getPluginData()`
- PAT stored securely via `figma.clientStorage`
- Configuration stored as JSON

### Testing Strategy
- Testing approach not yet determined
- Prefer running single tests over full test suite for performance
- Run `pnpm test` for unit and integration tests

### Git Workflow
- **Commit messages:** Semantic release format (e.g., `feat:`, `fix:`, `chore:`)
- **Commit message format:** GitHub markdown with bullet summary of changes
- **Issue references:** Append `Closes SLU-xxx` for Linear issue IDs when applicable
- **Branch strategy:** Feature branches merged to main

## Domain Context

### Figma Concepts
- **Version History:** Figma's native timestamped snapshots (accessed via REST API)
- **Comments:** Threaded discussion bubbles pinned to canvas or specific nodes
- **Annotations:** Dev Mode notes pinned to specific design elements (accessed via Plugin API `node.annotations`)
- **PAT (Personal Access Token):** Figma credential for REST API access

### Plugin Concepts
- **Commit:** A snapshot of design state with descriptive message, analogous to Git commit
- **Changelog:** Chronological list of commits rendered on a dedicated Figma page
- **Semantic Versioning:** Major.Minor.Patch format (e.g., v1.2.3)
- **Date-based Versioning:** YYYY-MM-DD format with optional sequence suffix

### Activity Metrics Captured
| Metric | Source |
|--------|--------|
| Comments count | REST API (filtered by timestamp) |
| Annotations count | Plugin API (`node.annotations`) |
| Frame count | Plugin API (`findAll`) |
| Component count | Plugin API (`findAll`) |
| Instance count | Plugin API (`findAll`) |
| Text node count | Plugin API (`findAll`) |

## Important Constraints

### Figma Memory Limits

Figma operates within browser constraints with a **2GB memory limit per tab** (applies to desktop app too, since it's browser-based).

| Memory Usage | Alert | Impact |
|--------------|-------|--------|
| 60% | Yellow warning | Performance issues, multiplayer lag |
| 75% | Red warning (non-dismissible) | Risk of data loss, immediate action needed |
| 100% | File locked | Cannot edit until memory reduced |

**Our plugin must not contribute to memory pressure.** Key mitigations:
- Keep UI bundle minimal (Preact + Nano Stores ≈ 5KB)
- Avoid storing large data structures in memory
- Clean up references after node traversal
- Never load all pages unless explicitly requested by user

### Node Traversal Performance

Our plugin uses `findAll` for metrics collection, which is **slow on large documents** (tens of thousands of nodes). Critical optimizations:

| Technique | Benefit |
|-----------|---------|
| `figma.skipInvisibleInstanceChildren = true` | Up to several times faster — skips invisible nested layers |
| `findAllWithCriteria({ types: [...] })` | Hundreds of times faster than callback-based `findAll` |
| Traverse current page only | Avoid `figma.loadAllPagesAsync()` unless necessary |
| `node.children.filter()` | Much faster for immediate children only |

**Hidden layers are the biggest performance killer.** Figma doesn't instantiate invisible nested layers, causing exponential slowdowns during traversal.

**Recommended approach for metrics collection:**
```typescript
// Enable at plugin start
figma.skipInvisibleInstanceChildren = true;

// Use type-specific search instead of generic findAll
const frames = figma.currentPage.findAllWithCriteria({ types: ['FRAME'] });
const components = figma.currentPage.findAllWithCriteria({ types: ['COMPONENT'] });
```

### Figma API Rate Limits
- REST API requests must be batched and cached where possible
- Implement graceful degradation when rate limited
- Cache comment timestamps to reduce redundant fetches

### Plugin Data Storage Limits

| Storage Type | Limit | Notes |
|--------------|-------|-------|
| `figma.clientStorage` (total) | **5MB** | Up from 1MB (March 2025) |
| `setSharedPluginData` (per entry) | **100KB** | New limit as of March 2025 |
| `setPluginData` (per node) | ~1MB | Practical limit before performance degrades |

**Implications for changelog storage:**
- Large changelogs (hundreds of commits with comments/annotations) could hit limits
- Plan for archival strategy: compress old commits, store summaries only
- Consider chunking: split commits across multiple plugin data keys
- Monitor storage usage and warn users before hitting limits

### PAT Security Requirements
- Tokens stored via `figma.clientStorage` (secure, sandboxed)
- Never expose tokens in plugin data or logs
- Required scopes: `file_comments:read`, `files:read`
- Clear guidance for users on token generation and scope

### Read-Only MCP Server
- REST API cannot write `pluginData` — MCP server is read-only in v1
- REST API cannot call `saveVersionHistoryAsync` — commits must be created via plugin
- Write access deferred to future versions pending Figma API changes or cloud sync layer

### Starter Team Version Limits
- Figma Starter plans have 30-day version history limit
- Plugin stores commit data independently to preserve changelog beyond this limit

## External Dependencies

### Figma APIs
| API | Purpose | Auth |
|-----|---------|------|
| Plugin API | In-Figma operations, annotations, node traversal | None (runs in Figma) |
| REST API | Comments, version history, file metadata | PAT |

### LLM Integration (Optional)
- Claude API-compatible endpoints for summaries and queries
- Supports: Anthropic Claude API, local LLMs (Ollama, LM Studio), corporate proxy endpoints
- User configures endpoint URL and API key in settings

### MCP Protocol
- Model Context Protocol for external LLM access
- Distributed as npm package: `@designchangelog/mcp-server`
- Configured via JSON config file or environment variables
