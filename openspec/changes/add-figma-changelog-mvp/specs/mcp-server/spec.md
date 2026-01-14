# MCP Server

## ADDED Requirements

### Requirement: MCP Server Distribution

The MCP server SHALL be distributed as an npm package for easy installation.

#### Scenario: Install via npm

- **WHEN** the user runs `npm install -g @designchangelog/mcp-server`
- **THEN** the MCP server binary is available globally
- **AND** can be configured in MCP clients (Claude Desktop, Cursor, etc.)

#### Scenario: Configure in MCP client

- **WHEN** the user adds the server to their MCP client config
- **THEN** they specify the command and config file path
- **AND** the server starts and connects via stdio or SSE

### Requirement: Server Configuration

The MCP server SHALL support JSON config file or environment variable configuration.

#### Scenario: Configure via JSON file

- **WHEN** the user creates a config JSON file
- **THEN** they can specify Figma PAT, file keys/names, and optional LLM endpoint
- **AND** the server reads this config on startup

#### Scenario: Configure via environment variables

- **WHEN** the user sets environment variables
- **THEN** the server reads FIGMA_TOKEN, FIGMA_FILES, LLM_ENDPOINT, and LLM_API_KEY
- **AND** these override config file values if both exist

### Requirement: MCP Tools

The MCP server SHALL expose tools for querying changelog data.

#### Scenario: get_changelog tool

- **WHEN** an LLM calls `get_changelog` with a file_key
- **THEN** the server fetches plugin data from the Figma REST API
- **AND** returns all commits for that file

#### Scenario: get_commit tool

- **WHEN** an LLM calls `get_commit` with file_key and commit_id
- **THEN** the server returns details for that specific commit
- **AND** includes comments, annotations, and metrics

#### Scenario: search_changelog tool

- **WHEN** an LLM calls `search_changelog` with file_key and query
- **THEN** the server performs keyword search across commit messages, comments, and annotations
- **AND** returns matching commits up to the specified limit

#### Scenario: summarize_period tool

- **WHEN** an LLM calls `summarize_period` with file_key, start_date, and end_date
- **AND** LLM endpoint is configured
- **THEN** the server generates an AI summary of commits in that range

#### Scenario: summarize_period without LLM config

- **WHEN** `summarize_period` is called without LLM configuration
- **THEN** the server returns an error prompting the user to configure an LLM endpoint

#### Scenario: list_files tool

- **WHEN** an LLM calls `list_files`
- **THEN** the server returns the list of configured Figma files with their names and keys

### Requirement: MCP Resources

The MCP server SHALL expose resources for direct context injection.

#### Scenario: Changelog resource

- **WHEN** an LLM accesses `figma:///{file_key}/changelog`
- **THEN** the server returns the full changelog as structured data

#### Scenario: Recent commits resource

- **WHEN** an LLM accesses `figma:///{file_key}/changelog/recent?n=10`
- **THEN** the server returns the last N commits

#### Scenario: Commit detail resource

- **WHEN** an LLM accesses `figma:///{file_key}/changelog/commit/{commit_id}`
- **THEN** the server returns full details for that commit

### Requirement: Read-Only Access

The MCP server SHALL provide read-only access to changelog data.

#### Scenario: No write operations

- **WHEN** the MCP server is running
- **THEN** it cannot create commits, modify plugin data, or call Figma write APIs
- **AND** all operations are read-only via the Figma REST API

#### Scenario: Error on write attempt

- **WHEN** an LLM attempts an operation that would require write access
- **THEN** the server returns an error explaining that write access is not supported
- **AND** suggests using the Figma plugin for commit creation

### Requirement: Shared Code with Plugin

The MCP server SHALL use shared types and logic from the core package.

#### Scenario: Consistent data schemas

- **WHEN** the MCP server parses commit data
- **THEN** it uses the same TypeScript interfaces as the Figma plugin
- **AND** ensures compatibility between plugin and server

#### Scenario: Shared prompt templates

- **WHEN** the MCP server generates summaries
- **THEN** it uses the same prompt templates as the plugin
- **AND** produces consistent output regardless of entry point
