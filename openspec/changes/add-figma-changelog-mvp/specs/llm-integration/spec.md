# LLM Integration

## ADDED Requirements

### Requirement: LLM Endpoint Configuration

The plugin SHALL support configurable LLM endpoints for AI features.

#### Scenario: Configure Claude API endpoint

- **WHEN** the user configures LLM settings
- **THEN** they can enter an API endpoint URL and API key
- **AND** the plugin supports Claude API-compatible request format

#### Scenario: Support multiple LLM backends

- **WHEN** configuring LLM endpoint
- **THEN** the plugin supports Anthropic Claude API, Ollama, LM Studio, and corporate proxy endpoints
- **AND** any Claude API-compatible endpoint works

#### Scenario: LLM configuration is optional

- **WHEN** the user does not configure an LLM endpoint
- **THEN** AI features (summaries, queries) are disabled
- **AND** core plugin functionality remains available

### Requirement: Weekly Summary Generation

The plugin SHALL generate AI-powered weekly summaries of commit activity.

#### Scenario: Generate weekly summary

- **WHEN** the user requests a weekly summary
- **THEN** the plugin collects commits from the past 7 days
- **AND** sends them to the configured LLM endpoint with a summary prompt
- **AND** displays the generated summary in the plugin UI

#### Scenario: No commits in period

- **WHEN** the user requests a weekly summary
- **AND** no commits exist in the past 7 days
- **THEN** the plugin displays a message indicating no activity

#### Scenario: LLM request fails

- **WHEN** summary generation fails (network error, rate limit, etc.)
- **THEN** the plugin displays an error message
- **AND** suggests checking LLM configuration

### Requirement: Monthly Summary Generation

The plugin SHALL generate AI-powered monthly summaries of commit activity.

#### Scenario: Generate monthly summary

- **WHEN** the user requests a monthly summary
- **THEN** the plugin collects commits from the past 30 days
- **AND** sends them to the configured LLM endpoint with a summary prompt
- **AND** displays the generated summary in the plugin UI

### Requirement: Natural Language Query

The plugin SHALL support natural language querying of changelog history.

#### Scenario: Query changelog with natural language

- **WHEN** the user enters a query like "What changed with the checkout flow in December?"
- **THEN** the plugin searches commits for relevant entries
- **AND** sends matching commits to the LLM with the query
- **AND** displays the AI-generated answer

#### Scenario: Keyword pre-filtering

- **WHEN** processing a natural language query
- **THEN** the plugin first performs keyword search on commit messages, comments, and annotations
- **AND** sends only relevant commits to the LLM to reduce token usage

#### Scenario: No matching commits

- **WHEN** no commits match the query keywords
- **THEN** the plugin displays a message indicating no relevant commits found
- **AND** does not make an LLM request

### Requirement: LLM Prompt Templates

The plugin SHALL use consistent prompt templates for LLM requests.

#### Scenario: Summary prompt template

- **WHEN** generating a summary
- **THEN** the plugin uses a structured prompt template from the shared core package
- **AND** includes commit data as context

#### Scenario: Query prompt template

- **WHEN** processing a natural language query
- **THEN** the plugin uses a structured prompt template designed for Q&A
- **AND** includes relevant commits as context
