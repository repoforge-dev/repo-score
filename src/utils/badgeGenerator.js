'use strict';

/**
 * badgeGenerator.js
 *
 * Generates a Shields.io-style SVG badge for a given RepoScore.
 * The badge is self-contained and requires no external requests.
 *
 * Colour mapping:
 *   90–100  #4caf50  (green)
 *   70–89   #8bc34a  (light green)
 *   50–69   #ffc107  (amber)
 *   30–49   #ff9800  (orange)
 *   0–29    #f44336  (red)
 */

/**
 * @param {number} score  0–100
 * @returns {string} Raw SVG markup
 */
function generateBadgeSvg(score) {
    const colour = scoreColour(score);
    const label = 'RepoScore';
    const value = String(score);

    // Widths (approximate, monospace-ish)
    const labelWidth = label.length * 6 + 10;
    const valueWidth = value.length * 7 + 10;
    const totalWidth = labelWidth + valueWidth;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20">
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0"   stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1"   stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${colour}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${value}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${value}</text>
  </g>
</svg>`;
}

/**
 * @param {number} score
 * @returns {string} Hex colour code
 */
function scoreColour(score) {
    if (score >= 90) return '#4caf50';
    if (score >= 70) return '#8bc34a';
    if (score >= 50) return '#ffc107';
    if (score >= 30) return '#ff9800';
    return '#f44336';
}

module.exports = { generateBadgeSvg, scoreColour };
