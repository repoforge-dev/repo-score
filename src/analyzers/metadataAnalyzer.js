'use strict';

/**
 * metadataAnalyzer.js
 *
 * Scores repository metadata signals:
 *   - Has a description
 *   - Has topics/tags
 *   - Has a license
 *   - Has a populated homepage URL
 *   - Star count tier
 *   - Recent commit activity (last pushed date)
 *
 * Max contribution to final score: 25 points
 */

const MAX_SCORE = 25;

/**
 * @param {object} repoData  Raw GitHub repo object from githubClient.getRepo()
 * @returns {{ score: number, max: number, signals: object }}
 */
function analyze(repoData) {
    const signals = {};
    let earned = 0;

    // Description present (4 pts)
    signals.hasDescription = Boolean(repoData.description && repoData.description.trim());
    if (signals.hasDescription) earned += 4;

    // At least one topic (4 pts)
    signals.hasTopics = Array.isArray(repoData.topics) && repoData.topics.length > 0;
    if (signals.hasTopics) earned += 4;

    // License present (5 pts)
    signals.hasLicense = Boolean(repoData.license && repoData.license.spdx_id !== 'NOASSERTION');
    if (signals.hasLicense) earned += 5;

    // Homepage URL (3 pts)
    signals.hasHomepage = Boolean(repoData.homepage && repoData.homepage.trim());
    if (signals.hasHomepage) earned += 3;

    // Star count tier (up to 5 pts)
    const stars = repoData.stargazers_count || 0;
    if (stars >= 1000) { signals.starTier = 'high'; earned += 5; }
    else if (stars >= 100) { signals.starTier = 'medium'; earned += 3; }
    else if (stars >= 10) { signals.starTier = 'low'; earned += 1; }
    else { signals.starTier = 'none'; }

    // Recently active — pushed within last 6 months (4 pts)
    const sixMonthsAgo = Date.now() - 6 * 30 * 24 * 60 * 60 * 1000;
    const lastPushed = repoData.pushed_at ? new Date(repoData.pushed_at).getTime() : 0;
    signals.recentlyActive = lastPushed > sixMonthsAgo;
    if (signals.recentlyActive) earned += 4;

    return {
        score: Math.min(earned, MAX_SCORE),
        max: MAX_SCORE,
        signals,
    };
}

module.exports = { analyze };
