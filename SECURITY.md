# Security Notes

RepoScore is designed to analyze repository metadata and documentation without executing untrusted repository code.

## Analysis Boundary

- RepoScore evaluates README content, repository metadata, package metadata, and file-tree structure.
- RepoScore does not require repository secrets to produce a score.
- RepoScore does not run arbitrary code from analyzed repositories as part of the scoring path.

## Responsible Disclosure

If you find a security issue in RepoScore itself, report it privately to the maintainers before opening a public issue.

## Operational Guidance

When adding new analyzers or scanners, keep permission boundaries explicit. Prefer read-only GitHub data sources, avoid hidden network side effects, and document any new access requirements in the relevant module and contributor docs.
