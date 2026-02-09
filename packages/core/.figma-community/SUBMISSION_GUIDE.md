# Figma Community Submission Guide

This guide outlines everything needed to publish the Figma Versioning plugin to Figma Community.

## Submission Checklist

### Plugin Files
- [ ] Built and tested plugin (`packages/figma-plugin/dist/`)
- [ ] Valid manifest.json with all required fields
- [ ] Plugin icon (128x128px PNG)
- [ ] No console errors or warnings

### Visual Assets
- [ ] Cover image (1920x960px)
- [ ] Preview images (2-5 images, 1280x720px each)
- [ ] Demo GIF or video (optional but recommended)
- [ ] Plugin icon (128x128px)

### Documentation
- [ ] Plugin description (short version)
- [ ] Plugin description (long version with formatting)
- [ ] Feature list
- [ ] Usage instructions
- [ ] FAQ section

### Legal & Metadata
- [ ] Terms of service
- [ ] Privacy policy
- [ ] Contact information
- [ ] Tags and categories

## Asset Specifications

### Cover Image

**Dimensions**: 1920x960px
**Format**: PNG or JPG
**Max size**: 2MB

**Content Guidelines**:
- Show the plugin in action
- Include visual examples of changelogs
- Highlight key features (versions, comments, annotations, histogram)
- Use high-quality screenshots
- Maintain good contrast and readability

**Design Tips**:
- Use Figma brand colors or neutral palette
- Include plugin name and tagline
- Show before/after or workflow visualization
- Avoid too much text

### Preview Images

**Dimensions**: 1280x720px each
**Quantity**: 2-5 images
**Format**: PNG or JPG
**Max size**: 1MB each

**Suggested Images**:
1. **Main Interface**: Show the plugin UI with version creation form
2. **Changelog View**: Display generated changelog frames
3. **Activity Histogram**: Highlight the histogram visualization
4. **Comments Integration**: Show comment tracking in action
5. **Settings Panel**: Display configuration options

### Demo Video (Optional)

**Platform**: YouTube, Vimeo, or Loom
**Duration**: 1-3 minutes
**Resolution**: 1080p or higher

**Content**:
1. Brief introduction (5-10 seconds)
2. Creating a version (15-30 seconds)
3. Viewing the changelog (15-30 seconds)
4. Navigating the histogram (15-30 seconds)
5. Advanced features (30-60 seconds)
6. Call to action (5-10 seconds)

### Plugin Icon

**Dimensions**: 128x128px
**Format**: PNG with transparency
**Already created**: Located in `packages/figma-plugin/assets/icon.png`

## Plugin Descriptions

### Short Description (80 characters max)

> Design versioning and changelog management with automatic comment tracking.

or

> Track design versions with beautiful changelogs and automatic feedback capture.

### Long Description (Supports Markdown)

\`\`\`markdown
# Design Versioning Made Simple

Figma Versioning helps you track design changes, manage versions, and create beautiful changelogs automatically.

## ✨ Key Features

**📅 Flexible Versioning**
Choose between semantic versioning (1.2.3) or date-based versioning (2024-01-15) to match your workflow.

**📝 Automatic Changelogs**
Every version automatically generates a beautifully formatted changelog entry on a dedicated page.

**💬 Comment Tracking**
Capture Figma comments with each version. Only new comments appear, avoiding duplicates.

**📌 Annotation Support**
Automatically include Dev Mode annotations in your changelog.

**📊 Activity Histogram**
Visualize your design history with an interactive timeline. Click any bar to jump to that version.

**🔍 Smart Filtering**
Intelligent deduplication ensures only new feedback appears in each version.

**💾 Unlimited History**
Store unlimited versions with our chunked storage system. Never lose your design history.

## 🚀 Getting Started

1. **Choose Your Mode**: Pick semantic or date-based versioning
2. **Create a Version**: Add a title and description
3. **View Your Changelog**: Automatically generated on a dedicated page
4. **Track Progress**: Use the histogram to visualize activity

## 📚 Perfect For

- Design systems and component libraries
- Product design files with frequent iterations
- Team collaboration and handoffs
- Design documentation and portfolios
- Client presentations and approvals

## 🔐 Privacy First

- All data stored in Figma's secure clientStorage
- Optional PAT for comment fetching (you control access)
- No external servers or data collection
- Works entirely within Figma

## 💡 Advanced Features

- Metrics tracking (nodes, components, frames)
- Changelog rebuild capability
- Version history integration
- Custom versioning strategies
- Batch operations

## 🆘 Support

Questions? Check our [documentation](link) or [open an issue](link).

---

Made with ❤️ for designers who care about their work's evolution
\`\`\`

## Submission Form Fields

### Basic Information

**Plugin Name**: Figma Versioning

**Tagline**: Track design versions with beautiful changelogs

**Category**: Productivity

**Tags** (choose 3-5):
- Versioning
- Changelog
- Documentation
- Collaboration
- Comments

### Detailed Information

**What problem does your plugin solve?**

Designers struggle to track design evolution and document changes over time. Figma's native version history lacks context, visual changelogs, and integration with comments and feedback. Our plugin solves this by:

1. Creating visual changelog entries for each version
2. Automatically capturing comments and annotations
3. Providing a timeline visualization of activity
4. Supporting flexible versioning strategies
5. Maintaining unlimited design history

**Who is your target audience?**

- Design teams managing component libraries
- Product designers working on iterative projects
- Freelancers documenting client work
- Design managers needing visibility into team activity
- Anyone who wants better design documentation

**What makes your plugin unique?**

Unlike other versioning tools, Figma Versioning:
- Generates visual changelogs directly in Figma (no external tools)
- Intelligently filters duplicate comments across versions
- Provides both semantic and date-based versioning
- Includes an activity histogram for quick navigation
- Stores unlimited history with automatic chunk management
- Works entirely within Figma (no external dependencies)

### Support Information

**Support URL**: https://github.com/yourusername/figma-versioning

**Documentation URL**: https://github.com/yourusername/figma-versioning#readme

**Video Demo URL**: [Your demo video URL]

**Contact Email**: your-email@example.com

### Legal

**Terms of Service**: [Link to your ToS]

**Privacy Policy**: [Link to your privacy policy]

**License**: MIT

## Privacy Policy Template

Create a `PRIVACY.md` file:

\`\`\`markdown
# Privacy Policy for Figma Versioning

Last updated: [Date]

## Data Collection

Figma Versioning does not collect, store, or transmit any personal data to external servers. All data remains within Figma's infrastructure.

## Data Storage

- Version data: Stored in Figma's clientStorage (local to your Figma account)
- Personal Access Token: Optionally stored in clientStorage (if you enable comment fetching)
- No cloud storage or external databases

## Data Usage

- Version history is used solely for changelog generation within your Figma file
- PAT (if provided) is used only to fetch comments from Figma's API
- No analytics, tracking, or usage data is collected

## Data Sharing

We do not share any data with third parties because we don't collect or have access to your data.

## Your Rights

You have full control over your data:
- Delete versions through the plugin
- Remove your PAT at any time through Settings
- Uninstall the plugin to remove all associated data

## Changes to This Policy

We may update this policy. Changes will be posted in our GitHub repository.

## Contact

Questions about privacy? Contact us at [your-email]
\`\`\`

## Pre-Submission Checklist

### Testing
- [ ] Test in a clean Figma file
- [ ] Test with large files (500+ nodes)
- [ ] Test version creation (semantic and date-based)
- [ ] Test comment fetching (with and without PAT)
- [ ] Test changelog rebuild
- [ ] Test histogram navigation
- [ ] Check for console errors
- [ ] Test in Figma Desktop (required)

### Quality Assurance
- [ ] All features work as described
- [ ] No broken UI elements
- [ ] Proper error messages
- [ ] Loading states are clear
- [ ] Performance is acceptable

### Documentation Review
- [ ] README is comprehensive
- [ ] All screenshots are up to date
- [ ] Video demo is current
- [ ] Installation instructions work
- [ ] Troubleshooting section covers common issues

### Legal Compliance
- [ ] Privacy policy is accurate
- [ ] Terms of service are clear
- [ ] Contact information is current
- [ ] License is specified

## Submission Process

1. **Build Final Version**
   \`\`\`bash
   pnpm build
   \`\`\`

2. **Test Thoroughly**
   - Install the built plugin in Figma Desktop
   - Run through all features
   - Check for any issues

3. **Prepare Assets**
   - Create all images at correct dimensions
   - Record demo video
   - Write descriptions

4. **Submit to Figma**
   - Go to [Figma Community](https://www.figma.com/community)
   - Click "Publish" → "Publish plugin"
   - Upload your plugin files
   - Fill in all information
   - Upload visual assets
   - Submit for review

5. **Wait for Approval**
   - Figma typically reviews within 1-2 weeks
   - They may request changes
   - Be responsive to feedback

6. **Post-Launch**
   - Monitor user feedback
   - Respond to questions
   - Plan updates based on usage

## Post-Launch Marketing

### Announcement Channels
- [ ] Figma Community (automatic)
- [ ] Twitter/X (design community)
- [ ] LinkedIn (professional network)
- [ ] Reddit (r/FigmaDesign)
- [ ] Product Hunt (if applicable)
- [ ] Design newsletters

### Content Ideas
- Tutorial blog post
- Video walkthrough
- Case study with example file
- "Making of" story
- Feature deep dives

## Success Metrics

Track these metrics after launch:
- Installs
- Active users
- Ratings and reviews
- Feature requests
- Bug reports
- Community engagement

## Support Plan

Prepare to handle:
- Bug reports (GitHub Issues)
- Feature requests (GitHub Discussions)
- Usage questions (FAQ in README)
- General inquiries (email)

Response time goal: Within 48 hours

## Updates and Iterations

Plan for post-launch updates:
- Bug fixes within days
- Minor features within weeks
- Major features within months
- Regular communication with users

## Resources

- [Figma Plugin Publishing Guide](https://help.figma.com/hc/en-us/articles/360042746093)
- [Figma Community Guidelines](https://help.figma.com/hc/en-us/articles/360040450353)
- [Plugin Best Practices](https://www.figma.com/plugin-docs/plugin-best-practices/)
