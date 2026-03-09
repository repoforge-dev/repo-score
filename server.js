'use strict';

const express = require('express');

const analyzeRoute = require('./api/analyze');
const badgeRouter = require('./api/badge');
const repoPageRoute = require('./api/repoPage');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

app.get('/', (_req, res) => {
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
