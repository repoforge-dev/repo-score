# RepoScore

Analyze any GitHub repository and generate a structured quality score.

RepoScore evaluates documentation, structure, maintenance activity, discoverability signals, and adoption metrics to help developers quickly understand repository quality.

Analyze any repository instantly:

https://repoforge.dev

RepoScore powers the analysis engine behind RepoForge.

https://repoforge.dev

---

## Example

Example Repository Analysis

Repository:

repoforge-dev/authority-layer

View the analysis page:

https://repoforge.dev/repos/repoforge-dev/authority-layer

Example response:

```json
{
  "repo": "repoforge-dev/authority-layer",
  "repoType": "ai-tooling",
  "language": "typescript",
  "repoScore": 65,
  "scores": {
    "documentation": 100,
    "structure": 40,
    "discoverability": 85,
    "maintenance": 75,
    "adoption": 0,
    "agentSafety": 65
  },
  "improvements": [
    "Explain how agent or LLM behaviors are evaluated before release.",
    "Describe permissions, sandboxing, or approval boundaries for automation.",
    "Explain how contributors can run, test, and contribute to the project.",
    "Use a clear source layout such as `src/` or `lib/`.",
    "Add a visible test suite or test directory.",
    "Grow adoption and contribution signals to improve maintenance confidence.",
    "Increase project visibility and usage signals to strengthen adoption confidence.",
    "Set a homepage or docs URL in the repository metadata."
  ],
  "analyzedAt": "2026-03-09T23:53:17.722Z"
}
```

---

## What RepoScore Measures

RepoScore evaluates repositories across multiple dimensions.

Documentation
Quality of README content, examples, and usage instructions.

Structure
Repository organization and project layout.

Maintenance
Commit activity, issue backlog, and repository updates.

Discoverability
GitHub topics, metadata, and repository signals.

Adoption
Stars, forks, and ecosystem usage indicators.

Some repository types may also include additional signals depending on classification.

---

## Repo Analysis Pages

RepoForge automatically generates repository analysis pages.

Example:

https://repoforge.dev/repos/repoforge-dev/authority-layer

These pages show:

RepoScore
Repository type
Score breakdown
Improvement suggestions
Badge integration

---

## Add the RepoScore Badge

Add RepoScore to your repository README.

Markdown:

```md
![RepoScore](https://repoforge.dev/badge/owner/repo)
```

Example:

```md
![RepoScore](https://repoforge.dev/badge/vercel/next.js)
```

---

## Development

Clone the repository:

```bash
git clone https://github.com/repoforge-dev/repo-score.git
```

Install dependencies:

```bash
npm install
```

Run locally:

```bash
node server.js
```

---

## Roadmap

* Expand repository dataset scanning
* Improve repository classification
* Improve scoring model accuracy
* Expand improvement suggestions
* AuthorityLayer integration

---

## RepoForge

RepoScore is part of RepoForge.

RepoForge builds developer infrastructure for analyzing, securing, and monetizing open source repositories.

https://repoforge.dev
