# RepoScore API

RepoScore exposes a single public analysis endpoint through RepoForge.

## Analyze a Repository

Request:

```bash
curl "https://repoforge.dev/api/analyze?repo=vercel/next.js"
```

Response shape:

```json
{
  "repo": "vercel/next.js",
  "repoType": "framework",
  "language": "javascript",
  "repoScore": 76,
  "scores": {
    "documentation": 55,
    "structure": 85,
    "discoverability": 55,
    "maintenance": 79,
    "adoption": 100,
    "agentSafety": null
  },
  "improvements": [
    "Document configuration, environment variables, or runtime options."
  ]
}
```

## Fields

- `repo`: normalized `owner/repo` identifier
- `repoType`: detected repository class used for score weighting
- `language`: primary language from GitHub metadata
- `repoScore`: overall weighted score
- `scores`: category-level results used in the final score
- `improvements`: short follow-up actions for maintainers

## Notes

- The API reads repository metadata, README content, package metadata, and file-tree structure.
- Analysis output is also used by RepoForge repository pages and RepoScore badges.
- AI-related repositories may include an `agentSafety` score when the repository type supports it.
