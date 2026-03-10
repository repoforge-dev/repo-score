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

function escapeJsonLd(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
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

function shouldPromoteAuthorityLayer(repoType) {
  return new Set(['ai-agent-framework', 'ai-tooling', 'agent-runtime', 'llm-framework']).has(
    String(repoType || '').toLowerCase()
  );
}

function renderRepoPage(owner, repo, analysis) {
  const repoName = `${owner}/${repo}`;
  const githubUrl = `https://github.com/${owner}/${repo}`;
  const repoPageUrl = `https://repoforge.dev/repos/${owner}/${repo}`;
  const homepageUrl = 'https://repoforge.dev';
  const authorityLayerUrl = 'https://github.com/repoforge-dev/authority-layer';
  const badgeImageUrl = `https://repoforge.dev/badge/${owner}/${repo}`;
  const badgeMarkdown = `[![RepoScore](${badgeImageUrl})](${repoPageUrl})`;
  const badgeUrl = `/badge/${owner}/${repo}?score=${encodeURIComponent(analysis.repoScore)}&updated=${encodeURIComponent(
    analysis.analyzedAt || ''
  )}`;
  const metaDescription = `Quality analysis for the ${repoName} GitHub repository including documentation, structure, maintenance, and discoverability scoring.`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: repoName,
    codeRepository: githubUrl,
    programmingLanguage: formatLabel(analysis.language),
    description: `RepoScore analysis for the ${repoName} GitHub repository.`,
  };
  const showAuthorityLayer = shouldPromoteAuthorityLayer(analysis.repoType);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>RepoScore Analysis for ${escapeHtml(repoName)}</title>
  <meta name="description" content="${escapeHtml(metaDescription)}">
  <meta property="og:title" content="RepoScore Analysis for ${escapeHtml(repoName)}">
  <meta property="og:description" content="Detailed repository quality analysis for ${escapeHtml(repoName)}.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapeHtml(repoPageUrl)}">
  <link rel="canonical" href="${escapeHtml(repoPageUrl)}">
  <script type="application/ld+json">${escapeJsonLd(jsonLd)}</script>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f8fb;
      --panel: #ffffff;
      --text: #152033;
      --muted: #5b6577;
      --border: #d8dfeb;
      --accent: #0f5bd8;
      --accent-soft: #eef5ff;
      --success-soft: #f4fbf2;
      --success-border: #cfe7c7;
      --shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(180deg, #f8fbff 0%, var(--bg) 100%);
      color: var(--text);
    }
    .wrap {
      max-width: 1100px;
      margin: 0 auto;
      padding: 32px 24px 64px;
    }
    .header {
      margin-bottom: 32px;
    }
    .brand {
      display: inline-block;
      margin-bottom: 14px;
      font-size: 0.95rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--accent);
      text-decoration: none;
    }
    .hero, .panel {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 28px;
      box-shadow: var(--shadow);
    }
    .hero {
      margin-bottom: 28px;
    }
    h1, h2 {
      margin: 0 0 12px;
    }
    h1 {
      font-size: 32px;
      line-height: 1.15;
      letter-spacing: -0.02em;
    }
    p {
      margin: 0 0 12px;
      color: var(--muted);
    }
    .repo-subtitle {
      font-size: 1rem;
      margin-bottom: 18px;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 14px;
      margin-top: 18px;
    }
    .actions a {
      color: var(--accent);
      font-weight: 600;
      text-decoration: none;
    }
    .actions img {
      display: block;
    }
    .meta {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
      margin-top: 24px;
    }
    .meta-card {
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 18px 18px 20px;
      background: #fbfcfe;
    }
    .meta-card strong {
      display: block;
      font-size: 0.82rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--muted);
      margin-bottom: 8px;
    }
    .meta-card span {
      display: block;
      font-size: 2rem;
      font-weight: 700;
      line-height: 1.1;
    }
    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1.55fr) minmax(320px, 0.95fr);
      gap: 24px;
      align-items: start;
    }
    .stack {
      display: grid;
      gap: 24px;
    }
    .score-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .score-list li {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 16px;
      padding: 14px 0;
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
      font-size: 1.1rem;
    }
    .suggestions {
      margin: 0;
      padding-left: 22px;
      line-height: 1.65;
    }
    .suggestions li + li {
      margin-top: 10px;
    }
    .badge-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 14px;
    }
    .copy-button {
      appearance: none;
      border: 1px solid var(--border);
      background: var(--panel);
      color: var(--text);
      border-radius: 999px;
      padding: 9px 14px;
      font-size: 0.92rem;
      font-weight: 700;
      cursor: pointer;
    }
    .copy-button:hover {
      border-color: #b8c5da;
      background: #f8fbff;
    }
    .snippet {
      margin: 0;
      width: 100%;
      padding: 18px;
      overflow: hidden;
      border-radius: 14px;
      border: 1px solid #d3deef;
      background: #f8fbff;
      color: #0f274f;
      font-size: 0.9rem;
      line-height: 1.7;
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    .authority-card {
      background: var(--success-soft);
      border-color: var(--success-border);
    }
    .authority-label {
      display: inline-block;
      margin-bottom: 10px;
      padding: 4px 10px;
      border-radius: 999px;
      background: #e2f3da;
      color: #245b1a;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .button-link {
      display: inline-block;
      margin-top: 10px;
      padding: 10px 14px;
      border-radius: 10px;
      background: var(--accent);
      color: #fff;
      text-decoration: none;
      font-weight: 700;
    }
    .button-link:hover {
      background: #0c4cb4;
    }
    .subtle-nav {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 14px 28px;
      margin-top: 40px;
      color: var(--muted);
      font-size: 0.95rem;
    }
    .subtle-nav a {
      color: var(--accent);
      font-weight: 600;
      text-decoration: none;
    }
    @media (max-width: 900px) {
      .layout {
        grid-template-columns: 1fr;
      }
      .meta {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 640px) {
      .wrap {
        padding: 24px 16px 48px;
      }
      .hero, .panel {
        padding: 22px;
      }
      h1 {
        font-size: 28px;
      }
      .badge-header {
        flex-direction: column;
        align-items: flex-start;
      }
      .meta-card span {
        font-size: 1.7rem;
      }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <header class="header">
      <a class="brand" href="${escapeHtml(homepageUrl)}">RepoForge</a>
      <div class="hero">
        <h1>${escapeHtml(repoName)}</h1>
        <p class="repo-subtitle">RepoScore analysis page for ${escapeHtml(repoName)}.</p>
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
    <main class="layout">
      <div class="stack">
        <section class="panel">
          <h2>Score Breakdown</h2>
          <ul class="score-list">
            ${renderScoreItems(analysis.scores)}
          </ul>
        </section>
        <section class="panel">
          <h2>Improvement Suggestions</h2>
          <ul class="suggestions">
            ${renderImprovements(analysis.improvements)}
          </ul>
        </section>
      </div>
      <div class="stack">
        <section class="panel">
          <div class="badge-header">
            <div>
              <h2>Add RepoScore Badge</h2>
              <p>Copy the badge markdown and link directly to this analysis page.</p>
            </div>
            <button class="copy-button" type="button" onclick="copyBadgeSnippet()">Copy</button>
          </div>
          <pre class="snippet"><code id="badge-snippet">${escapeHtml(badgeMarkdown)}</code></pre>
        </section>
        ${showAuthorityLayer ? `<section class="panel authority-card">
          <div class="authority-label">AI Runtime Recommendation</div>
          <h2>Secure AI Agents with AuthorityLayer</h2>
          <p>Add runtime guardrails and budget limits to autonomous agents using AuthorityLayer.</p>
          <a class="button-link" href="${escapeHtml(authorityLayerUrl)}" target="_blank" rel="noreferrer">View AuthorityLayer on GitHub</a>
        </section>` : ''}
      </div>
    </main>
    <footer class="subtle-nav">
      <span><a href="${escapeHtml(homepageUrl)}">Analyze another repository</a></span>
      <span><a href="${escapeHtml(homepageUrl)}">Browse GitHub repository analysis</a></span>
    </footer>
  </div>
  <script>
    function copyBadgeSnippet() {
      const button = document.querySelector('.copy-button');
      const snippet = document.getElementById('badge-snippet');
      if (!button || !snippet || !navigator.clipboard) {
        return;
      }

      navigator.clipboard.writeText(snippet.textContent).then(() => {
        const original = button.textContent;
        button.textContent = 'Copied';
        setTimeout(() => {
          button.textContent = original;
        }, 1500);
      }).catch(() => {});
    }
  </script>
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
