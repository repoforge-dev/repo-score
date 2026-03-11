const assert = require('node:assert/strict');

const analyzeRoute = require('../api/analyze');
const { analyzeAdoption } = require('../analyzer/adoptionAnalyzer');
const { analyzeAgentSafety } = require('../analyzer/agentSafetyAnalyzer');
const { analyzeDiscoverability } = require('../analyzer/discoverabilityAnalyzer');
const { analyzeMaintenance } = require('../analyzer/maintenanceAnalyzer');
const { analyzeReadme } = require('../analyzer/readmeAnalyzer');
const { analyzeStructure } = require('../analyzer/structureAnalyzer');
const { detectRepoType } = require('../analyzer/repoTypeDetector');
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

assert.equal(lowAdoptionAnalysis.repoScore, 78);
assert.equal(lowAdoptionAnalysis.scores.adoption, 0);
assert.equal(lowAdoptionAnalysis.scores.agentSafety, null);

assert.equal(analyzeAdoption({ repoMetadata: { stargazers_count: 1500, forks_count: 200, contributor_count: 12 } }).score, 54);

assert.equal(
  analyzeStructure({
    fileTree: [
      { path: 'src/index.js' },
      { path: 'tests/app.test.js' },
      { path: 'package.json' },
      { path: '.eslintrc.json' },
      { path: '.github/workflows/ci.yml' },
    ],
    packageJson: { scripts: { lint: 'eslint .' } },
  }).score,
  100
);

assert.equal(
  analyzeDiscoverability({
    repoMetadata: {
      description: 'Well-documented repository quality analyzer for GitHub projects.',
      topics: ['github-analysis', 'developer-tools'],
      homepage: 'https://repoforge.dev',
    },
    readmeContent: '![CI](https://example.com/ci.svg)\n## Installation\n## Usage\n## API\nSee https://repoforge.dev/docs for full docs.',
    fileTree: [{ path: 'docs/architecture.md' }],
  }).score,
  100
);

assert.equal(
  analyzeMaintenance({
    repoMetadata: {
      updated_at: new Date().toISOString(),
      contributor_count: 10,
      recent_release_count: 2,
      last_release_at: new Date().toISOString(),
      recent_issue_activity_count: 6,
      last_issue_updated_at: new Date().toISOString(),
      archived: false,
    },
  }).score,
  100
);

assert.equal(
  analyzeAgentSafety(
    {
      readmeContent: 'Guardrails, tool permissions, runtime limits, and policy enforcement are documented.',
      fileTree: [{ path: 'src/enforcement/toolGuard.ts' }, { path: 'SECURITY.md' }],
    },
    'ai-tooling'
  ).score,
  100
);

assert.equal(
  detectRepoType({
    repoMetadata: {
      description: 'Analyze GitHub repositories and generate structured quality scores.',
      topics: ['developer-tools', 'repository-analysis'],
      language: 'JavaScript',
    },
    packageJson: {
      keywords: ['github-analysis', 'developer-tools', 'repo-quality'],
      scripts: {
        start: 'node server.js',
      },
      private: false,
    },
    readmeContent: 'Analyze repository quality and score documentation, maintenance, and discoverability.',
    fileTree: [{ path: 'analyzer/readmeAnalyzer.js' }, { path: 'scoring/scoreEngine.js' }],
  }),
  'analysis-tool'
);

assert.equal(
  detectRepoType({
    repoMetadata: {
      description: 'AI repository analysis and insights.',
      topics: ['ai', 'agent'],
      language: 'JavaScript',
    },
    packageJson: {
      keywords: ['ai', 'developer-tools'],
      private: false,
    },
    readmeContent: 'Analyze AI repositories and report quality signals for developers.',
    fileTree: [{ path: 'analyzer/readmeAnalyzer.js' }],
  }),
  'analysis-tool'
);

assert.equal(
  detectRepoType({
    repoMetadata: {
      description: 'Shared scripts and automation helpers for maintainers.',
      topics: ['ai', 'agent'],
      language: 'TypeScript',
    },
    packageJson: {
      keywords: ['ai', 'agent'],
      scripts: {
        test: 'node test.js',
      },
      private: false,
    },
    readmeContent: 'Developer utilities for repository maintenance.',
    fileTree: [{ path: 'scripts/release.js' }, { path: 'utils/logger.js' }],
  }),
  'developer-tool'
);

assert.equal(
  detectRepoType({
    repoMetadata: {
      description: 'A JavaScript library for building user interfaces.',
      topics: ['javascript', 'library', 'ui'],
      language: 'JavaScript',
    },
    packageJson: {
      private: true,
      workspaces: ['packages/*'],
      devDependencies: {
        yargs: '^17.0.0',
      },
      scripts: {
        build: 'node build.js',
      },
    },
    readmeContent: 'React is a JavaScript library for building user interfaces.',
    fileTree: [{ path: 'packages/react/index.js' }, { path: 'scripts/release/prompt-for-otp.js' }],
  }),
  'library'
);

assert.equal(
  detectRepoType({
    repoMetadata: {
      description: 'Runtime framework for autonomous agents.',
      topics: ['ai', 'agent-runtime'],
      language: 'TypeScript',
    },
    packageJson: {
      keywords: ['agent-runtime'],
      dependencies: {
        langgraph: '^1.0.0',
      },
      private: false,
    },
    readmeContent: 'Includes tool execution and autonomous execution for long-running agents.',
    fileTree: [
      { path: 'src/runtime/agent-runner.ts' },
      { path: 'src/tools/registry.ts' },
      { path: 'src/memory/store.ts' },
    ],
  }),
  'ai-agent-framework'
);

console.log('RepoScore smoke tests passed.');
