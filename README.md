# RepoScore

[![RepoScore](https://repoforge.dev/badge/repoforge-dev/repo-score)](https://repoforge.dev/repos/repoforge-dev/repo-score)

Analyze GitHub repositories and generate a structured quality score.

## What RepoScore Does

RepoScore evaluates repository quality from the signals developers actually use during adoption and review. It analyzes repository metadata, README quality, package metadata, and file-tree structure, then produces a score with actionable follow-up items.

The scoring pipeline covers:

- repository analysis for any public GitHub repository
- documentation scoring for onboarding quality
- structure analysis for source layout and project organization
- discoverability scoring for metadata, badges, topics, and docs links
- agent safety scoring for repositories that expose AI runtime or autonomous-agent behavior

RepoScore powers the analysis engine behind RepoForge and is intended to be explainable. The same analysis pipeline is used for the API response, the public repository page, and the badge output.

## Example Analysis

View the live RepoForge analysis page for RepoScore:

[https://repoforge.dev/repos/repoforge-dev/repo-score](https://repoforge.dev/repos/repoforge-dev/repo-score)

That page shows the current repository classification, overall score, category breakdown, and improvement suggestions generated from the live repository snapshot.

## Installation

```bash
git clone https://github.com/repoforge-dev/repo-score.git
cd repo-score
npm install
npm test
node server.js
```

RepoScore runs on Node.js 18 or newer.

## Usage

Analyze a repository through the public RepoForge API:

```bash
curl "https://repoforge.dev/api/analyze?repo=repoforge-dev/repo-score"
```

Example repository page:

```bash
curl "https://repoforge.dev/repos/repoforge-dev/repo-score"
```

Typical response fields:

- `repo`: normalized `owner/repo` identifier
- `repoType`: detected repository type
- `repoScore`: overall weighted score
- `scores`: category-level scores
- `improvements`: concise repository improvements

## How Scoring Works

RepoScore combines a fixed set of category analyzers:

- `documentation`: README quality, installation guidance, examples, API/reference coverage, configuration notes, and contribution guidance
- `structure`: source layout, tests, build configuration, formatting or lint configuration, and CI
- `discoverability`: topics, badges, repository description, homepage metadata, and documentation links
- `maintenance`: recent commits, releases, contributors, and visible issue activity
- `adoption`: stars, forks, and contributor signals
- `agentSafety`: safety documentation, guardrails, permission boundaries, and runtime limits for AI-related repositories

The final score is a weighted average based on the detected repository type. More detail is documented in [docs/scoring.md](./docs/scoring.md) and [docs/api.md](./docs/api.md).

## Badge

Add the RepoScore badge to a repository README:

```md
[![RepoScore](https://repoforge.dev/badge/repoforge-dev/repo-score)](https://repoforge.dev/repos/repoforge-dev/repo-score)
```

Example integration:

```md
[![RepoScore](https://repoforge.dev/badge/vercel/next.js)](https://repoforge.dev/repos/vercel/next.js)
```

## Contributing

Contributions should keep scoring behavior deterministic and explainable. Update tests when analyzer rules or weighting behavior changes, and keep repository-quality improvement messages concise and actionable.

Start with [CONTRIBUTING.md](./CONTRIBUTING.md). Supporting documentation lives in [docs/api.md](./docs/api.md), [docs/scoring.md](./docs/scoring.md), and [docs/architecture.md](./docs/architecture.md).

## License

MIT
