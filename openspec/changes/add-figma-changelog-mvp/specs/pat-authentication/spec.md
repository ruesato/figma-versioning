# PAT Authentication

## ADDED Requirements

### Requirement: PAT Onboarding

The plugin SHALL guide users through Personal Access Token setup during first run.

#### Scenario: First-run onboarding flow

- **WHEN** the user runs the plugin for the first time
- **AND** no PAT is stored
- **THEN** the plugin displays an onboarding screen explaining PAT requirements
- **AND** provides a direct link to Figma's token generation page
- **AND** shows step-by-step instructions with required scopes

#### Scenario: User enters valid PAT

- **WHEN** the user enters a PAT in the onboarding form
- **AND** the token is valid and has required scopes
- **THEN** the plugin stores the token securely via `figma.clientStorage`
- **AND** proceeds to versioning mode selection
- **AND** displays a success confirmation

#### Scenario: User enters invalid PAT

- **WHEN** the user enters a PAT that is invalid or lacks required scopes
- **THEN** the plugin displays an error message explaining the issue
- **AND** does not proceed until a valid token is provided

#### Scenario: User skips PAT setup

- **WHEN** the user chooses to skip PAT setup
- **THEN** the plugin allows basic usage without comment capture
- **AND** displays a notice that some features are unavailable
- **AND** the user can add PAT later via settings

### Requirement: PAT Storage Security

The plugin SHALL store PAT securely using Figma's sandboxed storage.

#### Scenario: Secure token storage

- **WHEN** a valid PAT is provided
- **THEN** it is stored via `figma.clientStorage.setAsync()`
- **AND** is never exposed in plugin data, logs, or UI

#### Scenario: Token retrieval for API calls

- **WHEN** the plugin needs to make REST API requests
- **THEN** it retrieves the token from `figma.clientStorage.getAsync()`
- **AND** includes it in the Authorization header

### Requirement: PAT Management

The plugin SHALL allow users to update or remove their PAT via settings.

#### Scenario: Update PAT in settings

- **WHEN** the user opens settings and enters a new PAT
- **THEN** the plugin validates the new token
- **AND** replaces the stored token if valid
- **AND** displays confirmation of the update

#### Scenario: Remove PAT

- **WHEN** the user removes their PAT in settings
- **THEN** the plugin deletes the token from clientStorage
- **AND** REST API features become unavailable
- **AND** displays a notice about reduced functionality

### Requirement: Required PAT Scopes

The plugin SHALL require specific Figma PAT scopes for REST API features.

#### Scenario: Validate required scopes

- **WHEN** validating a PAT
- **THEN** the plugin checks for `file_comments:read` scope (for comment capture)
- **AND** checks for `files:read` scope (for version history access)
- **AND** rejects tokens missing required scopes with a clear error message
