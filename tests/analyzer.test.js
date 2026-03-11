const assert = require('node:assert/strict');

const { detectRepoType } = require('../analyzer/repoTypeDetector');
const { computeRepoScore } = require('../scoring/scoreEngine');

const detectedType = detectRepoType({
  repoMetadata: {
    description: 'Analyze GitHub repositories and generate structured quality scores.',
    topics: ['repo-analysis', 'github-analysis', 'developer-tools'],
    language: 'JavaScript',
  },
  packageJson: {
    keywords: ['repo-analysis', 'repo-scoring', 'developer-tools'],
    scripts: {
      start: 'node server.js',
      test: 'node tests/analysis-smoke.test.js',
    },
    private: false,
  },
  readmeContent:
    'RepoScore analyzes repository documentation, structure, discoverability, maintenance, and agent safety signals.',
  fileTree: [
    { path: 'analyzer/readmeAnalyzer.js' },
    { path: 'api/analyze.js' },
    { path: 'scoring/scoreEngine.js' },
    { path: 'tests/analysis-smoke.test.js' },
  ],
});

assert.equal(detectedType, 'analysis-tool');

const scoring = computeRepoScore('analysis-tool', {
  documentation: { score: 100, improvements: [] },
  structure: { score: 85, improvements: [] },
  discoverability: { score: 80, improvements: [] },
  maintenance: { score: 56, improvements: [] },
  adoption: { score: 1, improvements: [] },
  agentSafety: null,
});

assert.equal(scoring.repoScore, 74);
assert.deepEqual(scoring.scores, {
  documentation: 100,
  structure: 85,
  discoverability: 80,
  maintenance: 56,
  adoption: 1,
  agentSafety: null,
});

console.log('RepoScore analyzer tests passed.');
