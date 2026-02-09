# Privacy Policy for Figma Versioning

**Last updated**: February 8, 2026

## Overview

Figma Versioning respects your privacy. This policy explains how we handle data when you use our plugin.

## Data Collection

**We do not collect any personal data.**

Figma Versioning operates entirely within Figma's environment and does not:
- Collect analytics or usage data
- Track user behavior
- Store data on external servers
- Transmit data to third parties
- Use cookies or tracking technologies

## Data Storage

All plugin data is stored locally in Figma's `clientStorage` API:

### Version History
- Commit metadata (version, title, description, timestamp)
- Comments and annotations (when fetched)
- Metrics (node counts, feedback counts)
- Changelog frame references

This data:
- Remains in your Figma account
- Is not accessible to us or third parties
- Persists across sessions
- Can be deleted by removing the plugin

### Personal Access Token (Optional)

If you choose to enable comment fetching:
- Your Figma PAT is stored in `clientStorage`
- Only your Figma account has access to it
- It's used solely to call Figma's REST API
- You can remove it anytime via Settings
- We never see or have access to your PAT

## Data Usage

The plugin uses your data only to:
- Generate changelog entries in your Figma file
- Fetch comments from Figma's API (if PAT provided)
- Display version history and metrics
- Create visual histogram of activity

## Data Sharing

We do not share any data because:
- We don't collect data
- We don't have access to your data
- All operations are local to Figma

## Third-Party Services

The plugin interacts only with Figma's services:

### Figma REST API
- Used to fetch comments (requires your PAT)
- Governed by [Figma's Privacy Policy](https://www.figma.com/privacy/)
- Only called when you enable comment fetching

### Figma clientStorage
- Used to store version history
- Governed by [Figma's Privacy Policy](https://www.figma.com/privacy/)
- Standard Figma plugin storage mechanism

## Your Rights

You have full control over your data:

### Access
- All data is visible within the plugin
- Stored in standard Figma storage

### Deletion
- Remove PAT: Settings → Remove PAT
- Delete versions: Use plugin's delete feature
- Remove all data: Uninstall the plugin

### Export
- Version data is stored in Figma's format
- Future updates may include export features

## Children's Privacy

Figma Versioning does not knowingly collect data from anyone. The plugin is designed for professional use and follows Figma's terms of service.

## Data Security

Security is provided by Figma:
- Data stored in Figma's secure infrastructure
- PAT stored in encrypted clientStorage
- No additional security layer needed (no external transmission)

## Open Source

Figma Versioning is open source:
- Source code available on [GitHub](https://github.com/yourusername/figma-versioning)
- You can audit how we handle data
- Community can verify privacy claims

## Changes to This Policy

We may update this policy to:
- Reflect new features
- Clarify existing practices
- Comply with legal requirements

Changes will be:
- Posted in our [GitHub repository](https://github.com/yourusername/figma-versioning)
- Noted in the plugin's release notes
- Effective immediately upon posting

## Questions and Contact

If you have questions about this privacy policy:

- **GitHub Issues**: https://github.com/yourusername/figma-versioning/issues
- **Email**: your-email@example.com

## Compliance

### GDPR (EU Users)

If you're in the EU:
- No personal data is collected (GDPR doesn't apply)
- Data remains in Figma's infrastructure
- Refer to [Figma's GDPR compliance](https://www.figma.com/gdpr/)

### CCPA (California Users)

If you're in California:
- We don't sell personal information
- We don't collect personal information
- Refer to [Figma's CCPA compliance](https://www.figma.com/privacy/)

## Summary

**In short**: Figma Versioning doesn't collect your data. Everything stays in Figma. Your privacy is protected by Figma's infrastructure and policies.
