'use strict';

const express = require('express');

const { readRepoCache } = require('../cache/repoCache');
const analyzeRoute = require('./analyze');

const router = express.Router();
const { buildRepoAnalysis, hasCurrentCachedAnalysis, parseRepositoryInput } = analyzeRoute;

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getBadgeColor(score) {
  if (score >= 90) {
    return '#4c1';
  }

  if (score >= 80) {
    return '#007ec6';
  }

  if (score >= 70) {
    return '#dfb317';
  }

  if (score >= 60) {
    return '#fe7d37';
  }

  return '#e05d44';
}

function renderBadgeSvg(label, value, color) {
  const leftWidth = 88;
  const rightWidth = 44;
  const totalWidth = leftWidth + rightWidth;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${escapeXml(label)}: ${escapeXml(value)}">
  <linearGradient id="repoforge-badge" x2="0" y2="100%">
    <stop offset="0" stop-color="#ffffff" stop-opacity=".08"/>
    <stop offset="1" stop-opacity=".08"/>
  </linearGradient>
  <clipPath id="repoforge-clip">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#repoforge-clip)">
    <rect width="${leftWidth}" height="20" fill="#24292f"/>
    <rect x="${leftWidth}" width="${rightWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#repoforge-badge)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${leftWidth / 2}" y="15">${escapeXml(label)}</text>
    <text x="${leftWidth + rightWidth / 2}" y="15">${escapeXml(value)}</text>
  </g>
</svg>`;
}

router.get('/:owner/:repo', async (req, res, next) => {
  try {
    const { owner, repo } = parseRepositoryInput(`${req.params.owner}/${req.params.repo}`);
    const cached = await readRepoCache(owner, repo);
    const analysis = hasCurrentCachedAnalysis(cached)
      ? cached.analysis
      : await buildRepoAnalysis(owner, repo);
    const svg = renderBadgeSvg('RepoScore', analysis.repoScore, getBadgeColor(analysis.repoScore));

    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.send(svg);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
