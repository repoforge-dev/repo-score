# Contributing to RepoScore

RepoScore is a small analysis service, so changes should stay readable and easy to validate.

## Development Flow

1. Install dependencies with `npm install`.
2. Run `npm test`.
3. Start the service with `node server.js` if you need to inspect routes locally.
4. Keep analyzer logic deterministic and avoid hidden side effects.

## Pull Requests

- Explain the repository-quality problem you are addressing.
- Add or update tests when scoring logic or route behavior changes.
- Keep improvement messages actionable and short.
- Update docs when new routes, scoring inputs, or cache behavior changes.

## Project Layout

- `api/`: HTTP endpoints
- `analyzer/`: score inputs and repo-type detection
- `cache/`: cached repository payloads
- `data/`: analysis artifacts and cached fixtures
- `docs/`: architecture notes and contributor docs
- `scanners/`: external snapshot collection
- `scoring/`: weighted score composition
- `tests/`: smoke tests for core analysis behavior

## Reporting Changes

If you change scoring weights or analyzer heuristics, include a short explanation of expected score movement in the pull request description.
