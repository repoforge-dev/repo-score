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
      --bg: #f5f7fb;
      --panel: #ffffff;
      --text: #142033;
      --muted: #617085;
      --border: #dfe3ea;
      --accent: #0f5bd8;
      --shadow: 0 4px 10px rgba(0, 0, 0, 0.03);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      background: var(--bg);
      color: var(--text);
    }
    .wrap {
      max-width: 900px;
      margin: 0 auto;
      padding: 60px 20px;
    }
    .panel {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      box-shadow: var(--shadow);
      padding: 32px;
    }
    .brand {
      display: inline-block;
      margin-bottom: 16px;
      color: var(--accent);
      text-decoration: none;
      font-size: 0.95rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    h1 {
      margin: 0 0 10px;
      font-size: 32px;
      line-height: 1.15;
      letter-spacing: -0.02em;
    }
    .tagline {
      margin: 0 0 28px;
      color: var(--muted);
      font-size: 16px;
      line-height: 1.6;
    }
    .form {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 12px;
      margin-bottom: 22px;
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
      padding: 12px 18px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-size: 16px;
      font-weight: 700;
    }
    .button:hover {
      background: #0c4cb4;
    }
    .examples {
      margin: 0 0 30px;
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
    .footer {
      margin-top: 30px;
      padding-top: 18px;
      border-top: 1px solid #e5e8ef;
      color: var(--muted);
      font-size: 15px;
      text-align: center;
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
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="panel">
      <a class="brand" href="/">RepoForge</a>
      <header>
        <h1>RepoForge</h1>
        <p class="tagline">Analyze GitHub repositories with RepoScore</p>
      </header>
      <section>
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
        </div>
      </section>
      <footer class="footer">
        <div>Powered by RepoScore</div>
        <div>GitHub repository analysis</div>
      </footer>
    </div>
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
