# Changelog Rendering

## ADDED Requirements

### Requirement: Changelog Page Creation

The plugin SHALL create and maintain a dedicated Changelog page in the Figma file.

#### Scenario: First commit creates changelog page

- **WHEN** the user creates the first commit in a file
- **AND** no Changelog page exists
- **THEN** the plugin creates a new page named "Changelog"
- **AND** navigates the user to that page

#### Scenario: Changelog page already exists

- **WHEN** the user creates a commit
- **AND** a Changelog page already exists
- **THEN** the plugin adds the new entry to the existing page
- **AND** does not create a duplicate page

### Requirement: Commit Entry Rendering

The plugin SHALL render each commit as a Figma frame with structured content.

#### Scenario: Render commit entry frame

- **WHEN** a commit is created
- **THEN** the plugin generates a frame containing:
  - Version number (text, prominent)
  - Date and time (text)
  - Author name (text)
  - Commit message (text, body)
  - Captured comments (nested frames, if any)
  - Captured annotations (nested frames, if any)
- **AND** applies auto-layout for consistent spacing
- **AND** stores the frame's node ID in the commit record

#### Scenario: Apply theme-aware styling

- **WHEN** rendering commit entry frames
- **THEN** the plugin detects the current Figma theme (Light, Dark, FigJam)
- **AND** applies appropriate colors from design tokens
- **AND** uses consistent typography hierarchy

### Requirement: Changelog Layout

The plugin SHALL arrange commit entries in reverse chronological order.

#### Scenario: New commits appear at top

- **WHEN** a new commit is created
- **THEN** its entry frame is inserted at the top of the changelog
- **AND** the activity histogram appears above all entries
- **AND** existing entries maintain their relative order below

#### Scenario: Viewport scrolls to new entry

- **WHEN** a commit is successfully created
- **THEN** the plugin scrolls the Figma viewport to show the new entry
- **AND** selects the new entry frame

### Requirement: Comment and Annotation Display

The plugin SHALL display captured comments and annotations within commit entry frames.

#### Scenario: Display captured comments

- **WHEN** a commit has captured comments
- **THEN** each comment is rendered as a nested frame showing:
  - Author name
  - Timestamp
  - Comment text
  - Associated node reference (if pinned)
- **AND** comments are grouped under a "Comments" section heading

#### Scenario: Display captured annotations

- **WHEN** a commit has captured annotations
- **THEN** each annotation is rendered as a nested frame showing:
  - Label text
  - Node name or ID reference
- **AND** annotations are grouped under an "Annotations" section heading

#### Scenario: Empty sections are hidden

- **WHEN** a commit has no comments
- **THEN** the "Comments" section is omitted from the entry frame
- **AND** similarly for annotations
