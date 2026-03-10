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

function shouldPromoteAuthorityLayer(repoType, topics) {
  const promotedTypes = new Set(['ai-agent-framework', 'ai-tooling', 'agent-runtime', 'llm-framework']);
  const promotedTopics = new Set(['agent', 'ai-agent', 'llm', 'autonomous-agent', 'ai-runtime']);
  const normalizedTopics = Array.isArray(topics)
    ? topics.map((topic) => String(topic || '').toLowerCase())
    : [];

  return promotedTypes.has(String(repoType || '').toLowerCase()) || normalizedTopics.some((topic) => promotedTopics.has(topic));
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

function renderRepoPage(owner, repo, analysis, options = {}) {
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
  const showAuthorityLayer = shouldPromoteAuthorityLayer(analysis.repoType, options.topics);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>RepoScore Analysis for ${escapeHtml(repoName)}</title>
  <meta name="description" content="${escapeHtml(metaDescription)}" />
  <link rel="canonical" href="${escapeHtml(repoPageUrl)}" />
  <meta property="og:title" content="RepoScore Analysis for ${escapeHtml(repoName)}">
  <meta property="og:description" content="Detailed repository quality analysis for ${escapeHtml(repoName)}.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapeHtml(repoPageUrl)}">
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
      text-decoration: none;
      display: inline-block;
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
    .actions img {
      display: block;
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
    .snippet {
      margin: 0;
      padding: 16px;
      overflow-x: auto;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: #0f172a;
      color: #e2e8f0;
      font-size: 0.9rem;
      line-height: 1.5;
    }
    .subtle-nav {
      display: flex;
      flex-wrap: wrap;
      gap: 12px 20px;
      margin-top: 24px;
      color: var(--muted);
      font-size: 0.95rem;
    }
    .subtle-nav a {
      color: var(--accent);
      font-weight: 600;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <header class="header">
      <a class="brand" href="${escapeHtml(homepageUrl)}">RepoForge</a>
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
      <section class="panel">
        <h2>Add RepoScore Badge</h2>
        <p>Link the badge directly to this analysis page.</p>
        <pre class="snippet"><code>${escapeHtml(badgeMarkdown)}</code></pre>
      </section>
      ${showAuthorityLayer ? `<section class="panel">
        <h2>Secure AI Agents with AuthorityLayer</h2>
        <p>Add runtime guardrails and budget limits to autonomous agents using AuthorityLayer.</p>
        <p><a href="${escapeHtml(authorityLayerUrl)}" target="_blank" rel="noreferrer">View AuthorityLayer on GitHub</a></p>
      </section>` : ''}
    </main>
    <footer class="subtle-nav">
      <span><a href="${escapeHtml(homepageUrl)}">Analyze another repository</a></span>
      <span><a href="${escapeHtml(homepageUrl)}">Browse GitHub repository analysis</a></span>
    </footer>
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

    const html = renderRepoPage(owner, repo, analysis, {
      topics: cached?.snapshot?.repoMetadata?.topics || [],
    });

    res.setHeader('X-RepoForge-Cache-Key', cacheKey);
    res.setHeader('X-RepoForge-Cache-File', cacheFilePath);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
