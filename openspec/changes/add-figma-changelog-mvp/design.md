# Design: Figma Design Changelog MVP

## Context

This is a greenfield Figma plugin with an optional MCP server. The plugin runs in Figma's sandboxed iframe environment with strict memory constraints (2GB per tab). The target users are designers who want Git-style versioning and stakeholders who want self-service access to design change history.

**Stakeholders:**
- Product designers (primary users)
- Design system maintainers
- Product managers, engineers, QA (changelog consumers)

**Constraints:**
- Figma plugin memory limits (2GB shared with file)
- Bundle size sensitivity (affects load time and memory)
- REST API requires PAT authentication
- Plugin data storage limits (100KB per entry, 5MB total clientStorage)

## Goals / Non-Goals

### Goals

1. Create a minimal, performant Figma plugin using Preact and Nano Stores
2. Enable meaningful commit creation with automatic context capture
3. Render a visual changelog directly in Figma as design elements
4. Provide activity histogram for understanding project velocity
5. Support optional LLM features without requiring them
6. Enable external LLM access via MCP server (post-MVP)

### Non-Goals

1. Real-time change detection (too complex for MVP)
2. Cross-file changelog aggregation
3. Write access from MCP server
4. Custom changelog frame templates
5. Integration with external tools (Slack, Linear, etc.)

## Decisions

### D1: Monorepo Structure

**Decision:** Use pnpm workspaces with three packages: `core`, `figma-plugin`, `mcp-server`.

**Rationale:**
- Shared types prevent drift between plugin and MCP server
- Shared prompt templates ensure consistent LLM behavior
- Independent versioning allows plugin-only releases

**Alternatives considered:**
- Single package: Rejected - MCP server has different runtime (Node.js vs iframe)
- Separate repos: Rejected - Type/prompt synchronization too error-prone

### D2: UI Framework (Preact)

**Decision:** Use Preact with `@create-figma-plugin/ui` components.

**Rationale:**
- ~4KB bundle vs ~80KB for React
- Pre-built Figma-styled components with theme support
- React-like DX for familiarity

**Alternatives considered:**
- Vanilla JS: Rejected - No component library, high maintenance burden
- Svelte: Rejected - No Figma component library available
- React: Rejected - Too heavy for embedded plugin context

### D3: State Management (Nano Stores)

**Decision:** Use Nano Stores for state management.

**Rationale:**
- ~1KB bundle size
- Works well with Preact
- Simple atom-based model sufficient for plugin complexity

**Alternatives considered:**
- Preact Signals: Viable but less ecosystem support
- Zustand: ~2.5KB, more features than needed
- Redux: Overkill for plugin scope

### D4: Plugin Data Storage Strategy

**Decision:** Store commits as chunked JSON in plugin data with LRU archival.

**Structure:**
```
pluginData keys:
  - "changelog:meta" → { version, mode, lastCommitId, chunkCount }
  - "changelog:commits:0" → Commit[] (newest)
  - "changelog:commits:1" → Commit[] (older)
  - ...
  - "changelog:archive" → CompressedCommit[] (oldest, summarized)
```

**Rationale:**
- 100KB per-entry limit requires chunking
- LRU archival keeps active data under limits
- Compressed archive preserves history without full detail

**Alternatives considered:**
- Single key: Rejected - Would hit 100KB limit with ~50-100 commits
- External storage: Rejected - Adds infrastructure complexity
- Figma version history only: Rejected - 30-day limit on Starter plans

### D5: Changelog Rendering Approach

**Decision:** Programmatically generate Figma frames using Plugin API with auto-layout.

**Rationale:**
- Native Figma elements are scannable, selectable, copyable
- Histogram bars can link to commit entries via node IDs
- Theme detection enables light/dark styling

**Alternatives considered:**
- Widget: Rejected - Different API, harder to integrate with version history
- External page/site: Rejected - Loses "single source of truth" benefit

### D6: LLM Endpoint Configuration

**Decision:** Support any Claude API-compatible endpoint (Anthropic, Ollama, LM Studio, corporate proxies).

**Rationale:**
- Users have different LLM access (cloud vs local vs enterprise)
- Claude API format is well-documented and widely supported
- Avoid vendor lock-in

**Alternatives considered:**
- Anthropic-only: Rejected - Excludes users with local or enterprise LLMs
- Multiple SDKs: Rejected - Maintenance burden, bundle size

### D7: MCP Server Read-Only (v1)

**Decision:** MCP server is read-only. Commits must be created via the plugin.

**Rationale:**
- REST API cannot write pluginData or call saveVersionHistoryAsync
- Queue-based workarounds have poor UX
- Read-only covers primary use case (LLM querying changelogs)

**Alternatives considered:**
- Queue-based writes: Rejected - Janky UX, user must open plugin to process
- Cloud sync layer: Deferred - Too much infrastructure for MVP

## Risks / Trade-offs

### R1: Node Count Metrics Show Net Change Only

**Risk:** Histogram "work" metric is net node delta, not actual churn. A commit that adds 10 nodes and removes 10 shows zero activity.

**Mitigation:** Acceptable for MVP. Post-MVP can implement node ID tracking for exact created/deleted counts.

### R2: PAT Requirement Creates Onboarding Friction

**Risk:** Users may drop off during PAT setup.

**Mitigation:**
- Clear step-by-step guide with screenshots
- Allow basic usage without PAT (no comment capture)
- Link directly to Figma token generation page

### R3: Large Files May Hit Performance Issues

**Risk:** Files with tens of thousands of nodes could slow down metric collection.

**Mitigation:**
- Use `findAllWithCriteria` (hundreds of times faster than callback-based `findAll`)
- Set `figma.skipInvisibleInstanceChildren = true`
- Traverse current page only (not all pages)
- Cache metrics where possible

### R4: Changelog Page Could Become Cluttered

**Risk:** Files with hundreds of commits create long changelog pages.

**Mitigation:**
- Collapse older entries by default
- Pagination in plugin UI
- Archive option for very old commits

## Migration Plan

N/A - Greenfield project, no existing users or data.

## Open Questions

1. **Histogram click behavior:** Should clicking a histogram bar in the plugin UI navigate to the changelog page, or show commit details inline? (Resolved: Navigate to changelog page for consistency)

2. **Comment threading:** Should we preserve Figma comment thread structure, or flatten to individual comments? (Resolved: Flatten for simplicity in MVP)

3. **Annotation scope:** Should we capture annotations from all pages or just current page? (Resolved: Current page only for performance)
