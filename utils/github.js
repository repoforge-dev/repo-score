'use strict';

const API_BASE_URL = 'https://api.github.com';
const API_VERSION = '2022-11-28';
const REQUEST_TIMEOUT_MS = Number.parseInt(process.env.GITHUB_TIMEOUT_MS || '10000', 10);

function buildHeaders(accept) {
  const headers = {
    Accept: accept || 'application/vnd.github+json',
    'User-Agent': 'RepoForge-RepoScore',
    'X-GitHub-Api-Version': API_VERSION,
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
}

function buildRepoPath(owner, repo) {
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
}

async function requestGitHub(pathname, options = {}) {
  const {
    accept,
    allowNotFound = false,
    responseType = 'json',
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${pathname}`, {
      headers: buildHeaders(accept),
      signal: controller.signal,
    });

    if (allowNotFound && response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const isRateLimited =
        response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0';

      let message = `GitHub API request failed with status ${response.status}.`;
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const body = await response.json().catch(() => null);
        if (body && typeof body.message === 'string' && body.message.trim()) {
          message = body.message.trim();
        }
      } else {
        const text = await response.text().catch(() => '');
        if (text.trim()) {
          message = text.trim();
        }
      }

      const error = new Error(isRateLimited ? 'GitHub API rate limit exceeded.' : message);
      error.status = isRateLimited ? 429 : response.status;
      throw error;
    }

    if (responseType === 'text') {
      return response.text();
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('GitHub API request timed out.');
      timeoutError.status = 504;
      throw timeoutError;
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getRepoMetadata(owner, repo) {
  const repository = await requestGitHub(buildRepoPath(owner, repo));

  return {
    name: repository.name,
    description: repository.description || '',
    stargazers_count: repository.stargazers_count || 0,
    forks_count: repository.forks_count || 0,
    watchers_count: repository.watchers_count || repository.subscribers_count || 0,
    open_issues_count: repository.open_issues_count || 0,
    language: repository.language || 'unknown',
    topics: Array.isArray(repository.topics) ? repository.topics : [],
    default_branch: repository.default_branch || 'HEAD',
    updated_at: repository.updated_at || null,
    homepage: repository.homepage || '',
    archived: Boolean(repository.archived),
  };
}

async function getReadmeContent(owner, repo) {
  const readme = await requestGitHub(`${buildRepoPath(owner, repo)}/readme`, {
    allowNotFound: true,
  });

  if (!readme || typeof readme.content !== 'string') {
    return '';
  }

  try {
    return Buffer.from(readme.content.replace(/\n/g, ''), 'base64').toString('utf8');
  } catch (_error) {
    return '';
  }
}

async function getRepositoryTree(owner, repo, ref) {
  return requestGitHub(`${buildRepoPath(owner, repo)}/git/trees/${encodeURIComponent(ref)}?recursive=1`, {
    allowNotFound: true,
  });
}

async function getPackageManifest(owner, repo, ref) {
  const manifest = await requestGitHub(
    `${buildRepoPath(owner, repo)}/contents/package.json?ref=${encodeURIComponent(ref)}`,
    { allowNotFound: true }
  );

  if (!manifest || typeof manifest.content !== 'string') {
    return null;
  }

  try {
    const buffer = Buffer.from(manifest.content.replace(/\n/g, ''), 'base64');
    return JSON.parse(buffer.toString('utf8'));
  } catch (_error) {
    return null;
  }
}

async function searchRepositories(query, options = {}) {
  const perPage = Math.min(Math.max(Number.parseInt(options.perPage || '25', 10), 1), 100);
  const page = Math.max(Number.parseInt(options.page || '1', 10), 1);
  const sort = options.sort || 'stars';
  const order = options.order || 'desc';
  const encodedQuery = encodeURIComponent(query);

  const response = await requestGitHub(
    `/search/repositories?q=${encodedQuery}&sort=${encodeURIComponent(sort)}&order=${encodeURIComponent(order)}&per_page=${perPage}&page=${page}`
  );

  return Array.isArray(response?.items) ? response.items : [];
}

module.exports = {
  getPackageManifest,
  getReadmeContent,
  getRepoMetadata,
  getRepositoryTree,
  searchRepositories,
};
