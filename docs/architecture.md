# RepoScore Architecture

RepoScore is organized as a direct HTTP service with a cache-backed analysis pipeline.

## Request Flow

1. `server.js` registers the public routes.
2. `api/analyze.js` builds or loads repository analysis.
3. Analyzer modules score documentation, structure, discoverability, maintenance, adoption, and AI-safety signals.
4. `scoring/scoreEngine.js` applies repository-type-specific weights.
5. `cache/repoCache.js` stores snapshots and derived analysis for reuse.
6. `api/repoPage.js` and `api/badge.js` expose the same analysis through HTML and badge endpoints.

## Directory Map

- `api/`: request handlers for analysis, badges, and hosted pages
- `analyzer/`: analyzer modules and repository-type detection
- `cache/`: read and write helpers for cached analysis payloads
- `data/`: cached repository analysis data
- `docs/`: contributor-facing architecture and operational notes
- `scanners/`: data refresh utilities
- `scoring/`: weighting profiles and score composition
- `tests/`: smoke tests for parsing and analyzer behavior
- `utils/`: small support helpers used by the service
