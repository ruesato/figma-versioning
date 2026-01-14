# Commit Management

## ADDED Requirements

### Requirement: Create Commit

The plugin SHALL allow users to create a commit that captures the current state of the Figma file with a descriptive message.

#### Scenario: User creates a commit with semantic versioning

- **WHEN** the user enters a commit message and selects "Minor" version increment
- **THEN** the plugin creates a commit with the next minor version number (e.g., v1.2.0 -> v1.3.0)
- **AND** the commit includes the message, author name, and timestamp
- **AND** the plugin calls `figma.saveVersionHistoryAsync()` to sync with Figma's native version history

#### Scenario: User creates a commit with date-based versioning

- **WHEN** the user enters a commit message in date-based versioning mode
- **THEN** the plugin creates a commit with today's date (YYYY-MM-DD format)
- **AND** if a commit already exists for today, appends a sequence suffix (e.g., 2026-01-15.2)

#### Scenario: Commit message validation

- **WHEN** the user attempts to create a commit with an empty message
- **THEN** the plugin displays an error and prevents commit creation
- **AND** the commit message input is limited to 500 characters

### Requirement: Versioning Mode Selection

The plugin SHALL support two versioning modes that the user selects during initial setup.

#### Scenario: User selects semantic versioning mode

- **WHEN** the user chooses semantic versioning during onboarding
- **THEN** commits display as Major.Minor.Patch format (e.g., v1.2.3)
- **AND** each commit prompts the user to select Major, Minor, or Patch increment

#### Scenario: User selects date-based versioning mode

- **WHEN** the user chooses date-based versioning during onboarding
- **THEN** commits display as YYYY-MM-DD format
- **AND** same-day commits auto-increment with a sequence suffix

#### Scenario: User changes versioning mode

- **WHEN** the user changes versioning mode in settings
- **THEN** new commits use the new mode
- **AND** existing commits retain their original version format

### Requirement: Comment Capture

The plugin SHALL automatically capture Figma comments created since the previous commit.

#### Scenario: Comments exist since last commit

- **WHEN** the user creates a commit
- **AND** comments have been added to the file since the previous commit
- **THEN** the plugin fetches those comments via the Figma REST API
- **AND** includes author, timestamp, text content, and associated node ID (if pinned)
- **AND** stores the comments with the commit record

#### Scenario: No comments since last commit

- **WHEN** the user creates a commit
- **AND** no new comments exist since the previous commit
- **THEN** the commit is created with an empty comments array

#### Scenario: REST API unavailable

- **WHEN** the user creates a commit
- **AND** the Figma REST API is unavailable or rate-limited
- **THEN** the plugin creates the commit without comments
- **AND** displays a warning that comment capture was skipped

### Requirement: Annotation Capture

The plugin SHALL automatically capture Dev Mode annotations from the current page at commit time.

#### Scenario: Annotations exist on current page

- **WHEN** the user creates a commit
- **AND** nodes on the current page have annotations
- **THEN** the plugin traverses nodes and collects `node.annotations` data
- **AND** includes label text and pinned properties with the commit record

#### Scenario: No annotations on current page

- **WHEN** the user creates a commit
- **AND** no nodes on the current page have annotations
- **THEN** the commit is created with an empty annotations array

### Requirement: Activity Metrics Collection

The plugin SHALL capture node count metrics at each commit for activity tracking.

#### Scenario: First commit captures baseline metrics

- **WHEN** the user creates the first commit in a file
- **THEN** the plugin counts frames, components, instances, and text nodes on the current page
- **AND** stores these counts as the commit's baseline metrics

#### Scenario: Subsequent commits capture delta metrics

- **WHEN** the user creates a commit after the first
- **THEN** the plugin counts current nodes and calculates deltas from the previous commit
- **AND** computes `feedbackDelta` (comments + annotations count)
- **AND** computes `nodesDelta` (net change in total node count)

#### Scenario: Node counting uses performance optimizations

- **WHEN** the plugin counts nodes
- **THEN** it sets `figma.skipInvisibleInstanceChildren = true`
- **AND** uses `findAllWithCriteria({ types: [...] })` instead of callback-based `findAll`
- **AND** only traverses the current page (not all pages)

### Requirement: Commit Data Persistence

The plugin SHALL store commit data in Figma's plugin data storage with chunking for large histories.

#### Scenario: Commits stored within size limits

- **WHEN** commits are saved
- **THEN** they are stored as JSON in plugin data keys
- **AND** chunked across multiple keys if total size approaches 100KB per key

#### Scenario: Archive old commits

- **WHEN** total commit storage exceeds threshold
- **THEN** older commits are compressed and moved to an archive key
- **AND** archive retains essential metadata (version, date, message) but drops full comment/annotation text
