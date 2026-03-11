# RepoScore Scoring Model

RepoScore evaluates repositories across a fixed set of categories and combines them with a weighted average.

## Categories

### Documentation

Checks for a README, installation guidance, examples, API reference, configuration details, and contribution guidance.

### Structure

Looks for a clear source layout, test coverage, build configuration, formatting or linting configuration, and CI.

### Discoverability

Uses repository topics, badges, a description, homepage metadata, and documentation links to measure how easy the project is to find and evaluate.

### Maintenance

Measures recent activity, contributor breadth, releases, and visible issue response activity.

### Adoption

Uses GitHub stars, forks, and contributor count as ecosystem confidence signals.

### Agent Safety

Applies only to AI-related repositories. It checks for safety documentation, tool guardrails, runtime limits, and policy or approval boundaries.

## Weighting

RepoScore selects a weighting profile based on the detected repository type. Libraries, frameworks, developer tools, and AI tooling do not all emphasize the same categories.

The final score is a weighted average of the applicable categories, rounded to the nearest integer.

## Practical Use

RepoScore is designed to answer questions developers ask when evaluating a repository:

- Is the project documented well enough to onboard quickly?
- Is the repository structured clearly?
- Is the project easy to discover and understand from GitHub alone?
- Does the maintenance profile look active?
- Does the ecosystem show signs of use and contribution?
- If it is AI-related, are runtime guardrails and approval boundaries documented?
