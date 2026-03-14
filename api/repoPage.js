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
      color-scheme: dark;
      --bg: #0B0F14;
      --panel: #11161D;
      --text: #E6EDF3;
      --muted: #8B949E;
      --border: #1F2937;
      --accent: #3B82F6;
      --success: #10B981;
      --shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      font-size: 15px;
      line-height: 1.6;
    }
    .top-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 32px;
      background: var(--panel);
      border-bottom: 1px solid var(--border);
    }
    .nav-left {
      display: flex;
      align-items: center;
      gap: 24px;
    }
    .brand {
      font-size: 1.2rem;
      font-weight: 700;
      color: var(--text);
      text-decoration: none;
    }
    .nav-links {
      display: flex;
      gap: 16px;
    }
    .nav-links a {
      color: var(--muted);
      text-decoration: none;
      font-size: 0.95rem;
    }
    .nav-links a:hover { color: var(--text); }
    .search-bar { display: flex; align-items: center; }
    .search-input {
      background: var(--bg);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 0.9rem;
      width: 250px;
    }
    .search-input:focus {
      outline: none;
      border-color: var(--accent);
    }
    .wrap {
      max-width: 1100px;
      margin: 0 auto;
      padding: 32px 20px;
    }
    h1, h2, h3 { color: var(--text); font-weight: 700; margin: 0 0 16px; }
    p { margin: 0 0 16px; color: var(--muted); }
    .panel {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .footer {
      border-top: 1px solid var(--border);
      padding: 32px 0;
      margin-top: 48px;
      text-align: center;
      color: var(--muted);
    }
    .footer p { margin: 0 0 16px; }
    .footer-links {
      display: flex;
      justify-content: center;
      gap: 24px;
    }
    .footer-links a {
      color: var(--muted);
      text-decoration: none;
    }
    .footer-links a:hover { color: var(--text); }
    @media (max-width: 900px) {
      .top-nav { flex-direction: column; gap: 16px; align-items: stretch; padding: 16px; }
      .nav-left { flex-direction: column; align-items: stretch; }
      .nav-links { justify-content: space-between; flex-wrap: wrap; }
      .search-input { width: 100%; }
    }
  `;
}

function getRepoPageStyles() {
  return `
    ${getBaseStyles()}
    .repo-header { margin-bottom: 32px; }
    .repo-subtitle { font-size: 1.1rem; color: var(--muted); margin-bottom: 16px; text-decoration: none; display: inline-block; }
    .repo-subtitle:hover { color: var(--text); text-decoration: underline; }
    .repo-title { font-size: 2.5rem; letter-spacing: -0.02em; margin: 0; display: inline-block; vertical-align: middle; }
    .repo-header-top { display: flex; align-items: center; gap: 16px; margin-bottom: 8px; flex-wrap: wrap; }
    .actions { display: flex; align-items: center; gap: 16px; margin-top: 16px; }
    .actions a { color: var(--accent); font-weight: 600; text-decoration: none; }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .stat-card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
    }
    .stat-label {
      display: block;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--muted);
      margin-bottom: 8px;
    }
    .stat-val {
      display: block;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text);
      text-decoration: none;
    }
    .stat-val.score { color: var(--success); font-size: 2rem; }
    .layout-core {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 24px;
      align-items: start;
    }
    .score-list { list-style: none; padding: 0; margin: 0; }
    .score-list li { margin-bottom: 16px; }
    .score-bar-bg {
      background: var(--bg);
      border-radius: 4px;
      height: 8px;
      overflow: hidden;
      margin-top: 8px;
      border: 1px solid var(--border);
    }
    .score-bar-fill {
      background: var(--success);
      height: 100%;
    }
    .score-row-top { display: flex; justify-content: space-between; align-items: center; }
    .score-label { font-weight: 600; color: var(--text); }
    .score-num { font-weight: 700; color: var(--text); }
    .suggestions { margin: 0; padding-left: 20px; line-height: 1.6; }
    .suggestions li { margin-bottom: 12px; color: var(--text); }
    .badge-box {
      background: var(--bg);
      border: 1px solid var(--border);
      padding: 16px;
      border-radius: 8px;
      font-family: monospace;
      color: var(--muted);
      font-size: 14px;
      white-space: pre-wrap;
      word-break: break-all;
      margin: 0;
    }
    .btn-copy {
      background: var(--panel);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
    }
    .btn-copy:hover { border-color: var(--muted); }
    .flex-between { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .similar-list { list-style: none; padding: 0; margin: 0; }
    .similar-list li { margin-bottom: 10px; }
    .similar-list a { color: var(--accent); text-decoration: none; font-weight: 600; }
    @media (max-width: 900px) {
      .layout-core { grid-template-columns: 1fr; }
    }
  `;
}

function getCategoryPageStyles() {
  return `
    ${getBaseStyles()}
    .category-title { font-size: 2.5rem; letter-spacing: -0.02em; }
    .category-subtitle { font-size: 1.2rem; color: var(--muted); margin-bottom: 32px; }
    .repo-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 16px; }
    .repo-item {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .repo-main h3 { margin: 0 0 8px; font-size: 1.25rem; }
    .repo-main a { color: var(--text); text-decoration: none; }
    .repo-main a:hover { color: var(--accent); }
    .repo-meta { display: flex; gap: 16px; color: var(--muted); font-size: 0.9rem; }
    .repo-score-box { text-align: right; }
    .repo-score-num { font-size: 1.5rem; font-weight: 700; color: var(--success); }
    .repo-score-label { font-size: 0.8rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .pagination { display: flex; justify-content: space-between; align-items: center; margin-top: 32px; }
    .pagination a { color: var(--accent); text-decoration: none; font-weight: 600; background: var(--panel); padding: 8px 16px; border-radius: 6px; border: 1px solid var(--border); }
    .pagination a:hover { border-color: var(--accent); }
    @media (max-width: 600px) {
      .repo-item { flex-direction: column; align-items: flex-start; gap: 16px; }
      .repo-score-box { text-align: left; }
    }
  `;
}

function renderScoreItems(scores) {
  return Object.entries(scores)
    .map(([key, value]) => {
      const numValue = Number(value) || 0;
      const displayValue = value === null ? 'N/A' : value;
      return `<li>
          <div class="score-row-top">
            <span class="score-label">${escapeHtml(formatLabel(key))}</span>
            <span class="score-num">${escapeHtml(displayValue)}</span>
          </div>
          <div class="score-bar-bg">
            <div class="score-bar-fill" style="width: ${numValue}%"></div>
          </div>
        </li>`;
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

  const starsDisplay = analysis.snapshot?.repoMetadata?.stargazers_count ? Number(analysis.snapshot.repoMetadata.stargazers_count).toLocaleString() : 'N/A';
  const updatedDisplay = analysis.snapshot?.repoMetadata?.updated_at ? new Date(analysis.snapshot.repoMetadata.updated_at).toLocaleDateString() : 'N/A';

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
  <header class="top-nav">
    <div class="nav-left">
      <a class="brand" href="/">RepoForge</a>
      <nav class="nav-links">
        <a href="/repos/type/all">Repositories</a>
        <a href="/repos/language/all">Languages</a>
        <a href="/repos/topic/all">Topics</a>
        <a href="/repos/top">Top Repositories</a>
        <a href="/about">About</a>
      </nav>
    </div>
    <form class="search-bar" id="global-search-form">
      <input class="search-input" id="global-search-input" placeholder="Search GitHub repo..." required>
      <button style="display:none" type="submit"></button>
    </form>
  </header>

  <div class="wrap">
    <div class="repo-header">
      <div class="repo-header-top">
        <h1 class="repo-title">${escapeHtml(repoName)}</h1>
        <img src="${escapeHtml(badgeUrl)}" alt="RepoScore badge">
      </div>
      <a class="repo-subtitle" href="${escapeHtml(githubUrl)}" target="_blank" rel="noreferrer">View on GitHub</a>
    </div>

    <div class="summary-grid">
      <div class="stat-card">
        <span class="stat-label">RepoScore</span>
        <span class="stat-val score">${escapeHtml(analysis.repoScore)}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Repo Type</span>
        <a href="${escapeHtml(links.repoTypeUrl)}" class="stat-val">${escapeHtml(formatLabel(analysis.repoType))}</a>
      </div>
      <div class="stat-card">
        <span class="stat-label">Primary Language</span>
        <a href="${escapeHtml(links.languageUrl)}" class="stat-val">${escapeHtml(formatLabel(analysis.language))}</a>
      </div>
      <div class="stat-card">
        <span class="stat-label">Stars</span>
        <span class="stat-val">${escapeHtml(starsDisplay)}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Last Updated</span>
        <span class="stat-val">${escapeHtml(updatedDisplay)}</span>
      </div>
    </div>

    <main class="layout-core">
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
        <section class="panel badge-section">
          <div class="flex-between">
            <h3 style="margin:0;">Add RepoScore Badge</h3>
            <button class="btn-copy" type="button" onclick="copyBadgeSnippet()">Copy</button>
          </div>
          <pre class="badge-box" id="badge-snippet">${escapeHtml(badgeMarkdown)}</pre>
        </section>

        ${showAuthorityLayer ? `<section class="panel">
          <h3>Secure AI Agents with AuthorityLayer</h3>
          <p>Add runtime guardrails and budget limits to autonomous agents using AuthorityLayer.</p>
          <a href="${escapeHtml(authorityLayerUrl)}" target="_blank" rel="noreferrer" style="color:var(--accent);font-weight:600;text-decoration:none;">View AuthorityLayer on GitHub</a>
        </section>` : ''}
        
        <section class="panel">
          <h3>Similar Repositories</h3>
          <ul class="similar-list">
            <li><a href="${escapeHtml(links.languageUrl)}">Explore ${escapeHtml(formatLabel(analysis.language))} projects</a></li>
            <li><a href="${escapeHtml(links.repoTypeUrl)}">Explore ${escapeHtml(formatLabel(analysis.repoType))} projects</a></li>
          </ul>
        </section>
      </div>
    </main>

    <footer class="footer">
      <p><strong>About RepoForge</strong><br>RepoForge analyzes GitHub repositories to help developers discover high-quality open-source projects.</p>
      <div class="footer-links">
        <a href="/docs">Documentation</a>
        <a href="https://github.com/repoforge-dev/repo-score">GitHub</a>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
      </div>
    </footer>
  </div>

  <script>
    function copyBadgeSnippet() {
      const button = document.querySelector('.btn-copy');
      const snippet = document.getElementById('badge-snippet');
      if (!button || !snippet || !navigator.clipboard) return;
      navigator.clipboard.writeText(snippet.textContent).then(() => {
        const original = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() => button.textContent = original, 1500);
      }).catch(() => {});
    }

    function setupSearch(formId, inputId) {
      const form = document.getElementById(formId);
      const input = document.getElementById(inputId);
      if (!form || !input) return;
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        const value = String(input.value || '').trim()
          .replace(/^https?:\\/\\/github\\.com\\//i, '')
          .replace(/\\.git$/i, '')
          .replace(/^\\/+|\\/+$/g, '');
        const match = value.match(/^([A-Za-z0-9_.-]+)\\/([A-Za-z0-9_.-]+)$/);
        if (!match) { input.focus(); return; }
        window.location.href = '/repos/' + match[1] + '/' + match[2];
      });
    }
    setupSearch('global-search-form', 'global-search-input');
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
    return '<p class="empty-state">No repositories found.</p>';
  }
  return `<ul class="repo-list">${entries
    .map((entry) => `
      <li class="repo-item">
        <div class="repo-main">
          <h3><a href="/repos/${encodeURIComponent(entry.owner)}/${encodeURIComponent(entry.repo)}">${escapeHtml(entry.fullName)}</a></h3>
          <div class="repo-meta">
            <span>${escapeHtml(formatLabel(entry.repoType))}</span>
            <span>${escapeHtml(formatLabel(entry.language))}</span>
          </div>
        </div>
        <div class="repo-score-box">
          <div class="repo-score-num">${escapeHtml(entry.repoScore)}</div>
          <div class="repo-score-label">RepoScore</div>
        </div>
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
  <header class="top-nav">
    <div class="nav-left">
      <a class="brand" href="/">RepoForge</a>
      <nav class="nav-links">
        <a href="/repos/type/all">Repositories</a>
        <a href="/repos/language/all">Languages</a>
        <a href="/repos/topic/all">Topics</a>
        <a href="/repos/top">Top Repositories</a>
        <a href="/about">About</a>
      </nav>
    </div>
    <form class="search-bar" id="global-search-form">
      <input class="search-input" id="global-search-input" placeholder="Search GitHub repo..." required>
      <button style="display:none" type="submit"></button>
    </form>
  </header>

  <div class="wrap">
    <div class="repo-header">
      <h1 class="category-title">${escapeHtml(heading)}</h1>
      <p class="category-subtitle">${escapeHtml(description)}</p>
      ${contextLinks.length ? `<div style="margin-bottom: 24px;">${contextLinks
      .map((link) => `<a href="${escapeHtml(link.href)}" style="color:var(--accent);margin-right:16px;text-decoration:none;">${escapeHtml(link.label)}</a>`)
      .join('')}</div>` : ''}
    </div>

    <main>
      <section class="panel" style="background:transparent;border:none;padding:0;">
        ${renderRepositoryList(entries)}
        ${renderPagination(basePath, currentPage, totalPages)}
      </section>
    </main>

    <footer class="footer">
      <p><strong>About RepoForge</strong><br>RepoForge analyzes GitHub repositories to help developers discover high-quality open-source projects.</p>
      <div class="footer-links">
        <a href="/docs">Documentation</a>
        <a href="https://github.com/repoforge-dev/repo-score">GitHub</a>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
      </div>
    </footer>
  </div>
  <script>
    function setupSearch(formId, inputId) {
      const form = document.getElementById(formId);
      const input = document.getElementById(inputId);
      if (!form || !input) return;
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        const value = String(input.value || '').trim()
          .replace(/^https?:\\/\\/github\\.com\\//i, '')
          .replace(/\\.git$/i, '')
          .replace(/^\\/+|\\/+$/g, '');
        const match = value.match(/^([A-Za-z0-9_.-]+)\\/([A-Za-z0-9_.-]+)$/);
        if (!match) { input.focus(); return; }
        window.location.href = '/repos/' + match[1] + '/' + match[2];
      });
    }
    setupSearch('global-search-form', 'global-search-input');
  </script>
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
