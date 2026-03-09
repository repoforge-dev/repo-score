'use strict';

const { hasRepoCache } = require('../cache/repoCache');
const analyzeRoute = require('../api/analyze');
const { searchRepositories } = require('../utils/github');

const { buildRepoAnalysis } = analyzeRoute;

const SEARCH_QUERIES = [
  'stars:>500',
  'topic:ai',
  'topic:llm',
  'language:typescript',
  'language:python',
];

const MAX_REPOSITORIES_PER_RUN = 100;
const DEFAULT_PAGE_SIZE = 25;

function parseLimit() {
  const requestedLimit = Number.parseInt(process.env.GITHUB_SCANNER_LIMIT || `${MAX_REPOSITORIES_PER_RUN}`, 10);

  if (!Number.isFinite(requestedLimit) || requestedLimit <= 0) {
    return MAX_REPOSITORIES_PER_RUN;
  }

  return Math.min(requestedLimit, MAX_REPOSITORIES_PER_RUN);
}

async function discoverRepositories(limit) {
  const uniqueRepositories = new Map();

  for (const query of SEARCH_QUERIES) {
    if (uniqueRepositories.size >= limit) {
      break;
    }

    const remaining = limit - uniqueRepositories.size;
    const repositories = await searchRepositories(query, {
      perPage: Math.min(DEFAULT_PAGE_SIZE, remaining),
      page: 1,
      sort: 'stars',
      order: 'desc',
    });

    for (const repository of repositories) {
      const owner = repository?.owner?.login;
      const repo = repository?.name;

      if (!owner || !repo) {
        continue;
      }

      const key = `${owner}/${repo}`.toLowerCase();
      if (!uniqueRepositories.has(key)) {
        uniqueRepositories.set(key, { owner, repo });
      }

      if (uniqueRepositories.size >= limit) {
        break;
      }
    }
  }

  return [...uniqueRepositories.values()].slice(0, limit);
}

async function scanGitHubRepositories() {
  const limit = parseLimit();
  const repositories = await discoverRepositories(limit);

  let analyzedCount = 0;
  let skippedCount = 0;

  for (const repository of repositories) {
    const { owner, repo } = repository;
    const fullName = `${owner}/${repo}`;

    if (await hasRepoCache(owner, repo)) {
      skippedCount += 1;
      console.log(`Skipping ${fullName} (cached).`);
      continue;
    }

    console.log(`Analyzing ${fullName}...`);

    try {
      await buildRepoAnalysis(owner, repo);
      analyzedCount += 1;
    } catch (error) {
      console.error(`Failed to analyze ${fullName}: ${error.message}`);
    }
  }

  console.log(`Scanner finished. analyzed=${analyzedCount} skipped=${skippedCount} discovered=${repositories.length}`);
}

if (require.main === module) {
  scanGitHubRepositories().catch((error) => {
    console.error(`Scanner failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  MAX_REPOSITORIES_PER_RUN,
  SEARCH_QUERIES,
  discoverRepositories,
  scanGitHubRepositories,
};
