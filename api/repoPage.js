'use strict';

const fs = require('fs/promises');
const path = require('path');
const express = require('express');

const { getCacheFilePath, readRepoCache } = require('../cache/repoCache');
const analyzeRoute = require('./analyze');

const router = express.Router();
const { buildRepoAnalysis, hasCurrentCachedAnalysis, hasCurrentAnalysisSchema, parseRepositoryInput } = analyzeRoute;

const REPO_DATA_DIR = path.join(__dirname, '..', 'data', 'repos');
const PAGE_SIZE = 50;
const INDEX_CACHE_TTL_MS = 60 * 1000;

let repoIndexCache = null;
let repoIndexLoadedAt = 0;
let repoIndexPromise = null;

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

function slugifyCategoryValue(value) {
  return String(value || 'unknown').trim().toLowerCase();
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
  return new Set(['ai-agent-framework', 'ai-tooling']).has(String(repoType || '').toLowerCase());
}

function parsePageNumber(value) {
  const parsed = Number.parseInt(value || '1', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function getBaseStyles() {
  return `
    :root {
      color-scheme: light;
      --bg: #f5f7fb;
      --panel: #ffffff;
      --text: #142033;
      --muted: #617085;
      --border: #e6e8ee;
      --accent: #0f5bd8;
      --success-soft: #f2fbf3;
      --success-border: #d4ebd8;
      --shadow: 0 4px 10px rgba(0, 0, 0, 0.03);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      background: var(--bg);
      color: var(--text);
      font-size: 15px;
    }
    .wrap {
      max-width: 1100px;
      margin: 0 auto;
      padding: 32px;
    }
    .header {
      margin-bottom: 28px;
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
      border-radius: 12px;
      padding: 24px;
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
    h2 {
      font-size: 20px;
      line-height: 1.25;
    }
    p {
      margin: 0 0 12px;
      color: var(--muted);
      line-height: 1.6;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e8ef;
      text-align: center;
      color: var(--muted);
      font-size: 15px;
    }
    .footer a {
      color: var(--accent);
      font-weight: 700;
      text-decoration: none;
      margin: 0 14px;
    }
    @media (max-width: 900px) {
      .wrap {
        padding: 24px 16px 48px;
      }
    }
  `;
}

function getRepoPageStyles() {
  return `
    ${getBaseStyles()}
    .repo-subtitle {
      font-size: 0.98rem;
      margin-bottom: 16px;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 14px;
      margin-top: 14px;
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
      gap: 20px;
      margin-top: 28px;
    }
    .meta-card {
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      background: #ffffff;
      box-shadow: var(--shadow);
    }
    .meta-card strong {
      display: block;
      font-size: 0.82rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--muted);
      margin-bottom: 8px;
    }
    .meta-card span,
    .meta-card a {
      display: block;
      font-size: 2rem;
      font-weight: 700;
      line-height: 1.1;
      color: var(--text);
      text-decoration: none;
    }
    .meta-card a:hover {
      color: var(--accent);
    }
    .badge-section {
      margin-bottom: 28px;
    }
    .layout {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 20px;
      align-items: start;
    }
    .stack {
      display: grid;
      gap: 20px;
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
      padding: 10px 0;
      border-bottom: 1px solid #eef1f6;
    }
    .score-list li:last-child {
      border-bottom: 0;
      padding-bottom: 0;
    }
    .score-list strong {
      font-weight: 600;
    }
    .score-list span {
      font-weight: 600;
      font-size: 1.15rem;
      text-align: right;
    }
    .suggestions {
      margin: 0;
      padding-left: 22px;
      line-height: 1.8;
    }
    .suggestions li {
      margin-bottom: 10px;
    }
    .suggestions li:last-child {
      margin-bottom: 0;
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
      border-radius: 10px;
      padding: 10px 15px;
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
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #dfe3ea;
      background: #f7f9fc;
      color: #10294f;
      font-family: Consolas, "SFMono-Regular", Menlo, Monaco, monospace;
      font-size: 14px;
      line-height: 1.65;
      white-space: pre-wrap;
      word-break: break-all;
      overflow-wrap: anywhere;
    }
    .authority-card {
      background: #f6fbf7;
      border: 1px solid #d9eadf;
      border-radius: 12px;
      padding: 18px;
    }
    .authority-label {
      display: inline-block;
      margin-bottom: 10px;
      padding: 4px 8px;
      border-radius: 20px;
      background: #e8f6ec;
      color: #2f6b3e;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .button-link {
      display: inline-block;
      margin-top: 10px;
      padding: 8px 14px;
      border-radius: 8px;
      background: var(--accent);
      color: #fff;
      text-decoration: none;
      font-size: 14px;
      font-weight: 700;
    }
    .button-link:hover {
      background: #0c4cb4;
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
      .meta-card span,
      .meta-card a {
        font-size: 1.7rem;
      }
    }
  `;
}

function getCategoryPageStyles() {
  return `
    ${getBaseStyles()}
    .category-copy {
      font-size: 0.98rem;
      margin-bottom: 0;
    }
    .list-panel {
      margin-bottom: 28px;
    }
    .repo-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .repo-item {
      display: grid;
      grid-template-columns: minmax(0, 1.5fr) auto auto auto;
      gap: 18px;
      align-items: center;
      padding: 16px 0;
      border-bottom: 1px solid #eef1f6;
    }
    .repo-item:last-child {
      border-bottom: 0;
      padding-bottom: 0;
    }
    .repo-name a {
      color: var(--text);
      text-decoration: none;
      font-weight: 700;
      font-size: 1rem;
    }
    .repo-name a:hover {
      color: var(--accent);
    }
    .repo-meta {
      color: var(--muted);
      font-size: 0.95rem;
      white-space: nowrap;
    }
    .repo-score {
      font-weight: 700;
      color: var(--text);
      font-size: 1rem;
      white-space: nowrap;
    }
    .empty-state {
      color: var(--muted);
      font-size: 0.98rem;
    }
    .pagination {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-top: 24px;
      color: var(--muted);
      font-size: 0.95rem;
    }
    .pagination a {
      color: var(--accent);
      font-weight: 700;
      text-decoration: none;
    }
    .context-links {
      display: flex;
      flex-wrap: wrap;
      gap: 12px 18px;
      margin-top: 16px;
      color: var(--muted);
      font-size: 0.95rem;
    }
    .context-links a {
      color: var(--accent);
      font-weight: 600;
      text-decoration: none;
    }
    @media (max-width: 900px) {
      .repo-item {
        grid-template-columns: 1fr;
        gap: 8px;
      }
      .repo-meta,
      .repo-score {
        white-space: normal;
      }
      .pagination {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `;
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

function renderRepoLinks(analysis) {
  const languageSlug = slugifyCategoryValue(analysis.language);
  const repoTypeSlug = slugifyCategoryValue(analysis.repoType);

  return {
    languageUrl: `/repos/language/${encodeURIComponent(languageSlug)}`,
    repoTypeUrl: `/repos/type/${encodeURIComponent(repoTypeSlug)}`,
  };
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
  const links = renderRepoLinks(analysis);

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
  <style>${getRepoPageStyles()}</style>
</head>
<body>
  <div class="wrap">
    <header class="header">
      <a class="brand" href="${escapeHtml(homepageUrl)}">RepoForge</a>
      <div class="hero">
        <h1>${escapeHtml(repoName)}</h1>
        <p class="repo-subtitle">Repository Quality Analysis</p>
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
            <a href="${escapeHtml(links.repoTypeUrl)}">${escapeHtml(formatLabel(analysis.repoType))}</a>
          </div>
          <div class="meta-card">
            <strong>Language</strong>
            <a href="${escapeHtml(links.languageUrl)}">${escapeHtml(formatLabel(analysis.language))}</a>
          </div>
        </div>
      </div>
    </header>
    <section class="panel badge-section">
      <div class="badge-header">
        <div>
          <h2>Add RepoScore Badge</h2>
          <p>Copy the markdown to display the RepoScore badge in your repository README.</p>
        </div>
        <button class="copy-button" type="button" onclick="copyBadgeSnippet()">Copy</button>
      </div>
      <pre class="snippet"><code id="badge-snippet">${escapeHtml(badgeMarkdown)}</code></pre>
    </section>
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
        ${showAuthorityLayer ? `<section class="panel authority-card">
          <div class="authority-label">AI Runtime Recommendation</div>
          <h2>Secure AI Agents with AuthorityLayer</h2>
          <p>Add runtime guardrails and budget limits to autonomous agents using AuthorityLayer.</p>
          <a class="button-link" href="${escapeHtml(authorityLayerUrl)}" target="_blank" rel="noreferrer">View AuthorityLayer on GitHub</a>
        </section>` : ''}
      </div>
    </main>
    <footer class="footer">
      <a href="${escapeHtml(homepageUrl)}">Analyze another repository</a>
      <a href="/repos/top">Browse GitHub repository analysis</a>
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

function createIndexEntry(cachePayload) {
  const analysis = cachePayload?.analysis;
  const snapshot = cachePayload?.snapshot;

  if (!analysis || !snapshot || !analysis.repo || typeof analysis.repo !== 'string') {
    return null;
  }

  const topics = Array.isArray(snapshot.repoMetadata?.topics)
    ? snapshot.repoMetadata.topics.map((topic) => slugifyCategoryValue(topic)).filter(Boolean)
    : [];
  const [owner, repo] = analysis.repo.split('/');

  if (!owner || !repo) {
    return null;
  }

  return {
    owner,
    repo,
    fullName: `${owner}/${repo}`,
    repoType: slugifyCategoryValue(analysis.repoType),
    language: slugifyCategoryValue(analysis.language),
    repoScore: Number.isFinite(analysis.repoScore) ? analysis.repoScore : 0,
    scores: analysis.scores || {},
    improvements: Array.isArray(analysis.improvements) ? analysis.improvements : [],
    topics,
  };
}

function sortEntries(entries) {
  return [...entries].sort((left, right) => {
    if (right.repoScore !== left.repoScore) {
      return right.repoScore - left.repoScore;
    }

    return left.fullName.localeCompare(right.fullName);
  });
}

function addToMap(map, key, entry) {
  if (!key) {
    return;
  }

  const existing = map.get(key) || [];
  existing.push(entry);
  map.set(key, existing);
}

async function buildRepoIndex() {
  await fs.mkdir(REPO_DATA_DIR, { recursive: true });
  const fileNames = await fs.readdir(REPO_DATA_DIR);
  const entries = [];
  const byLanguage = new Map();
  const byType = new Map();
  const byTopic = new Map();

  for (const fileName of fileNames) {
    if (!fileName.endsWith('.json')) {
      continue;
    }

    try {
      const payload = JSON.parse(await fs.readFile(path.join(REPO_DATA_DIR, fileName), 'utf8'));
      const entry = createIndexEntry(payload);
      if (!entry) {
        continue;
      }

      entries.push(entry);
      addToMap(byLanguage, entry.language, entry);
      addToMap(byType, entry.repoType, entry);
      for (const topic of entry.topics) {
        addToMap(byTopic, topic, entry);
      }
    } catch (_error) {
      continue;
    }
  }

  for (const [key, list] of byLanguage.entries()) {
    byLanguage.set(key, sortEntries(list));
  }

  for (const [key, list] of byType.entries()) {
    byType.set(key, sortEntries(list));
  }

  for (const [key, list] of byTopic.entries()) {
    byTopic.set(key, sortEntries(list));
  }

  return {
    entries: sortEntries(entries),
    byLanguage,
    byType,
    byTopic,
  };
}

async function getRepoIndex() {
  if (repoIndexCache && Date.now() - repoIndexLoadedAt < INDEX_CACHE_TTL_MS) {
    return repoIndexCache;
  }

  if (!repoIndexPromise) {
    repoIndexPromise = buildRepoIndex()
      .then((index) => {
        repoIndexCache = index;
        repoIndexLoadedAt = Date.now();
        return index;
      })
      .finally(() => {
        repoIndexPromise = null;
      });
  }

  return repoIndexPromise;
}

function paginateEntries(entries, page) {
  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;

  return {
    currentPage,
    totalPages,
    items: entries.slice(start, start + PAGE_SIZE),
  };
}

function renderRepositoryList(entries) {
  if (!entries.length) {
    return '<p class="empty-state">No cached repositories match this category yet.</p>';
  }

  return `<ul class="repo-list">${entries
    .map((entry) => `<li class="repo-item">
        <div class="repo-name"><a href="/repos/${encodeURIComponent(entry.owner)}/${encodeURIComponent(entry.repo)}">${escapeHtml(entry.fullName)}</a></div>
        <div class="repo-score">RepoScore ${escapeHtml(entry.repoScore)}</div>
        <div class="repo-meta">${escapeHtml(formatLabel(entry.repoType))}</div>
        <div class="repo-meta">${escapeHtml(formatLabel(entry.language))}</div>
      </li>`)
    .join('')}</ul>`;
}

function buildPageHref(basePath, page) {
  return page > 1 ? `${basePath}?page=${page}` : basePath;
}

function renderPagination(basePath, currentPage, totalPages) {
  if (totalPages <= 1) {
    return '';
  }

  return `<nav class="pagination">
    <div>${escapeHtml(`Page ${currentPage} of ${totalPages}`)}</div>
    <div>
      ${currentPage > 1 ? `<a href="${escapeHtml(buildPageHref(basePath, currentPage - 1))}">Previous</a>` : ''}
      ${currentPage < totalPages ? `<a href="${escapeHtml(buildPageHref(basePath, currentPage + 1))}">Next</a>` : ''}
    </div>
  </nav>`;
}

function renderCategoryPage(options) {
  const {
    title,
    description,
    canonicalUrl,
    heading,
    entries,
    currentPage,
    totalPages,
    basePath,
    contextLinks = [],
  } = options;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  <style>${getCategoryPageStyles()}</style>
</head>
<body>
  <div class="wrap">
    <header class="header">
      <a class="brand" href="https://repoforge.dev">RepoForge</a>
      <div class="hero">
        <h1>${escapeHtml(heading)}</h1>
        <p class="category-copy">${escapeHtml(description)}</p>
        ${contextLinks.length ? `<div class="context-links">${contextLinks
          .map((link) => `<a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`)
          .join('')}</div>` : ''}
      </div>
    </header>
    <main>
      <section class="panel list-panel">
        <h2>Repository List</h2>
        ${renderRepositoryList(entries)}
        ${renderPagination(basePath, currentPage, totalPages)}
      </section>
    </main>
    <footer class="footer">
      <a href="https://repoforge.dev">Analyze another repository</a>
      <a href="/repos/top">Browse GitHub repository analysis</a>
    </footer>
  </div>
</body>
</html>`;
}

function getScoreBucketEntries(entries, minimumScore) {
  return entries.filter((entry) => entry.repoScore >= minimumScore);
}

function buildCategoryResponse(entries, page) {
  const pagination = paginateEntries(entries, page);

  return {
    entries: pagination.items,
    currentPage: pagination.currentPage,
    totalPages: pagination.totalPages,
  };
}

router.get('/language/:language', async (req, res, next) => {
  try {
    const language = slugifyCategoryValue(req.params.language);
    const page = parsePageNumber(req.query.page);
    const index = await getRepoIndex();
    const entries = index.byLanguage.get(language) || [];
    const paged = buildCategoryResponse(entries, page);
    const title = `Top ${formatLabel(language)} repositories by RepoScore`;
    const description = `Explore the highest scoring ${formatLabel(language)} repositories ranked by RepoScore.`;
    const basePath = `/repos/language/${encodeURIComponent(language)}`;

    res.type('html').send(
      renderCategoryPage({
        title,
        description,
        canonicalUrl: `https://repoforge.dev${buildPageHref(basePath, paged.currentPage)}`,
        heading: title,
        entries: paged.entries,
        currentPage: paged.currentPage,
        totalPages: paged.totalPages,
        basePath,
        contextLinks: [
          { href: '/repos/top', label: 'Top repositories' },
          { href: '/repos/reposcore-90-plus', label: 'RepoScore 90+ pages' },
        ],
      })
    );
  } catch (error) {
    return next(error);
  }
});

router.get('/type/:repoType', async (req, res, next) => {
  try {
    const repoType = slugifyCategoryValue(req.params.repoType);
    const page = parsePageNumber(req.query.page);
    const index = await getRepoIndex();
    const entries = index.byType.get(repoType) || [];
    const paged = buildCategoryResponse(entries, page);
    const heading = `Top ${formatLabel(repoType)} repositories by RepoScore`;
    const description = `Explore the highest scoring ${formatLabel(repoType)} repositories ranked by RepoScore.`;
    const basePath = `/repos/type/${encodeURIComponent(repoType)}`;

    res.type('html').send(
      renderCategoryPage({
        title: heading,
        description,
        canonicalUrl: `https://repoforge.dev${buildPageHref(basePath, paged.currentPage)}`,
        heading,
        entries: paged.entries,
        currentPage: paged.currentPage,
        totalPages: paged.totalPages,
        basePath,
        contextLinks: [
          { href: '/repos/top', label: 'Top repositories' },
          { href: '/repos/reposcore-80-plus', label: 'RepoScore 80+ pages' },
        ],
      })
    );
  } catch (error) {
    return next(error);
  }
});

router.get('/topic/:topic', async (req, res, next) => {
  try {
    const topic = slugifyCategoryValue(req.params.topic);
    const page = parsePageNumber(req.query.page);
    const index = await getRepoIndex();
    const entries = index.byTopic.get(topic) || [];
    const paged = buildCategoryResponse(entries, page);
    const heading = `Top ${formatLabel(topic)} repositories by RepoScore`;
    const description = `Explore the highest scoring repositories tagged with ${formatLabel(topic)} and ranked by RepoScore.`;
    const basePath = `/repos/topic/${encodeURIComponent(topic)}`;

    res.type('html').send(
      renderCategoryPage({
        title: heading,
        description,
        canonicalUrl: `https://repoforge.dev${buildPageHref(basePath, paged.currentPage)}`,
        heading,
        entries: paged.entries,
        currentPage: paged.currentPage,
        totalPages: paged.totalPages,
        basePath,
        contextLinks: [
          { href: '/repos/top', label: 'Top repositories' },
          { href: '/repos/reposcore-70-plus', label: 'RepoScore 70+ pages' },
        ],
      })
    );
  } catch (error) {
    return next(error);
  }
});

router.get('/top', async (req, res, next) => {
  try {
    const page = parsePageNumber(req.query.page);
    const index = await getRepoIndex();
    const paged = buildCategoryResponse(index.entries, page);
    const heading = 'Top GitHub repositories by RepoScore';
    const description = 'Browse the highest scoring cached GitHub repositories ranked by RepoScore.';
    const basePath = '/repos/top';

    res.type('html').send(
      renderCategoryPage({
        title: heading,
        description,
        canonicalUrl: `https://repoforge.dev${buildPageHref(basePath, paged.currentPage)}`,
        heading,
        entries: paged.entries,
        currentPage: paged.currentPage,
        totalPages: paged.totalPages,
        basePath,
        contextLinks: [
          { href: '/repos/reposcore-90-plus', label: 'RepoScore 90+' },
          { href: '/repos/reposcore-80-plus', label: 'RepoScore 80+' },
          { href: '/repos/reposcore-70-plus', label: 'RepoScore 70+' },
        ],
      })
    );
  } catch (error) {
    return next(error);
  }
});

router.get('/reposcore-90-plus', async (req, res, next) => {
  try {
    const page = parsePageNumber(req.query.page);
    const index = await getRepoIndex();
    const entries = getScoreBucketEntries(index.entries, 90);
    const paged = buildCategoryResponse(entries, page);
    const heading = 'RepoScore 90+ repositories';
    const description = 'Explore cached GitHub repositories with RepoScore results of 90 and above.';
    const basePath = '/repos/reposcore-90-plus';

    res.type('html').send(
      renderCategoryPage({
        title: heading,
        description,
        canonicalUrl: `https://repoforge.dev${buildPageHref(basePath, paged.currentPage)}`,
        heading,
        entries: paged.entries,
        currentPage: paged.currentPage,
        totalPages: paged.totalPages,
        basePath,
        contextLinks: [
          { href: '/repos/top', label: 'All top repositories' },
          { href: '/repos/reposcore-80-plus', label: 'RepoScore 80+' },
        ],
      })
    );
  } catch (error) {
    return next(error);
  }
});

router.get('/reposcore-80-plus', async (req, res, next) => {
  try {
    const page = parsePageNumber(req.query.page);
    const index = await getRepoIndex();
    const entries = getScoreBucketEntries(index.entries, 80);
    const paged = buildCategoryResponse(entries, page);
    const heading = 'RepoScore 80+ repositories';
    const description = 'Explore cached GitHub repositories with RepoScore results of 80 and above.';
    const basePath = '/repos/reposcore-80-plus';

    res.type('html').send(
      renderCategoryPage({
        title: heading,
        description,
        canonicalUrl: `https://repoforge.dev${buildPageHref(basePath, paged.currentPage)}`,
        heading,
        entries: paged.entries,
        currentPage: paged.currentPage,
        totalPages: paged.totalPages,
        basePath,
        contextLinks: [
          { href: '/repos/top', label: 'All top repositories' },
          { href: '/repos/reposcore-90-plus', label: 'RepoScore 90+' },
          { href: '/repos/reposcore-70-plus', label: 'RepoScore 70+' },
        ],
      })
    );
  } catch (error) {
    return next(error);
  }
});

router.get('/reposcore-70-plus', async (req, res, next) => {
  try {
    const page = parsePageNumber(req.query.page);
    const index = await getRepoIndex();
    const entries = getScoreBucketEntries(index.entries, 70);
    const paged = buildCategoryResponse(entries, page);
    const heading = 'RepoScore 70+ repositories';
    const description = 'Explore cached GitHub repositories with RepoScore results of 70 and above.';
    const basePath = '/repos/reposcore-70-plus';

    res.type('html').send(
      renderCategoryPage({
        title: heading,
        description,
        canonicalUrl: `https://repoforge.dev${buildPageHref(basePath, paged.currentPage)}`,
        heading,
        entries: paged.entries,
        currentPage: paged.currentPage,
        totalPages: paged.totalPages,
        basePath,
        contextLinks: [
          { href: '/repos/top', label: 'All top repositories' },
          { href: '/repos/reposcore-80-plus', label: 'RepoScore 80+' },
        ],
      })
    );
  } catch (error) {
    return next(error);
  }
});

router.get('/:owner/:repo', async (req, res, next) => {
  try {
    const owner = req.params.owner;
    const repo = req.params.repo;

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

router.getRepoIndex = getRepoIndex;
router.renderCategoryPage = renderCategoryPage;

module.exports = router;
