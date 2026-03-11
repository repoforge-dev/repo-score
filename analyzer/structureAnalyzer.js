'use strict';

function getFilePaths(fileTree) {
  return Array.isArray(fileTree)
    ? fileTree.map((entry) => String(entry.path || '').toLowerCase()).filter(Boolean)
    : [];
}

function analyzeStructure(input) {
  const files = getFilePaths(input.fileTree);
  const packageJson = input.packageJson || null;

  const hasSourceStructure = files.some((filePath) =>
    ['src/', 'lib/', 'packages/', 'api/', 'app/', 'client/', 'server/', 'cmd/', 'include/'].some((prefix) => filePath.startsWith(prefix))
  );
  const hasTestFolder =
    files.some((filePath) => filePath.startsWith('test/') || filePath.startsWith('tests/') || filePath.includes('/__tests__/')) ||
    files.some((filePath) => /\.(spec|test)\.[a-z0-9]+$/i.test(filePath));
  const hasBuildConfig =
    Boolean(packageJson) ||
    files.some((filePath) =>
      [
        'package.json',
        'package-lock.json',
        'pnpm-lock.yaml',
        'yarn.lock',
        'pyproject.toml',
        'requirements.txt',
        'cargo.toml',
        'makefile',
        'dockerfile',
        'vite.config',
        'webpack.config',
        'tsconfig.json',
      ].some((marker) => filePath === marker || filePath.endsWith(`/${marker}`))
    );
  const hasLintingConfig = files.some((filePath) =>
    [
      '.eslintrc',
      'eslint.config',
      '.prettierrc',
      'prettier.config',
      '.editorconfig',
      'ruff.toml',
      'setup.cfg',
    ].some((marker) => filePath.includes(marker))
  ) || Object.keys(packageJson?.scripts || {}).some((script) => script.includes('lint') || script.includes('format'));
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

  if (hasSourceStructure) {
    score += 25;
  } else {
    improvements.push('Use a clear source layout such as `src/` or `lib/`.');
  }

  if (hasTestFolder) {
    score += 20;
  } else {
    improvements.push('Add a visible test suite or test directory.');
  }

  if (hasBuildConfig) {
    score += 20;
  } else {
    improvements.push('Add package manager or build configuration files so project setup is explicit.');
  }

  if (hasLintingConfig) {
    score += 10;
  } else {
    improvements.push('Add linting or formatting configuration to make code standards explicit.');
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
