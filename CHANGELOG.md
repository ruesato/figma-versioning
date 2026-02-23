# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.1] - 2026-02-22

### Added

- **Dev status change tracking** — Changelog entries on the Figma canvas now include a "Dev Status" section showing which layers had their Figma Dev Mode status changed since the previous commit. Each entry is formatted as `[pageName] / [layerName]: [statusChange]` and covers transitions to/from *Ready for Dev* and *Completed*. Clicking a layer name navigates directly to that layer on the canvas.

- **Trend Insights panel** — A new analytics panel is rendered on the Changelog page alongside the entry list. It surfaces actionable signals from your commit history:
  - *File growth* — tracks total node count over time and flags rapid growth or stagnation periods
  - *Frame churn* — identifies frames that are frequently added and removed (high-churn hotspots)
  - *Most active layers* — lists the frames that appear most often across commits, indicating design areas under heavy iteration
  - Labels and period classifications (e.g. "High Activity", "Mature") use human-readable language rather than raw counts

### Fixed

- **Annotation property values** — Pinned annotation properties in changelog entries now correctly read live values from the Figma node (e.g. width, fills, corner radius) rather than the annotation metadata object, which was always empty. Properties that no longer exist on the node are gracefully skipped.

- **Annotation category display** — The `category` field from Dev Mode annotations is now shown as a property row in changelog entries.

- **Trend Insights rendering**
  - Removed a duplicate "Most Active Layers" chart that appeared when insights were re-rendered
  - High-Churn Frames list now correctly shows the page name alongside the frame name
  - Fixed clipped section frames caused by setting `primaryAxisSizingMode` before `resize()`
  - Repositioned the panel to `(-900, 400)` to avoid overlapping the Changelog Entries container

---

## [1.0.0] - 2026-01-20

### Added

- Initial release of the Figma Versioning plugin
- Semantic versioning (major/minor/patch) and date-based versioning modes
- Commit form with title, description, and version increment selection
- Comment capture via Figma REST API (requires Personal Access Token)
- Dev Mode annotation capture with pinned property display
- Activity metrics per commit (total nodes, frames, components, instances, text nodes)
- Visual changelog entries rendered as frames on a dedicated "Changelog" page
- Histogram visualization of commit activity over time with click-to-navigate
- Chunked storage in `figma.clientStorage` with `sharedPluginData` backup
- PAT management UI (validate, store, remove)
- Changelog rebuild command to regenerate all entries from stored commits
