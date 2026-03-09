'use strict';

/**
 * scoreEngine.js
 *
 * Combines the outputs of all analyzers into a single normalised RepoScore
 * on a 0–100 scale, along with a per-category breakdown and a label.
 *
 * Score thresholds:
 *   90–100  Excellent
 *   70–89   Good
 *   50–69   Fair
 *   30–49   Needs Work
 *   0–29    Poor
 */

/**
 * @param {object} params
 * @param {{ score: number, max: number, signals: object }} params.metadataResult
 * @param {{ score: number, max: number, signals: object }} params.readmeResult
 * @param {{ score: number, max: number, signals: object }} params.structureResult
 * @returns {{ score: number, label: string, breakdown: object }}
 */
function computeScore({ metadataResult, readmeResult, structureResult }) {
    // ── CI bonus applied at the engine level ─────────────────────────────────
    // structureAnalyzer detects CI but deliberately does not score it, so that
    // scoring weight decisions live here in one place.
    const CI_BONUS = 10;
    const hasCi = structureResult.signals && structureResult.signals.hasCi;
    const structureScore = Math.min(
        structureResult.score + (hasCi ? CI_BONUS : 0),
        structureResult.max + CI_BONUS  // engine-level cap: 28 base + 10 CI = 38
    );
    const structureMax = structureResult.max + CI_BONUS; // 38

    const totalEarned = metadataResult.score + readmeResult.score + structureScore;
    const totalMax = metadataResult.max + readmeResult.max + structureMax;

    // Normalise to 0–100
    const score = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;

    return {
        score,
        label: scoreLabel(score),
        breakdown: {
            metadata: { score: metadataResult.score, max: metadataResult.max },
            readme: { score: readmeResult.score, max: readmeResult.max },
            structure: {
                score: structureScore,
                max: structureMax,
                ciBonus: hasCi ? CI_BONUS : 0,
            },
        },
    };
}

/**
 * Map a numeric score to a human-readable label.
 *
 * @param {number} score  0–100
 * @returns {string}
 */
function scoreLabel(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    if (score >= 30) return 'Needs Work';
    return 'Poor';
}

module.exports = { computeScore, scoreLabel };
