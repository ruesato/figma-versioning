# Figma Versioning Plugin

A Figma plugin for creating semantic versions with automatic changelog generation, comment tracking, and design metrics.

## Features

- **Semantic Versioning**: Auto-increment major, minor, or patch versions (e.g., 1.0.0 → 1.1.0)
- **Date-based Versioning**: Use date with automatic sequence suffix (e.g., 2026-01-14, 2026-01-14.1)
- **Comment Tracking**: Automatically capture comments from your Figma file
- **Annotation Collection**: Collect Dev Mode annotations
- **Design Metrics**: Track node counts (frames, components, instances, text nodes)
- **Persistent History**: All commits stored with full metadata

## Installation & Development

### Prerequisites

- Node.js 18+ and pnpm
- Figma desktop app

### Setup

1. **Clone and install dependencies:**
   ```bash
   cd /Users/ryanuesato/Documents/src/figma-versioning
   pnpm install
   ```

2. **Build the plugin:**
   ```bash
   pnpm build
   ```

3. **Load plugin in Figma:**
   - Open Figma desktop app
   - Go to **Plugins** → **Development** → **Import plugin from manifest...**
   - Navigate to `packages/figma-plugin/manifest.json`
   - Select the manifest file

### Development Mode

To rebuild automatically as you make changes:

```bash
cd packages/figma-plugin
pnpm dev
```

This will watch for changes and rebuild the plugin automatically.

## Usage

### First Time Setup (Optional)

1. **Run the plugin:**
   - In Figma, right-click anywhere → **Plugins** → **Development** → **Figma Versioning**

2. **Add Personal Access Token (PAT):**
   - If you see the onboarding screen, you can add a Figma PAT to enable comment tracking
   - Go to [Figma Account Settings](https://www.figma.com/settings)
   - Scroll to "Personal access tokens"
   - Create a new token
   - Copy and paste it into the plugin
   - **Or skip this step** - the plugin works without a PAT, but comment tracking will be disabled

### Creating a Version

1. **Open the plugin:**
   - Right-click → **Plugins** → **Development** → **Figma Versioning**

2. **Write your commit message:**
   - Enter a description of what changed (required, max 500 characters)
   - The character counter shows remaining space

3. **Choose versioning mode:**
   - **Semantic Versioning**: Select major/minor/patch increment
     - Major: Breaking changes (1.0.0 → 2.0.0)
     - Minor: New features (1.0.0 → 1.1.0)
     - Patch: Bug fixes (1.0.0 → 1.0.1)
   - **Date-based Versioning**: Uses current date with auto-sequencing
     - First commit today: 2026-01-14
     - Second commit today: 2026-01-14.1

4. **Review version preview:**
   - See what version number will be created

5. **Create commit:**
   - Click "Create Commit" button
   - Version is saved to Figma's version history
   - Commit data is stored in the plugin

### Settings

Access settings from the main screen:

- **Update PAT**: Change your Personal Access Token
- **Remove PAT**: Disable comment tracking
- **View current mode**: See your selected versioning mode

## What Gets Captured

Each commit captures:

- **Version number**: Semantic (1.2.3) or date-based (2026-01-14)
- **Commit message**: Your description of changes
- **Author**: Your Figma username
- **Timestamp**: When the commit was created
- **Comments**: All comments in the file (requires PAT)
- **Annotations**: All Dev Mode annotations on current page
- **Metrics**:
  - Total node count
  - Frame count
  - Component count
  - Instance count
  - Text node count
  - Feedback count (comments + annotations)

## Project Structure

```
figma-versioning/
├── packages/
│   ├── core/                 # Shared types and utilities
│   │   ├── src/
│   │   │   ├── types.ts     # TypeScript interfaces
│   │   │   ├── versioning.ts # Version calculation logic
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── figma-plugin/         # Figma plugin
│       ├── src/
│       │   ├── main.ts      # Plugin backend (runs in Figma sandbox)
│       │   └── ui.tsx       # Plugin UI (React/Preact)
│       ├── manifest.json     # Figma plugin manifest
│       └── package.json
│
└── package.json              # Root package.json
```

## Troubleshooting

### Plugin not showing in Figma

- Make sure you ran `pnpm build` successfully
- Try closing and reopening Figma
- Re-import the manifest: Plugins → Development → Import plugin from manifest

### "Invalid token" error

- Your PAT may have expired
- Go to Settings and update or remove the token
- You can still create versions without a PAT (comment tracking will be disabled)

### Changes not reflecting

- If in development mode, make sure `pnpm dev` is running
- Try reloading the plugin: Plugins → Development → Reload
- Check the Figma console for errors: Plugins → Development → Show console

### Build errors

```bash
# Clean and rebuild everything
pnpm clean
pnpm install
pnpm build
```

## Storage

All commit data is stored in Figma's `clientStorage`:
- Persists across plugin sessions
- Stored per-file (each Figma file has its own commit history)
- Automatically chunked to work within storage limits (10 commits per chunk)

## Version History Integration

Versions created by this plugin appear in:
- Figma's native version history (File → Show version history)
- Format: `{version} - {message}`
- Example: `1.2.0 - Added new button component`

## Next Steps

Phase 4 (Commit Management) is complete! Future phases will add:
- Phase 5: Changelog rendering
- Phase 6: Multi-file support
- Phase 7: LLM integration for auto-generated changelogs
- Phase 8: MCP server for external integrations

## Development Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Build specific package
pnpm --filter @figma-versioning/core build
pnpm --filter @figma-versioning/figma-plugin build

# Development mode (watch and rebuild)
cd packages/figma-plugin
pnpm dev

# Type checking
pnpm --filter @figma-versioning/figma-plugin typecheck
```

## License

MIT
