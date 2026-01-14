# Activity Histogram

## ADDED Requirements

### Requirement: Changelog Page Histogram

The plugin SHALL render an activity histogram at the top of the Changelog page.

#### Scenario: Histogram displays commit activity over time

- **WHEN** the Changelog page is rendered
- **THEN** a histogram frame appears at the top showing activity per commit
- **AND** the X-axis represents time (commit dates)
- **AND** the Y-axis represents activity volume

#### Scenario: Stacked bar representation

- **WHEN** rendering histogram bars
- **THEN** each bar has two stacked layers:
  - Blue layer representing feedback count (comments + annotations)
  - Orange layer representing work (absolute node delta)
- **AND** a legend below the chart explains the color coding

#### Scenario: Click bar to navigate

- **WHEN** the user clicks a histogram bar on the Changelog page
- **THEN** the viewport scrolls to the corresponding commit entry frame
- **AND** the commit entry frame is selected

#### Scenario: Bar labels on hover

- **WHEN** the user hovers over a histogram bar
- **THEN** Figma's native tooltip shows the version number
- **OR** a rendered label appears adjacent to the bar

### Requirement: Plugin UI Histogram

The plugin SHALL display an interactive histogram in the plugin sidebar.

#### Scenario: Histogram overview in plugin UI

- **WHEN** the user opens the plugin
- **THEN** the main view includes a histogram panel showing recent activity
- **AND** the histogram is rendered using Preact components

#### Scenario: Hover to preview commit

- **WHEN** the user hovers over a bar in the plugin UI histogram
- **THEN** a tooltip shows commit details (version, date, message preview)

#### Scenario: Click to navigate

- **WHEN** the user clicks a bar in the plugin UI histogram
- **THEN** the plugin navigates to that commit's entry on the Changelog page
- **AND** scrolls the viewport to show the entry

#### Scenario: Zoom and pan for large histories

- **WHEN** the file has many commits (more than fit in the visible area)
- **THEN** the plugin UI histogram supports horizontal scrolling
- **AND** optionally supports zoom gestures to adjust time scale

### Requirement: Histogram Data Calculation

The plugin SHALL calculate histogram metrics from commit data.

#### Scenario: Calculate feedback count

- **WHEN** computing histogram data for a commit
- **THEN** feedbackCount equals commentsCount plus annotationsCount

#### Scenario: Calculate work metric

- **WHEN** computing histogram data for a commit (after the first)
- **THEN** work equals the absolute value of nodesDelta
- **AND** nodesDelta is currentNodeCount minus previousNodeCount
- **WHERE** nodeCount is sum of frames, components, instances, and text nodes

#### Scenario: First commit has no delta

- **WHEN** computing histogram data for the first commit
- **THEN** work metric is zero (no previous commit to compare)
- **AND** only feedback count contributes to the bar height

### Requirement: Histogram Rendering Performance

The plugin SHALL render histograms efficiently for files with many commits.

#### Scenario: Limit visible bars on changelog page

- **WHEN** the file has more than 50 commits
- **THEN** the changelog page histogram shows the most recent 50 bars
- **AND** provides a visual indicator that older commits exist

#### Scenario: Virtualized rendering in plugin UI

- **WHEN** rendering the histogram in the plugin UI
- **THEN** only visible bars are rendered in the DOM
- **AND** scrolling dynamically loads additional bars
