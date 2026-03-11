'use strict';

const {
  getContributorCount,
  getIssueActivitySignals,
  getPackageManifest,
  getReleaseSignals,
  getReadmeContent,
  getRepoMetadata,
  getRepositoryTree,
} = require('../utils/github');

function normalizeFileTree(treeResponse) {
  const tree = Array.isArray(treeResponse?.tree) ? treeResponse.tree : [];

  return tree
    .filter((entry) => entry && typeof entry.path === 'string')
    .map((entry) => ({
      path: entry.path,
      type: entry.type || 'blob',
    }));
}

async function fetchRepositorySnapshot(owner, repo) {
  const repoMetadata = await getRepoMetadata(owner, repo);
  const defaultBranch = repoMetadata.default_branch || 'HEAD';

  const [readmeContent, treeResponse, packageJson, contributorCount, releaseSignals, issueActivitySignals] = await Promise.all([
    getReadmeContent(owner, repo),
    getRepositoryTree(owner, repo, defaultBranch),
    getPackageManifest(owner, repo, defaultBranch),
    getContributorCount(owner, repo),
    getReleaseSignals(owner, repo),
    getIssueActivitySignals(owner, repo),
  ]);

  const fileTree = normalizeFileTree(treeResponse);

  return {
    owner,
    repo,
    repoMetadata: {
      ...repoMetadata,
      contributor_count: contributorCount,
      recent_release_count: releaseSignals.recent_release_count,
      last_release_at: releaseSignals.last_release_at,
      recent_issue_activity_count: issueActivitySignals.recent_issue_activity_count,
      last_issue_updated_at: issueActivitySignals.last_issue_updated_at,
    },
    readmeContent: readmeContent || '',
    fileTree,
    packageJson,
  };
}

module.exports = {
  fetchRepositorySnapshot,
};
