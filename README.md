# RepoScore

Analyze any GitHub repository and generate a structured quality score.

RepoScore evaluates documentation, structure, maintenance activity, discoverability signals, and adoption metrics to help developers quickly understand repository quality.

RepoScore powers the analysis engine behind RepoForge.

https://repoforge.dev

---

## Example

AuthorityLayer repository analysis example:

GET

/api/analyze?repo=repoforge-dev/authority-layer

Example response:

```json
{
  "repo": "repoforge-dev/authority-layer",
  "repoType": "ai-tooling",
  "language": "typescript",
  "repoScore": 86,
  "scores": {
    "documentation": 88,
    "structure": 85,
    "maintenance": 82,
    "discoverability": 80,
    "adoption": 75
  }
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

Server runs on:

http://localhost:3000

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
