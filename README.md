# RepoScore

![RepoScore](https://repoforge.dev/badge/repoforge-dev/repo-score?v=20260310-0212)

RepoScore analyzes GitHub repositories and produces a structured quality score for documentation, structure, maintenance, discoverability, and adoption.

## What This Project Does

RepoScore gives developers a fast way to inspect a repository before they depend on it, contribute to it, or recommend it to a team. It reads repository metadata, README content, package metadata, and file layout, then generates a weighted score with category breakdowns and improvement suggestions.

The project is built for maintainers, platform engineers, engineering managers, developer relations teams, and AI-assisted coding workflows that need a quick view of repository quality. Instead of reducing a project to stars alone, RepoScore highlights the signals that affect actual onboarding: installation clarity, examples, folder structure, active maintenance, and discoverability.

## Why It Exists

Open source evaluation is usually manual and inconsistent. A repository can look active from a distance and still be difficult to install, poorly documented, or missing the signals that help contributors understand how it is organized. That slows down adoption and creates friction for new maintainers and downstream users.

RepoScore exists to make that first-pass evaluation repeatable. It turns common developer questions into concrete checks: Is the README usable? Is the structure obvious? Does the repository look maintained? Are there enough metadata signals to find it and trust it? The result is not a ranking system for vanity metrics. It is a practical review layer that helps maintainers find missing pieces and helps developers decide whether a repository is ready for use.

## Quickstart

The fastest way to use RepoScore is through the hosted RepoForge interface:

1. Open [repoforge.dev](https://repoforge.dev).
2. Enter a GitHub repository in `owner/repo` format.
3. Open the generated analysis page to review the score, category breakdown, and improvement suggestions.

If you want to fetch structured output directly, use the public analysis endpoint:

```bash
curl "https://repoforge.dev/api/analyze?repo=vercel/next.js"
```

The JSON response includes the detected repository type, the overall `repoScore`, per-category scores, and improvement suggestions that can be applied directly in the target repository.

## Example

Real public analysis pages:

- [vercel/next.js](https://repoforge.dev/repos/vercel/next.js)
- [repoforge-dev/authority-layer](https://repoforge.dev/repos/repoforge-dev/authority-layer)

Example hosted analysis request for a public repository page:

```bash
curl "https://repoforge.dev/repos/vercel/next.js"
```

That request returns the public analysis page for `vercel/next.js`. For machine-readable output, call the JSON endpoint instead:

```bash
curl "https://repoforge.dev/api/analyze?repo=vercel/next.js"
```

The response contains:

- `repo`: normalized `owner/repo` identifier
- `repoType`: the detected repository classification
- `repoScore`: weighted overall score
- `scores`: category-level scores such as documentation and maintenance
- `improvements`: short, actionable follow-up items

RepoScore uses the same analysis pipeline for the API, badges, and hosted analysis pages so the output stays consistent across interfaces.

## How It Works

RepoScore is a small Node service with a direct request path and a cache-backed scoring pipeline.

- `api/` contains the HTTP routes for JSON analysis, badges, and hosted repository pages.
- `analyzer/` contains the scoring inputs for README quality, structure, discoverability, maintenance, adoption, repository type, and AI-safety-specific checks.
- `scanners/` holds data collection utilities for refreshing repository snapshots.
- `scoring/` combines analyzer results with a profile-specific weighting model.
- `cache/` stores normalized cached snapshots so repeated analysis stays fast.
- `data/` contains repository analysis artifacts that can be reused for page rendering and debugging.
- `utils/` contains support code used by the API and GitHub fetch flow.
- `src/` is reserved for service-side source layout as the project grows beyond the current route-first shape.

RepoScore does not clone and execute arbitrary repository code as part of the scoring path. It evaluates repository metadata, README content, package metadata, and file-tree structure, which keeps the analysis deterministic and avoids requiring repository secrets or runtime approval. That boundary matters for security, for repeatable evaluation, and for predictable CI validation.

## Use Cases

- Evaluate a dependency before adopting it in production.
- Review an internal repository before handing it to another team.
- Generate a public repository page with a score breakdown and improvement list.
- Add a badge to a README so maintainers can expose a live quality signal.
- Identify missing onboarding steps before announcing or open-sourcing a project.
- Surface repository quality signals that help AI agents and code assistants navigate a project more reliably.

## Installation

RepoScore runs on Node.js 18 or newer.

```bash
git clone https://github.com/repoforge-dev/repo-score.git
cd repo-score
npm install
npm test
node server.js
```

The local server exposes the analysis API, badge endpoint, and hosted repository page renderer. For contributor workflows, the test suite covers route parsing and score-analysis smoke checks, and CI runs the same commands on pushes and pull requests.

## Why RepoScore Matters

Many GitHub repositories have thousands of stars but still lack strong documentation, onboarding clarity, or discoverability.

RepoScore automatically analyzes repositories and identifies practical improvements that make projects easier for developers and AI agents to use.

## RepoScore

Badge:

```md
![RepoScore](https://repoforge.dev/badge/repoforge-dev/repo-score?v=20260310-0212)
```

Analysis pages:

- [repoforge-dev/repo-score](https://repoforge.dev/repos/repoforge-dev/repo-score)
- [repoforge-dev/authority-layer](https://repoforge.dev/repos/repoforge-dev/authority-layer)

The public badge and page endpoints use the same scoring output as the analysis API, so maintainers can publish a compact signal in a README and link to a full breakdown when more context is needed.

## Contributing

Contributions should keep the analysis model explainable and easy to inspect. Prefer small changes with test coverage, document any scoring-rule updates in the relevant analyzer or architecture notes, and verify the impact on output before opening a pull request.

Start with [CONTRIBUTING.md](./CONTRIBUTING.md). The repository includes a lightweight test suite, CI validation, cache-backed fixtures, and supporting documentation in `docs/` so contributors can extend analyzers without guessing how the pipeline fits together.

## License

MIT. See [LICENSE](./LICENSE).
