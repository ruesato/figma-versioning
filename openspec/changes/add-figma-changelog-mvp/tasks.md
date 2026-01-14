# Tasks: Figma Design Changelog MVP

## Phase 1: Project Setup

- [ ] 1.1 Initialize pnpm monorepo with workspace configuration
- [ ] 1.2 Create `packages/core` with TypeScript setup
- [ ] 1.3 Create `packages/figma-plugin` using create-figma-plugin scaffold
- [ ] 1.4 Configure TailwindCSS for plugin UI
- [ ] 1.5 Set up shared TypeScript config and ESLint rules

## Phase 2: Core Package

- [ ] 2.1 Define `Commit` interface with all fields (id, version, message, author, timestamp, etc.)
- [ ] 2.2 Define `CommitMetrics` interface for activity tracking
- [ ] 2.3 Define `Comment` and `Annotation` interfaces
- [ ] 2.4 Implement keyword search utility for changelog queries
- [ ] 2.5 Create LLM prompt templates for summaries and queries

## Phase 3: PAT Authentication (Plugin)

- [ ] 3.1 Create onboarding UI view with PAT input form
- [ ] 3.2 Implement PAT validation via Figma REST API test call
- [ ] 3.3 Implement secure PAT storage using `figma.clientStorage`
- [ ] 3.4 Create settings view for PAT management (update/remove)
- [ ] 3.5 Implement graceful degradation when PAT is missing

## Phase 4: Commit Management (Plugin)

- [ ] 4.1 Create main plugin UI with commit form
- [ ] 4.2 Implement versioning mode selection (semantic vs date-based)
- [ ] 4.3 Implement semantic version auto-increment logic
- [ ] 4.4 Implement date-based version generation with sequence suffix
- [ ] 4.5 Implement comment fetching via Figma REST API
- [ ] 4.6 Implement annotation collection via Plugin API (`node.annotations`)
- [ ] 4.7 Implement node count metrics collection with performance optimizations
- [ ] 4.8 Implement `figma.saveVersionHistoryAsync()` integration
- [ ] 4.9 Implement commit data persistence with chunking strategy
- [ ] 4.10 Add commit message validation (required, max 500 chars)

## Phase 5: Changelog Rendering (Plugin)

- [ ] 5.1 Implement Changelog page creation/detection
- [ ] 5.2 Create commit entry frame generator with auto-layout
- [ ] 5.3 Implement theme-aware styling (Light/Dark/FigJam detection)
- [ ] 5.4 Implement comment section rendering within entry frames
- [ ] 5.5 Implement annotation section rendering within entry frames
- [ ] 5.6 Implement reverse chronological layout management
- [ ] 5.7 Implement viewport navigation to new entries

## Phase 6: Activity Histogram (Plugin)

- [ ] 6.1 Implement histogram data calculation from commit metrics
- [ ] 6.2 Create Figma frame-based histogram renderer for Changelog page
- [ ] 6.3 Implement clickable bar navigation (bar -> commit entry)
- [ ] 6.4 Create Preact histogram component for plugin UI
- [ ] 6.5 Implement hover tooltips for commit preview
- [ ] 6.6 Implement horizontal scrolling for large histories
- [ ] 6.7 Add legend rendering for histogram colors

## Phase 7: LLM Integration (Plugin, Post-MVP)

- [ ] 7.1 Create LLM configuration UI in settings
- [ ] 7.2 Implement Claude API-compatible request handler
- [ ] 7.3 Implement weekly summary generation
- [ ] 7.4 Implement monthly summary generation
- [ ] 7.5 Implement natural language query with keyword pre-filtering
- [ ] 7.6 Add error handling for LLM failures

## Phase 8: MCP Server (Post-MVP)

- [ ] 8.1 Create `packages/mcp-server` with Node.js/TypeScript setup
- [ ] 8.2 Implement MCP SDK integration
- [ ] 8.3 Implement Figma REST API client for plugin data retrieval
- [ ] 8.4 Implement `get_changelog` tool
- [ ] 8.5 Implement `get_commit` tool
- [ ] 8.6 Implement `search_changelog` tool
- [ ] 8.7 Implement `summarize_period` tool with LLM integration
- [ ] 8.8 Implement `list_files` tool
- [ ] 8.9 Implement MCP resources (changelog, recent, commit detail)
- [ ] 8.10 Create JSON config file parser
- [ ] 8.11 Add environment variable configuration support
- [ ] 8.12 Package for npm distribution

## Phase 9: Testing & Documentation

- [ ] 9.1 Write unit tests for core package utilities
- [ ] 9.2 Write integration tests for commit creation flow
- [ ] 9.3 Test plugin in files of varying sizes (small, medium, large)
- [ ] 9.4 Test MCP server with Claude Desktop
- [ ] 9.5 Create user documentation for plugin onboarding
- [ ] 9.6 Create MCP server setup documentation
- [ ] 9.7 Prepare Figma Community submission assets

## Dependencies

- Phase 2 (Core) must complete before Phases 4-8
- Phase 3 (PAT Auth) must complete before Phase 4.5 (comment fetching)
- Phase 4 (Commit Management) must complete before Phase 5 (Changelog Rendering)
- Phase 5 must complete before Phase 6.3 (bar navigation requires entry frames)
- Phases 1-6 constitute MVP; Phases 7-8 are post-MVP

## Parallelizable Work

- Phases 3 and 4.1-4.4 can run in parallel (auth vs basic commit UI)
- Phase 6.4-6.6 (plugin UI histogram) can run in parallel with 6.1-6.3 (changelog page histogram)
- Phase 8 (MCP Server) can run in parallel with Phase 7 (LLM Integration) after Phase 2 completes
