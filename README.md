# Figma Versioning

A powerful Figma plugin for design versioning, changelog management, and collaboration tracking.

## Features

- **📅 Flexible Versioning**: Choose between semantic versioning (1.2.3) or date-based versioning (2024-01-15)
- **📝 Automatic Changelog**: Generate beautiful changelog entries with every version
- **💬 Comment Tracking**: Automatically capture and track Figma comments
- **📌 Annotation Support**: Include design annotations in your changelog
- **📊 Activity Histogram**: Visualize your design history over time
- **🔍 Smart Filtering**: Only new comments and annotations appear in each version
- **💾 Reliable Storage**: Chunked storage system handles large project histories
- **🎨 Visual Changelog**: Auto-generated changelog frames on a dedicated page

## Installation

### From Figma Community (Coming Soon)

1. Open Figma Desktop
2. Go to **Plugins** → **Browse plugins in Community**
3. Search for "Figma Versioning"
4. Click **Install**

### Manual Installation (Development)

1. Clone this repository:
   \`\`\`bash
   git clone https://github.com/yourusername/figma-versioning.git
   cd figma-versioning
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   pnpm install
   \`\`\`

3. Build the plugin:
   \`\`\`bash
   pnpm build
   \`\`\`

4. In Figma Desktop:
   - Go to **Plugins** → **Development** → **Import plugin from manifest**
   - Select the \`manifest.json\` file from \`packages/figma-plugin/dist/\`

## Quick Start

### 1. First Launch

When you first open the plugin:

1. Choose your versioning mode:
   - **Semantic Versioning**: Traditional software versioning (1.0.0, 1.1.0, 2.0.0)
   - **Date-based Versioning**: Date stamps with optional sequence (2024-01-15, 2024-01-15.1)

2. (Optional) Configure your Personal Access Token (PAT):
   - Go to Settings tab
   - Enter your Figma PAT to enable comment fetching
   - [How to get a Figma PAT](https://help.figma.com/hc/en-us/articles/8085703771159-Manage-personal-access-tokens)

### 2. Creating Your First Version

1. Open your Figma file
2. Run the plugin: **Plugins** → **Figma Versioning**
3. Fill in the version details:
   - **Title**: Brief description (e.g., "Updated button styles")
   - **Description**: (Optional) Detailed notes
   - **Version Type**: For semantic versioning, choose Major/Minor/Patch
4. Click **Create Version**

The plugin will:
- ✅ Save the version to Figma's version history
- ✅ Capture current comments and annotations
- ✅ Generate a changelog entry
- ✅ Update the activity histogram

### 3. Viewing Your Changelog

The plugin automatically creates a "Changelog" page in your file with:

- **Individual Entries**: Each version gets a beautifully formatted frame showing:
  - Version number and title
  - Author and timestamp
  - Metrics (node counts)
  - Comments and annotations
  - Description

- **Activity Histogram**: Visual timeline of your versions
  - Click any bar to navigate to that version
  - See activity patterns over time

## Versioning Modes

### Semantic Versioning

Best for: Product files, design systems, component libraries

\`\`\`
1.0.0 → 1.0.1 (Patch)   - Bug fixes, small tweaks
1.0.1 → 1.1.0 (Minor)   - New features, additions
1.1.0 → 2.0.0 (Major)   - Breaking changes, major redesigns
\`\`\`

### Date-based Versioning

Best for: Marketing assets, one-off designs, rapid iterations

\`\`\`
2024-01-15              - First version of the day
2024-01-15.1            - Second version on the same day
2024-01-16              - First version of the next day
\`\`\`

## Comment Integration

### Setting Up

1. Go to **Settings** tab in the plugin
2. Click **Generate PAT** or enter your existing token
3. Click **Validate & Save**

### How It Works

- Comments are fetched from Figma's REST API
- Only **new** comments appear in each version
- Comments are deduplicated across versions
- Each version shows incremental feedback

### Without a PAT

The plugin works without a PAT, but comment tracking will be disabled. You'll still get:
- Version management
- Annotation tracking
- Changelog generation
- Activity histogram

## Annotations

Annotations are automatically captured from your Figma file:

- **Dev Mode Annotations**: All annotations created in Dev Mode
- **Pinned Comments**: Comments attached to specific nodes
- **Smart Filtering**: Only new annotations appear in each version

No setup required - annotations just work!

## Changelog Management

### Viewing the Changelog

1. The plugin creates a "Changelog" page automatically
2. Each version is a frame on this page
3. Frames are ordered newest → oldest
4. Click the histogram to navigate to any version

### Rebuilding the Changelog

If frames get deleted or corrupted:

1. Go to **Settings** tab
2. Click **Rebuild Changelog**
3. Wait for the process to complete

This regenerates all changelog frames from stored data.

## Tips & Best Practices

### Creating Meaningful Versions

- **Be descriptive**: Use clear titles (✅ "Updated navigation menu" vs. ❌ "Changes")
- **Regular cadence**: Create versions at natural checkpoints
- **Include context**: Use descriptions for complex changes
- **Capture feedback**: Create versions after design reviews to capture all comments

### Organizing Your Changelog

- The Changelog page is automatically managed
- Don't manually edit changelog frames (they'll be regenerated)
- Use the histogram to find specific versions quickly
- Archive old versions by moving frames to another page

### Performance Tips

- For large files (>500 nodes), version creation may take a few seconds
- Comments are fetched asynchronously - don't close the plugin immediately
- Rebuilding the changelog is safe to do anytime
- The plugin uses chunked storage to handle unlimited versions

## Troubleshooting

### Comments Not Appearing

**Problem**: Comments don't show up in versions

**Solutions**:
1. Check that your PAT is configured (Settings tab)
2. Verify the PAT hasn't expired
3. Make sure you have permission to view comments in the file
4. Check browser console for API errors

### Plugin Loads Slowly

**Problem**: Plugin takes a long time to open

**Solutions**:
1. Check your file size (large files are slower)
2. Try rebuilding the changelog (Settings → Rebuild Changelog)
3. Close and reopen Figma Desktop
4. Check for Figma Desktop updates

### Changelog Frames Missing

**Problem**: Some or all changelog frames are gone

**Solution**:
1. Go to Settings tab
2. Click **Rebuild Changelog**
3. All frames will be regenerated from stored data

### "Invalid Token" Error

**Problem**: PAT validation fails

**Solutions**:
1. Generate a new PAT in your [Figma account settings](https://www.figma.com/developers/api#access-tokens)
2. Make sure the token has read access to files
3. Copy the entire token without extra spaces
4. Try pasting in Settings again

### Version Creation Fails

**Problem**: Error when creating a version

**Solutions**:
1. Check browser console for specific error message
2. Ensure you have edit access to the file
3. Try with a simpler title/description
4. Check that versioning mode is set correctly

## Advanced Features

### Metrics Tracking

Each version automatically tracks:

- Total nodes in your file
- Number of frames
- Number of components
- Number of instances
- Number of text nodes
- Feedback count (comments + annotations)

These metrics help you understand how your file evolves over time.

### Storage Architecture

The plugin uses Figma's \`clientStorage\` API with intelligent chunking:

- Commits are stored in chunks of 10
- Unlimited version history
- Automatic chunk management
- Date objects are properly serialized
- Deduplicated commit IDs

### Version History Integration

Each version is also saved to Figma's native version history:

- Find versions in **File** → **Show version history**
- Native and plugin versions stay in sync
- Plugin provides richer metadata and changelog

## Privacy & Security

- Your PAT is stored securely in Figma's \`clientStorage\`
- Only you can access your stored PAT
- PAT is only used to fetch comments from files you have access to
- No data is sent to external servers
- All processing happens locally in the Figma plugin sandbox

## FAQ

**Q: Can I use this with Figma in the browser?**

A: Not yet. The plugin requires Figma Desktop for certain features. Browser support is planned for a future release.

**Q: What happens if I delete the Changelog page?**

A: Your version data is safely stored. Just rebuild the changelog (Settings → Rebuild Changelog) to regenerate the page.

**Q: Can I export my version history?**

A: Not yet, but this feature is planned. For now, your data is stored in Figma's clientStorage.

**Q: Does this work with FigJam?**

A: Currently, the plugin is designed for Figma design files. FigJam support may come in a future release.

**Q: How many versions can I create?**

A: There's no hard limit. The plugin uses chunked storage to handle unlimited versions.

**Q: Can multiple people use this plugin on the same file?**

A: Yes! Each person's plugin instance manages versions independently. However, since versions are saved to Figma's version history, they'll be visible to all collaborators.

## Development

### Building

Build all packages:
```bash
pnpm build
```

Build in watch mode for development:
```bash
pnpm dev
```

### Testing

Run all tests:
```bash
pnpm test
```

Run tests with UI:
```bash
pnpm --filter './packages/*' test:ui
```

### Releases

The project uses GitHub Actions for automated releases.

#### Triggering a Release

**Option 1: Manual Release (Recommended)**

1. Go to the **Actions** tab in GitHub
2. Select the **Release** workflow
3. Click **Run workflow**
4. Enter the version number (e.g., `1.0.0`)
5. The workflow will:
   - Run tests and type checking
   - Build all packages
   - Create a GitHub release with the version tag
   - Upload the Figma plugin as a release asset

**Option 2: Tag-based Release**

Create and push a version tag:
```bash
git tag v1.0.0
git push origin v1.0.0
```

The release workflow will trigger automatically.

#### Release Artifacts

Each release includes:
- **figma-versioning-plugin-{version}.zip** - Ready-to-install Figma plugin
- Automatic release notes generated from commits

## Roadmap

- [ ] Browser compatibility
- [ ] Version comparison view
- [ ] Export to markdown/PDF
- [ ] MCP server for Claude integration
- [ ] LLM-powered summaries
- [ ] Natural language changelog queries
- [ ] FigJam support
- [ ] Team sync and collaboration features

## Support

- **Bug reports**: [GitHub Issues](https://github.com/yourusername/figma-versioning/issues)
- **Feature requests**: [GitHub Discussions](https://github.com/yourusername/figma-versioning/discussions)
- **Questions**: [GitHub Discussions Q&A](https://github.com/yourusername/figma-versioning/discussions/categories/q-a)

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

Built with:
- [@create-figma-plugin](https://github.com/yuanqing/create-figma-plugin)
- [Preact](https://preactjs.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [@figma-versioning/core](packages/core) - Core versioning utilities

---

Made with ❤️ for the Figma community
