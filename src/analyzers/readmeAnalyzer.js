'use strict';

/**
 * readmeAnalyzer.js
 *
 * Scores the quality of the repository's README:
 *   - README exists
 *   - Minimum length (characters)
 *   - Contains code blocks
 *   - Contains at least one heading
 *   - Contains a badge (e.g. CI, npm, license)
 *   - Contains an installation section
 *   - Contains a usage/example section
 *
 * Max contribution to final score: 40 points
 */

const MAX_SCORE = 40;

/**
 * @param {string|null} readmeContent  Plain-text README, or null if absent.
 * @returns {{ score: number, max: number, signals: object }}
 */
function analyze(readmeContent) {
    const signals = {};
    let earned = 0;

    // README exists (10 pts)
    signals.exists = readmeContent !== null && readmeContent !== undefined;
    if (!signals.exists) {
        return { score: 0, max: MAX_SCORE, signals };
    }
    earned += 10;

    const content = readmeContent;

    // Minimum length — at least 200 characters (5 pts)
    signals.hasMinLength = content.length >= 200;
    if (signals.hasMinLength) earned += 5;

    // Contains at least one Markdown heading (5 pts)
    signals.hasHeadings = /^#{1,6}\s+.+/m.test(content);
    if (signals.hasHeadings) earned += 5;

    // Contains a fenced code block (5 pts)
    signals.hasCodeBlocks = /```[\s\S]*?```/.test(content);
    if (signals.hasCodeBlocks) earned += 5;

    // Contains a badge/shield image (5 pts)
    signals.hasBadge = /!\[.*?\]\(https?:\/\/(img\.shields\.io|badge\.fury|github\.com\/[^)]+badge[^)]*)\)/i.test(content);
    if (signals.hasBadge) earned += 5;

    // Contains an installation section (5 pts)
    signals.hasInstallSection = /##?\s*(install|installation|getting started|setup)/i.test(content);
    if (signals.hasInstallSection) earned += 5;

    // Contains a usage or examples section (5 pts)
    signals.hasUsageSection = /##?\s*(usage|example|examples|quick start)/i.test(content);
    if (signals.hasUsageSection) earned += 5;

    return {
        score: Math.min(earned, MAX_SCORE),
        max: MAX_SCORE,
        signals,
    };
}

module.exports = { analyze };
