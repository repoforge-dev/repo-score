'use strict';

/**
 * structureAnalyzer.js
 *
 * Scores repository file-structure signals:
 *   - Has a .gitignore
 *   - Has a CONTRIBUTING or CONTRIBUTING.md
 *   - Has a CHANGELOG or CHANGELOG.md
 *   - Has a CODE_OF_CONDUCT file
 *   - Has a CI configuration (GitHub Actions, Travis, CircleCI, etc.)
 *   - Has a test directory or file
 *   - Has a SECURITY or SECURITY.md
 *
 * Max contribution to final score: 28 points
 * (CI detection signals are passed to scoreEngine, which awards 10 pts there)
 */

const MAX_SCORE = 28;

/**
 * @param {Array<{ path: string, type: string }>} treeEntries
 *   Flat list of tree objects from githubClient.getTree().
 * @returns {{ score: number, max: number, signals: object }}
 */
function analyze(treeEntries) {
    const signals = {};
    let earned = 0;

    if (!Array.isArray(treeEntries) || treeEntries.length === 0) {
        return { score: 0, max: MAX_SCORE, signals };
    }

    const paths = treeEntries.map((e) => e.path.toLowerCase());

    const has = (pattern) => paths.some((p) =>
        typeof pattern === 'string' ? p === pattern : pattern.test(p)
    );

    // .gitignore (5 pts)
    signals.hasGitignore = has('.gitignore');
    if (signals.hasGitignore) earned += 5;

    // CONTRIBUTING file (5 pts)
    signals.hasContributing = has(/^contributing(\.md|\.txt)?$/);
    if (signals.hasContributing) earned += 5;

    // CHANGELOG file (4 pts)
    signals.hasChangelog = has(/^changelog(\.md|\.txt)?$/);
    if (signals.hasChangelog) earned += 4;

    // CODE_OF_CONDUCT (4 pts)
    signals.hasCodeOfConduct = has(/^code_of_conduct(\.md|\.txt)?$/);
    if (signals.hasCodeOfConduct) earned += 4;

    // CI configuration (7 pts)
    // Each CI system is checked independently so a repo is not penalised
    // for choosing a CI provider other than GitHub Actions.
    const hasGithubActions = has(/^\.github\/workflows\/.+/);         // .github/workflows/<any file>
    const hasCircleCi = has(/^\.circleci\//);                     // .circleci/ directory
    const hasTravisCi = has('.travis.yml');                        // .travis.yml (root)
    const hasAzurePipelines = has('azure-pipelines.yml');               // azure-pipelines.yml (root)
    const hasGitlabCi = has('.gitlab-ci.yml');                    // .gitlab-ci.yml (root)

    signals.hasCi = hasGithubActions || hasCircleCi || hasTravisCi || hasAzurePipelines || hasGitlabCi;
    signals.ciSystems = { hasGithubActions, hasCircleCi, hasTravisCi, hasAzurePipelines, hasGitlabCi };
    // NOTE: CI points are NOT added here — scoreEngine awards 10 pts for hasCi
    //       so the detection signal is kept but the earned total is untouched.

    // Test directory or file (6 pts)
    signals.hasTests = has(/^(test|tests|spec|__tests__|\.mocharc\.(js|yml|json))/) ||
        has(/\.(test|spec)\.(js|ts|mjs|cjs)$/);
    if (signals.hasTests) earned += 6;

    // SECURITY file (4 pts)
    signals.hasSecurity = has(/^security(\.md|\.txt)?$/);
    if (signals.hasSecurity) earned += 4;

    return {
        score: Math.min(earned, MAX_SCORE),
        max: MAX_SCORE,
        signals,
    };
}

module.exports = { analyze };
