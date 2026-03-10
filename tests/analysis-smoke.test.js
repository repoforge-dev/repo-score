const assert = require('node:assert/strict');

const analyzeRoute = require('../api/analyze');
const { analyzeAdoption } = require('../analyzer/adoptionAnalyzer');
const { analyzeReadme } = require('../analyzer/readmeAnalyzer');
const { computeRepoScore } = require('../scoring/scoreEngine');

assert.deepEqual(analyzeRoute.parseRepositoryInput('repoforge-dev/repo-score'), {
  owner: 'repoforge-dev',
  repo: 'repo-score',
  fullName: 'repoforge-dev/repo-score',
});

assert.throws(() => analyzeRoute.parseRepositoryInput('not-a-valid-repo'), /owner\/repo/);

const result = analyzeReadme({
  readmeContent: [
    '# Example',
    'This repository explains setup, usage, architecture, and contribution flow for developers who need a clear onboarding path.',
    '## Installation',
    'Install it with npm and configure the environment before running local analysis commands.',
    '## Quickstart',
    'Use it to analyze repositories quickly with a short walkthrough and concrete output.',
    '## API',
    'Reference the API route, response fields, configuration details, and supported repository input format.',
    '## Contributing',
    'Open a pull request with tests, documentation updates, and a concise explanation of the scoring change.',
    '## License',
    'MIT.',
  ].join('\n'),
});

assert.equal(result.score >= 90, true);
assert.equal(
  result.improvements.includes('Document installation or setup steps in the README.'),
  false
);
assert.equal(
  result.improvements.includes('Add concrete usage examples or a quickstart section.'),
  false
);

const lowAdoptionAnalysis = computeRepoScore('library', {
  documentation: { score: 95, improvements: [] },
  structure: { score: 92, improvements: [] },
  discoverability: { score: 90, improvements: [] },
  maintenance: { score: 88, improvements: [] },
  adoption: { score: 0, improvements: [] },
  agentSafety: null,
});

assert.equal(lowAdoptionAnalysis.repoScore, 92);
assert.equal(lowAdoptionAnalysis.scores.adoption, 0);
assert.equal(lowAdoptionAnalysis.scores.agentSafety, null);

assert.equal(
  analyzeAdoption({
    repoMetadata: {
      stargazers_count: 1500,
    },
  }).score,
  15
);

console.log('RepoScore smoke tests passed.');
