'use strict';

const fs = require('fs/promises');
const path = require('path');

const CACHE_DIR = path.join(__dirname, '..', 'data', 'repos');
const CACHE_TTL_MS = Number.parseInt(process.env.REPO_CACHE_TTL_MS || `${24 * 60 * 60 * 1000}`, 10);

function getCacheFilePath(owner, repo) {
  const safeSlug = `${owner}-${repo}`.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
  return path.join(CACHE_DIR, `${safeSlug}.json`);
}

async function ensureCacheDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

async function readRepoCache(owner, repo) {
  const filePath = getCacheFilePath(owner, repo);

  try {
    await ensureCacheDir();

    const payload = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(payload);
    const cachedAt = parsed.cachedAt ? new Date(parsed.cachedAt).getTime() : Number.NaN;
    const stats = await fs.stat(filePath);
    const cacheAge = Number.isFinite(cachedAt) ? Date.now() - cachedAt : Date.now() - stats.mtimeMs;

    if (CACHE_TTL_MS > 0 && cacheAge > CACHE_TTL_MS) {
      return null;
    }

    return parsed;
  } catch (error) {
    if (error.code === 'ENOENT' || error.name === 'SyntaxError') {
      return null;
    }

    throw error;
  }
}

async function hasRepoCache(owner, repo) {
  const filePath = getCacheFilePath(owner, repo);

  try {
    await ensureCacheDir();
    await fs.access(filePath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

async function writeRepoCache(owner, repo, payload) {
  const filePath = getCacheFilePath(owner, repo);

  await ensureCacheDir();
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  return filePath;
}

module.exports = {
  CACHE_TTL_MS,
  getCacheFilePath,
  hasRepoCache,
  readRepoCache,
  writeRepoCache,
};
