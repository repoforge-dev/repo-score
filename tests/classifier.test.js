'use strict';
/**
 * Regression test suite for repoTypeDetector.js
 * 
 * Validates that all cached repos classify correctly against their stored label.
 * Add new test cases here when onboarding new repos or fixing classification bugs.
 * 
 * Run: node tests/classifier.test.js
 */
const fs = require('fs');
const path = require('path');
const { detectRepoType } = require('../analyzer/repoTypeDetector');

const REPOS_DIR = path.join(__dirname, '../data/repos');

// ─── Named regression fixtures (high confidence ground truth) ────────────────
const EXPECTED = {
    // Libraries
    'axios/axios': 'cli-tool',       // has bin/ + cli signals
    'facebook/react': 'library',
    'lodash/lodash': 'library',
    'pandas-dev/pandas': 'library',
    'scikit-learn/scikit-learn': 'library',
    'vuejs/vue': 'framework',
    'yargs/yargs': 'library',

    // Frameworks
    'nestjs/nest': 'framework',
    'vercel/next.js': 'framework',

    // Language tooling
    'microsoft/TypeScript': 'language-tooling',

    // SDKs
    'openai/openai-python': 'sdk',

    // CLI tools
    'cli/cli': 'cli-tool',
    'openclaw/openclaw': 'cli-tool',

    // AI tooling
    'huggingface/transformers': 'ai-tooling',
    'repoforge-dev/authority-layer': 'ai-tooling',

    // AI agent framework
    'langchain-ai/langchain': 'ai-agent-framework',

    // Analysis tool
    'repoforge-dev/repo-score': 'analysis-tool',

    // Applications
    'kamranahmedse/developer-roadmap': 'application',

    // Learning platforms
    'freeCodeCamp/freeCodeCamp': 'learning-platform',

    // Learning resources
    'jwasham/coding-interview-university': 'learning-resource',
    'ossu/computer-science': 'learning-resource',
    'TheAlgorithms/Python': 'learning-resource',
    'trekhleb/javascript-algorithms': 'learning-resource',
    'donnemartin/system-design-primer': 'learning-resource',
    'codecrafters-io/build-your-own-x': 'learning-resource',
    'practical-tutorials/project-based-learning': 'learning-resource',

    // Reference lists
    '996icu/996.ICU': 'reference',
    'awesome-selfhosted/awesome-selfhosted': 'reference',
    'EbookFoundation/free-programming-books': 'reference',
    'sindresorhus/awesome': 'reference',
    'trimstray/the-book-of-secret-knowledge': 'reference',
    'vinta/awesome-python': 'reference',

    // Datasets
    'public-apis/public-apis': 'dataset',

    // System projects
    'torvalds/linux': 'system-project',
};

// ─── Test runner ─────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

// Test from named fixture list
for (const [repo, expected] of Object.entries(EXPECTED)) {
    const slug = repo.replace('/', '-').toLowerCase().replace(/\./g, '');
    const candidates = fs.readdirSync(REPOS_DIR).filter(f =>
        f.replace(/\.json$/, '').toLowerCase() === slug.toLowerCase() ||
        f.replace(/\.json$/, '').toLowerCase().replace(/-/g, '/').includes(repo.split('/')[1].toLowerCase().slice(0, 8))
    );

    // Find the right file
    const file = fs.readdirSync(REPOS_DIR).find(f => {
        const base = f.replace(/\.json$/, '');
        const [owner, repoName] = repo.toLowerCase().split('/');
        return base.startsWith(owner.replace(/[^a-z0-9]/g, '-').toLowerCase()) &&
            base.includes(repoName.replace(/[^a-z0-9]/g, '-').toLowerCase().slice(0, 15));
    });

    if (!file) {
        console.log(`  SKIP  ${repo} (no cached data)`);
        continue;
    }

    const cache = JSON.parse(fs.readFileSync(path.join(REPOS_DIR, file), 'utf8'));
    const snap = cache.snapshot || {};
    const detected = detectRepoType({
        fileTree: snap.fileTree || [],
        readmeContent: snap.readmeContent || '',
        repoMetadata: snap.repoMetadata || {},
        packageJson: snap.packageJson || null,
    });

    if (detected === expected) {
        passed++;
        console.log(`  PASS  ${repo.padEnd(45)} → ${detected}`);
    } else {
        failed++;
        failures.push({ repo, expected, detected });
        console.log(`  FAIL  ${repo.padEnd(45)} expected=${expected} got=${detected}`);
    }
}

console.log('');
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);

if (failed > 0) {
    console.log('\nFailed tests:');
    failures.forEach(f => console.log(`  ${f.repo}: expected ${f.expected}, got ${f.detected}`));
    process.exit(1);
} else {
    console.log('All classifier tests passed.');
}
