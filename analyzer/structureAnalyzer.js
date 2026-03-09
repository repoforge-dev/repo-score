'use strict';

function getFilePaths(fileTree) {
  return Array.isArray(fileTree)
    ? fileTree.map((entry) => String(entry.path || '').toLowerCase()).filter(Boolean)
    : [];
}

function analyzeStructure(input) {
  const files = getFilePaths(input.fileTree);

  const hasSrcFolder = files.some((filePath) => filePath.startsWith('src/') || filePath.startsWith('lib/'));
  const hasTestFolder =
    files.some((filePath) => filePath.startsWith('test/') || filePath.startsWith('tests/') || filePath.includes('/__tests__/')) ||
    files.some((filePath) => /\.(spec|test)\.[a-z0-9]+$/i.test(filePath));
  const hasDocsFolder = files.some((filePath) => filePath.startsWith('docs/'));
  const hasLicenseFile = files.some((filePath) => /^license(\.|$)|^copying(\.|$)/i.test(filePath));
  const hasCiConfig = files.some((filePath) => {
    return (
      filePath.startsWith('.github/workflows/') ||
      filePath.startsWith('.circleci/') ||
      filePath === '.gitlab-ci.yml' ||
      filePath === 'azure-pipelines.yml'
    );
  });

  let score = 0;
  const improvements = [];

  if (hasSrcFolder) {
    score += 30;
  } else {
    improvements.push('Use a clear source layout such as `src/` or `lib/`.');
  }

  if (hasTestFolder) {
    score += 30;
  } else {
    improvements.push('Add a visible test suite or test directory.');
  }

  if (hasLicenseFile) {
    score += 15;
  } else {
    improvements.push('Add a LICENSE file to make usage terms explicit.');
  }

  if (hasDocsFolder) {
    score += 15;
  } else {
    improvements.push('Add a `docs/` directory for deeper project documentation.');
  }

  if (hasCiConfig) {
    score += 10;
  } else {
    improvements.push('Add CI automation for validation on pull requests and main branch changes.');
  }

  return {
    score,
    improvements,
  };
}

module.exports = {
  analyzeStructure,
};
