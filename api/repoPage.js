'use strict';

const express = require('express');

const { getCacheFilePath, readRepoCache } = require('../cache/repoCache');
const analyzeRoute = require('./analyze');

const router = express.Router();
const { buildRepoAnalysis, hasCurrentCachedAnalysis, hasCurrentAnalysisSchema, parseRepositoryInput } = analyzeRoute;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatLabel(value) {
  return String(value || 'unknown')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/[-_\s]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function renderScoreItems(scores) {
  return Object.entries(scores)
    .map(([key, value]) => {
      const displayValue = value === null ? 'N/A' : value;
      return `<li><strong>${escapeHtml(formatLabel(key))}</strong><span>${escapeHtml(displayValue)}</span></li>`;
    })
    .join('');
}

function renderImprovements(improvements) {
  if (!Array.isArray(improvements) || improvements.length === 0) {
    return '<li>No immediate improvements suggested.</li>';
  }

  return improvements.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
}

function getAnalysisFromCache(cachePayload) {
  if (!cachePayload || typeof cachePayload !== 'object') {
    return null;
  }

  if (hasCurrentCachedAnalysis(cachePayload)) {
    return cachePayload.analysis;
  }

  if (
    Object.prototype.hasOwnProperty.call(cachePayload, 'repoScore') &&
    Object.prototype.hasOwnProperty.call(cachePayload, 'scores') &&
    hasCurrentAnalysisSchema(cachePayload)
  ) {
    return cachePayload;
  }

  return null;
}

function renderRepoPage(owner, repo, analysis) {
  const repoName = `${owner}/${repo}`;
  const githubUrl = `https://github.com/${owner}/${repo}`;
  const badgeUrl = `/badge/${owner}/${repo}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>RepoScore - ${escapeHtml(repoName)}</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f8fb;
      --panel: #ffffff;
      --text: #152033;
      --muted: #5b6577;
      --border: #d8dfeb;
      --accent: #0f5bd8;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(180deg, #f8fbff 0%, var(--bg) 100%);
      color: var(--text);
    }
    .wrap {
      max-width: 960px;
      margin: 0 auto;
      padding: 32px 20px 48px;
    }
    .header {
      margin-bottom: 24px;
    }
    .brand {
      font-size: 0.95rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 12px;
    }
    .hero, .panel {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
    }
    .hero {
      margin-bottom: 20px;
    }
    h1, h2 {
      margin: 0 0 12px;
    }
    p {
      margin: 0 0 12px;
      color: var(--muted);
    }
    .meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px;
      margin-top: 20px;
    }
    .meta-card {
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px 16px;
      background: #fbfcfe;
    }
    .meta-card strong {
      display: block;
      font-size: 0.82rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--muted);
      margin-bottom: 6px;
    }
    .meta-card span {
      font-size: 1.25rem;
      font-weight: 700;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      margin-top: 16px;
    }
    .actions a {
      color: var(--accent);
      font-weight: 600;
      text-decoration: none;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
    }
    ul {
      margin: 0;
      padding-left: 20px;
    }
    .score-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .score-list li {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 12px 0;
      border-bottom: 1px solid var(--border);
    }
    .score-list li:last-child {
      border-bottom: 0;
      padding-bottom: 0;
    }
    .score-list strong {
      font-weight: 600;
    }
    .score-list span {
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <header class="header">
      <div class="brand">RepoForge</div>
      <div class="hero">
        <h1>${escapeHtml(repoName)}</h1>
        <p>RepoScore analysis page for ${escapeHtml(repoName)}.</p>
        <div class="actions">
          <a href="${escapeHtml(githubUrl)}" target="_blank" rel="noreferrer">View on GitHub</a>
          <img src="${escapeHtml(badgeUrl)}" alt="RepoScore badge for ${escapeHtml(repoName)}">
        </div>
        <div class="meta">
          <div class="meta-card">
            <strong>RepoScore</strong>
            <span>${escapeHtml(analysis.repoScore)}</span>
          </div>
          <div class="meta-card">
            <strong>Repo Type</strong>
            <span>${escapeHtml(formatLabel(analysis.repoType))}</span>
          </div>
          <div class="meta-card">
            <strong>Language</strong>
            <span>${escapeHtml(formatLabel(analysis.language))}</span>
          </div>
        </div>
      </div>
    </header>
    <main class="grid">
      <section class="panel">
        <h2>Score Breakdown</h2>
        <ul class="score-list">
          ${renderScoreItems(analysis.scores)}
        </ul>
      </section>
      <section class="panel">
        <h2>Improvement Suggestions</h2>
        <ul>
          ${renderImprovements(analysis.improvements)}
        </ul>
      </section>
    </main>
  </div>
</body>
</html>`;
}

router.get('/:owner/:repo', async (req, res, next) => {
  try {
    const owner = req.params.owner;
    const repo = req.params.repo;

    console.log('Loading repo page:', owner, repo);

    parseRepositoryInput(`${owner}/${repo}`);

    const cacheKey = `${owner}-${repo}`;
    const cacheFilePath = getCacheFilePath(owner, repo);

    let cached = await readRepoCache(owner, repo);
    let analysis = getAnalysisFromCache(cached);

    if (!analysis) {
      analysis = await buildRepoAnalysis(owner, repo);
      cached = await readRepoCache(owner, repo);
      analysis = analysis || getAnalysisFromCache(cached);
    }

    const html = renderRepoPage(owner, repo, analysis);

    res.setHeader('X-RepoForge-Cache-Key', cacheKey);
    res.setHeader('X-RepoForge-Cache-File', cacheFilePath);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
