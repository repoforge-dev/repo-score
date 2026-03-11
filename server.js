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
  <meta name="description" content="Analyze GitHub repositories with RepoScore.">
  <style>
    :root {
      color-scheme: light;
      --bg: #f3f6fb;
      --panel: #ffffff;
      --text: #142033;
      --muted: #617085;
      --border: #e6e8ee;
      --accent: #0f5bd8;
      --shadow: 0 4px 10px rgba(0, 0, 0, 0.03);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(180deg, #f8fbff 0%, #f3f6fb 100%);
      color: var(--text);
    }
    .wrap {
      max-width: 1100px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .brand {
      display: inline-block;
      margin-bottom: 18px;
      color: var(--accent);
      text-decoration: none;
      font-size: 0.95rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .hero {
      margin-bottom: 28px;
      padding: 18px 0 6px;
    }
    h1 {
      margin: 0 0 12px;
      font-size: 42px;
      line-height: 1.08;
      letter-spacing: -0.02em;
    }
    .tagline {
      margin: 0 0 12px;
      color: var(--muted);
      font-size: 20px;
      line-height: 1.4;
    }
    .description {
      max-width: 760px;
      margin: 0;
      color: var(--muted);
      font-size: 16px;
      line-height: 1.6;
    }
    .panel {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      box-shadow: var(--shadow);
      padding: 28px;
      margin-bottom: 28px;
    }
    .analyzer-panel {
      padding: 28px;
    }
    .form {
      display: grid;
      grid-template-columns: minmax(0, 600px) auto;
      justify-content: start;
      gap: 12px;
      margin-bottom: 18px;
    }
    .input {
      width: 100%;
      padding: 12px;
      font-size: 16px;
      border-radius: 8px;
      border: 1px solid #dfe3ea;
      color: var(--text);
      background: #ffffff;
    }
    .button {
      background: #0f5bd8;
      color: #ffffff;
      padding: 12px 20px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-size: 16px;
      font-weight: 600;
    }
    .button:hover {
      background: #0c4cb4;
    }
    .examples {
      margin: 0;
      color: var(--muted);
      font-size: 15px;
      line-height: 1.8;
    }
    .examples a {
      color: var(--accent);
      text-decoration: none;
      font-weight: 600;
      margin-right: 18px;
    }
    .section-title {
      margin: 0 0 12px;
      font-size: 24px;
      line-height: 1.2;
      letter-spacing: -0.02em;
    }
    .section-copy {
      margin: 0 0 18px;
      color: var(--muted);
      font-size: 15px;
      line-height: 1.7;
    }
    .feature-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 20px;
    }
    .feature-card {
      border-radius: 12px;
      border: 1px solid #e6e8ee;
      padding: 22px;
      background: #ffffff;
      box-shadow: var(--shadow);
    }
    .feature-card h3 {
      margin: 0 0 10px;
      font-size: 18px;
      line-height: 1.25;
    }
    .feature-card p {
      margin: 0;
      color: var(--muted);
      font-size: 15px;
      line-height: 1.7;
    }
    .trust-links a {
      color: var(--accent);
      text-decoration: none;
      font-weight: 600;
      margin-right: 18px;
    }
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e5e8ef;
      font-size: 15px;
      text-align: center;
    }
    .footer a,
    .footer span {
      color: var(--muted);
      text-decoration: none;
      margin: 0 12px;
    }
    .footer a {
      color: var(--accent);
      font-weight: 600;
    }
    @media (max-width: 900px) {
      .feature-grid {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 640px) {
      .wrap {
        padding: 40px 16px;
      }
      .panel {
        padding: 24px;
      }
      .form {
        grid-template-columns: 1fr;
      }
      h1 {
        font-size: 34px;
      }
      .tagline {
        font-size: 18px;
      }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <a class="brand" href="/">RepoForge</a>
    <header class="hero">
      <h1>RepoForge</h1>
      <p class="tagline">Analyze GitHub repositories with RepoScore</p>
      <p class="description">Instantly evaluate documentation, structure, maintenance activity, discoverability, and adoption signals.</p>
    </header>

    <section class="panel analyzer-panel">
      <form class="form" id="repo-form">
        <input
          class="input"
          id="repo-input"
          name="repo"
          type="text"
          placeholder="owner/repo&#10;example: vercel/next.js"
          aria-label="GitHub repository"
          required
        >
        <button class="button" type="submit">Analyze</button>
      </form>
      <div class="examples">
        <a href="/repos/vercel/next.js">Analyze vercel/next.js</a>
        <a href="/repos/openai/openai-python">Analyze openai/openai-python</a>
        <a href="/repos/repoforge-dev/authority-layer">Analyze repoforge-dev/authority-layer</a>
      </div>
    </section>

    <section class="panel">
      <div class="feature-grid">
        <article class="feature-card">
          <h3>RepoScore</h3>
          <p>Evaluate repository quality across documentation, structure, discoverability, and maintenance signals.</p>
        </article>
        <article class="feature-card">
          <h3>Actionable Insights</h3>
          <p>Receive concrete suggestions to improve repository health and developer adoption.</p>
        </article>
        <article class="feature-card">
          <h3>AI Agent Safety</h3>
          <p>Identify projects designed for autonomous agents and discover runtime guardrails like AuthorityLayer.</p>
        </article>
      </div>
    </section>

    <section class="panel">
      <h2 class="section-title">Analyze Any GitHub Repository</h2>
      <p class="section-copy">RepoForge generates structured repository analysis pages that help developers understand project quality instantly.</p>
      <div class="trust-links">
        <a href="/repos/vercel/next.js">/repos/vercel/next.js</a>
        <a href="/repos/openai/openai-python">/repos/openai/openai-python</a>
      </div>
    </section>

    <footer class="footer">
      <a href="/">Browse repository analysis</a>
      <a href="https://github.com/repoforge-dev/repo-score">GitHub</a>
      <span>Powered by RepoScore</span>
    </footer>
  </div>
  <script>
    (function () {
      const form = document.getElementById('repo-form');
      const input = document.getElementById('repo-input');

      if (!form || !input) {
        return;
      }

      form.addEventListener('submit', function (event) {
        event.preventDefault();
        const value = String(input.value || '').trim().replace(/^https?:\\/\\/github\\.com\\//i, '').replace(/\\.git$/i, '').replace(/^\\/+|\\/+$/g, '');
        const match = value.match(/^([A-Za-z0-9_.-]+)\\/([A-Za-z0-9_.-]+)$/);

        if (!match) {
          input.focus();
          return;
        }

        window.location.href = '/repos/' + match[1] + '/' + match[2];
      });
    })();
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
