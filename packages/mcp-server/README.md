# Figma Versioning MCP Server

Model Context Protocol (MCP) server for integrating Figma Versioning changelogs with Claude Desktop and other MCP clients.

## Overview

The Figma Versioning MCP Server provides tools and resources for querying design changelogs, searching versions, and generating summaries. This enables Claude to help you understand your design history and answer questions about your Figma files.

## Features

- **📖 Changelog Access**: Read full changelog or specific versions
- **🔍 Search**: Query versions by keywords, dates, or version numbers
- **📊 Summaries**: Generate weekly/monthly design activity summaries
- **📁 File Listing**: Discover all tracked Figma files
- **🔗 Resources**: Direct access to changelog data via URIs

## Installation

### Prerequisites

- Node.js 18+ and pnpm
- Claude Desktop app
- Figma file(s) with Figma Versioning plugin installed

### Install via npm

\`\`\`bash
npm install -g @figma-versioning/mcp-server
\`\`\`

### Install from source

\`\`\`bash
git clone https://github.com/yourusername/figma-versioning.git
cd figma-versioning
pnpm install
pnpm --filter @figma-versioning/mcp-server build
pnpm --filter @figma-versioning/mcp-server link --global
\`\`\`

## Configuration

### Claude Desktop Setup

1. Open Claude Desktop settings:
   - **macOS**: \`~/Library/Application Support/Claude/claude_desktop_config.json\`
   - **Windows**: \`%APPDATA%\Claude\claude_desktop_config.json\`

2. Add the MCP server configuration:

\`\`\`json
{
  "mcpServers": {
    "figma-versioning": {
      "command": "figma-versioning-mcp",
      "args": [],
      "env": {
        "FIGMA_PAT": "your-figma-personal-access-token"
      }
    }
  }
}
\`\`\`

3. Restart Claude Desktop

### Environment Variables

The server supports the following environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| \`FIGMA_PAT\` | Yes | Your Figma Personal Access Token |
| \`FIGMA_VERSIONING_LOG_LEVEL\` | No | Logging level (debug, info, warn, error). Default: info |
| \`FIGMA_VERSIONING_CACHE_TTL\` | No | Cache TTL in seconds. Default: 300 |

### Getting a Figma PAT

1. Go to your [Figma account settings](https://www.figma.com/developers/api#access-tokens)
2. Click "Create new personal access token"
3. Give it a descriptive name (e.g., "Claude MCP Server")
4. Copy the token and add it to your configuration

**Security Note**: Keep your PAT secure. It grants read access to your Figma files.

### Configuration File (Optional)

You can also use a config file instead of environment variables:

\`\`\`json
// ~/.config/figma-versioning/config.json
{
  "figmaPat": "your-pat-here",
  "logLevel": "info",
  "cacheTtl": 300
}
\`\`\`

Update Claude Desktop config to use the file:

\`\`\`json
{
  "mcpServers": {
    "figma-versioning": {
      "command": "figma-versioning-mcp",
      "args": ["--config", "~/.config/figma-versioning/config.json"]
    }
  }
}
\`\`\`

## Available Tools

Once configured, Claude can use these tools to interact with your changelogs:

### \`get_changelog\`

Retrieve the full changelog for a Figma file.

**Parameters**:
- \`fileKey\` (string, required): Figma file key

**Example**:
\`\`\`
Get the changelog for file abc123xyz
\`\`\`

### \`get_commit\`

Get details about a specific version/commit.

**Parameters**:
- \`fileKey\` (string, required): Figma file key
- \`commitId\` (string, required): Commit ID or version number

**Example**:
\`\`\`
Show me version 2.1.0 from file abc123xyz
\`\`\`

### \`search_changelog\`

Search for versions matching keywords or dates.

**Parameters**:
- \`fileKey\` (string, required): Figma file key
- \`query\` (string, required): Search query (keywords or natural language)
- \`startDate\` (string, optional): ISO date string (YYYY-MM-DD)
- \`endDate\` (string, optional): ISO date string (YYYY-MM-DD)

**Example**:
\`\`\`
Find all button-related changes in file abc123xyz from last month
\`\`\`

### \`summarize_period\`

Generate a summary of design activity for a time period.

**Parameters**:
- \`fileKey\` (string, required): Figma file key
- \`period\` (string, required): "week" or "month"
- \`startDate\` (string, optional): ISO date string. Defaults to current week/month

**Example**:
\`\`\`
Summarize this week's design changes in file abc123xyz
\`\`\`

### \`list_files\`

List all Figma files that have versioning data.

**Example**:
\`\`\`
Show me all tracked Figma files
\`\`\`

## Available Resources

Resources provide direct access to changelog data:

### \`figma://changelog/{fileKey}\`

Full changelog for a file as JSON.

### \`figma://recent/{fileKey}?limit=10\`

Recent commits (default: 10, max: 100).

### \`figma://commit/{fileKey}/{commitId}\`

Specific commit details.

## Usage Examples

### With Claude Desktop

Once configured, you can ask Claude questions like:

- "What changed in my button component this week?"
- "Show me all versions related to the navigation redesign"
- "Summarize the design activity from last month"
- "When was the last time we updated the color palette?"
- "List all comments on version 2.1.0"

### Programmatic Usage

You can also use the MCP server programmatically:

\`\`\`typescript
import { MCPClient } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'figma-versioning-mcp',
  args: [],
  env: { FIGMA_PAT: 'your-pat' }
});

const client = new MCPClient({
  name: 'my-app',
  version: '1.0.0'
}, {
  capabilities: {}
});

await client.connect(transport);

// Call a tool
const result = await client.callTool({
  name: 'get_changelog',
  arguments: { fileKey: 'abc123xyz' }
});

console.log(result);
\`\`\`

## Troubleshooting

### Server Not Appearing in Claude Desktop

1. Check that the config file is valid JSON
2. Verify the server command is in your PATH
3. Check Claude Desktop logs:
   - **macOS**: \`~/Library/Logs/Claude/\`
   - **Windows**: \`%APPDATA%\Claude\logs\`
4. Restart Claude Desktop completely

### "Invalid Token" Error

1. Verify your PAT is correct
2. Check that the PAT hasn't expired
3. Ensure the PAT has file read permissions
4. Try generating a new PAT

### Tool Calls Failing

1. Check the Figma file has versioning data (use the plugin to create versions)
2. Verify the file key is correct (found in the Figma file URL)
3. Check server logs for specific errors
4. Ensure your PAT has access to the file

### Performance Issues

1. Increase cache TTL to reduce API calls
2. Limit query results with date ranges
3. Check network connectivity to Figma API
4. Reduce log verbosity

## Development

### Running Locally

\`\`\`bash
# Install dependencies
pnpm install

# Build
pnpm --filter @figma-versioning/mcp-server build

# Run in development mode
pnpm --filter @figma-versioning/mcp-server dev
\`\`\`

### Testing

\`\`\`bash
# Run tests
pnpm --filter @figma-versioning/mcp-server test

# Run tests with coverage
pnpm --filter @figma-versioning/mcp-server test:coverage
\`\`\`

### Debugging

Enable debug logging:

\`\`\`json
{
  "mcpServers": {
    "figma-versioning": {
      "command": "figma-versioning-mcp",
      "args": [],
      "env": {
        "FIGMA_PAT": "your-token",
        "FIGMA_VERSIONING_LOG_LEVEL": "debug"
      }
    }
  }
}
\`\`\`

Or run with stdio inspector:

\`\`\`bash
npx @modelcontextprotocol/inspector figma-versioning-mcp
\`\`\`

## Architecture

\`\`\`
┌─────────────────┐
│ Claude Desktop  │
│   (MCP Client)  │
└────────┬────────┘
         │ MCP Protocol (stdio)
         ▼
┌─────────────────┐
│  MCP Server     │
│  - Tools        │
│  - Resources    │
└────────┬────────┘
         │ Figma REST API
         ▼
┌─────────────────┐
│  Figma Files    │
│  - Plugin Data  │
│  - Comments     │
└─────────────────┘
\`\`\`

### Data Flow

1. Plugin stores changelog data in Figma's clientStorage
2. MCP server fetches data via Figma REST API
3. Server caches responses for performance
4. Claude queries the server via MCP tools
5. Results are formatted and returned to Claude

## API Reference

See [API.md](./API.md) for detailed API documentation.

## FAQ

**Q: Does the server modify my Figma files?**

A: No. The server only reads changelog data. It cannot modify files or create versions.

**Q: How often is data refreshed?**

A: By default, data is cached for 5 minutes. You can adjust this with \`FIGMA_VERSIONING_CACHE_TTL\`.

**Q: Can multiple MCP clients use the same server?**

A: No. Each MCP server instance serves one client. Configure multiple entries in Claude Desktop if needed.

**Q: Is my PAT secure?**

A: Your PAT is stored in Claude Desktop's config file, which is local to your machine. The server never logs or transmits your PAT except to Figma's API.

**Q: Can I use this with other MCP clients?**

A: Yes! Any MCP-compatible client can use this server. The server follows the MCP specification.

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/figma-versioning/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/figma-versioning/discussions)

## License

MIT License - see [LICENSE](../../LICENSE) for details.

## Related

- [Figma Versioning Plugin](../../README.md)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [Claude Desktop](https://claude.ai/desktop)
