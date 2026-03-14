'use strict';

const express = require('express');

const analyzeRoute = require('./api/analyze');
const badgeRouter = require('./api/badge');
const repoPageRoute = require('./api/repoPage');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

function renderHomePage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>RepoForge</title>
  <meta name="description" content="RepoForge analyzes GitHub repositories to help developers discover high-quality open-source projects.">
  <style>
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
    .nav-links a:hover {
      color: var(--text);
    }
    .search-bar {
      display: flex;
      align-items: center;
    }
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
      padding: 40px 20px;
    }
    .hero {
      text-align: center;
      margin-bottom: 48px;
    }
    h1 {
      margin: 0 0 16px;
      font-size: 3rem;
      line-height: 1.2;
      letter-spacing: -0.02em;
      font-weight: 700;
    }
    .tagline {
      margin: 0 auto 32px;
      color: var(--muted);
      font-size: 1.25rem;
      line-height: 1.5;
      max-width: 600px;
    }
    .hero-form {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-bottom: 24px;
    }
    .hero-input {
      background: var(--panel);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 14px 20px;
      border-radius: 8px;
      font-size: 1rem;
      width: 400px;
    }
    .hero-input:focus {
      outline: none;
      border-color: var(--accent);
    }
    .btn {
      background: var(--accent);
      color: #fff;
      padding: 14px 24px;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      border: none;
      cursor: pointer;
      text-decoration: none;
    }
    .btn:hover { background: #2563eb; }
    .btn-secondary {
      background: var(--panel);
      border: 1px solid var(--border);
      color: var(--text);
    }
    .btn-secondary:hover { background: var(--border); }
    .feature-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 24px;
      margin-bottom: 48px;
    }
    .feature-card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
    }
    .feature-card h3 {
      margin: 0 0 12px;
      font-size: 1.2rem;
      font-weight: 700;
    }
    .feature-card p {
      margin: 0;
      color: var(--muted);
      font-size: 1rem;
    }
    .category-section {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 32px;
      margin-bottom: 48px;
    }
    .category-section h2 {
      margin: 0 0 24px;
      font-size: 1.5rem;
      font-weight: 700;
    }
    .category-links {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }
    .category-links a {
      color: var(--accent);
      text-decoration: none;
      font-weight: 600;
      padding: 12px 20px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--bg);
    }
    .category-links a:hover {
      border-color: var(--accent);
      background: rgba(59, 130, 246, 0.1);
    }
    .footer {
      border-top: 1px solid var(--border);
      padding: 32px 0;
      margin-top: 48px;
      text-align: center;
      color: var(--muted);
    }
    .footer p {
      margin: 0 0 16px;
    }
    .footer-links {
      display: flex;
      justify-content: center;
      gap: 24px;
    }
    .footer-links a {
      color: var(--muted);
      text-decoration: none;
    }
    .footer-links a:hover {
      color: var(--text);
    }
    @media (max-width: 900px) {
      .feature-grid { grid-template-columns: 1fr; }
      .hero-input { width: 100%; max-width: 400px; }
      .hero-form { flex-direction: column; align-items: center; }
      .hero-form .btn { width: 100%; max-width: 400px; }
      .top-nav { flex-direction: column; gap: 16px; align-items: stretch; padding: 16px; }
      .nav-left { flex-direction: column; align-items: stretch; }
      .nav-links { justify-content: space-between; flex-wrap: wrap; }
      .search-input { width: 100%; }
    }
  </style>
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
    <section class="hero">
      <h1>Analyze GitHub Repositories with RepoScore</h1>
      <p class="tagline">RepoForge evaluates open-source repositories for quality, structure, maintainability, and developer trust.</p>
      
      <form class="hero-form" id="hero-form">
        <input class="hero-input" id="hero-input" placeholder="Search GitHub repository (example: vercel/next.js)" required>
        <button class="btn" type="submit">Analyze</button>
      </form>
      
      <a href="/repos/top" class="btn btn-secondary">Explore Top Repositories</a>
    </section>

    <section class="feature-grid">
      <div class="feature-card">
        <h3>RepoScore</h3>
        <p>Evaluate repository quality across documentation, structure, maintenance, and adoption.</p>
      </div>
      <div class="feature-card">
        <h3>Repository Discovery</h3>
        <p>Explore top open-source projects by language, category, and score.</p>
      </div>
      <div class="feature-card">
        <h3>Developer Trust</h3>
        <p>Understand the health and reliability of repositories before using them.</p>
      </div>
    </section>

    <section class="category-section">
      <h2>Explore Categories</h2>
      <div class="category-links">
        <a href="/repos/top">Top Repositories</a>
        <a href="/repos/topic/ai">Top AI Repositories</a>
        <a href="/repos/language/typescript">Top TypeScript Repositories</a>
        <a href="/repos/language/python">Top Python Libraries</a>
      </div>
    </section>

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
        
        if (!match) {
          input.focus();
          return;
        }
        window.location.href = '/repos/' + match[1] + '/' + match[2];
      });
    }
    
    setupSearch('global-search-form', 'global-search-input');
    setupSearch('hero-form', 'hero-input');
  </script>
</body>
</html>`;
}

app.get('/', (_req, res) => {
  res.type('html').send(renderHomePage());
});

app.get('/health', (_req, res) => {
  res.json({ status: 'RepoForge API running' });
});

app.use('/api/analyze', analyzeRoute);
app.use('/badge', badgeRouter);
app.use('/repos', repoPageRoute);

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

app.use((err, _req, res, _next) => {
  const status = Number.isInteger(err.status) ? err.status : 500;
  const message = err.expose ? err.message : status >= 500 ? 'Internal server error.' : err.message;

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({
    error: message,
  });
});

app.listen(PORT, () => {
  console.log(`RepoForge API running on port ${PORT}`);
});
