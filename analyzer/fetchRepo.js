'use strict';

const {
  getPackageManifest,
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

  const [readmeContent, treeResponse, packageJson] = await Promise.all([
    getReadmeContent(owner, repo),
    getRepositoryTree(owner, repo, defaultBranch),
    getPackageManifest(owner, repo, defaultBranch),
  ]);

  const fileTree = normalizeFileTree(treeResponse);

  return {
    owner,
    repo,
    repoMetadata,
    readmeContent: readmeContent || '',
    fileTree,
    packageJson,
  };
}

module.exports = {
  fetchRepositorySnapshot,
};
