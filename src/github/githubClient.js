'use strict';

/**
 * githubClient.js
 *
 * Thin wrapper around the GitHub REST API (v3).
 * All network calls are centralised here so the rest of the application
 * never touches axios / HTTP directly.
 *
 * Environment variables:
 *   GITHUB_TOKEN  – Personal Access Token; optional but strongly recommended
 *                   to raise the rate-limit from 60 → 5,000 req/hour.
 */

const axios = require('axios');

const BASE_URL = 'https://api.github.com';

/** Build shared Axios headers. */
function buildHeaders() {
    const headers = {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
    };

    if (process.env.GITHUB_TOKEN) {
        headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    return headers;
}

/**
 * Fetch core repository metadata.
 *
 * @param {string} owner
 * @param {string} repo
 * @returns {Promise<object>} GitHub repo object
 */
async function getRepo(owner, repo) {
    const url = `${BASE_URL}/repos/${owner}/${repo}`;
    const response = await axios.get(url, { headers: buildHeaders() });
    return response.data;
}

/**
 * Fetch the repository's README (decoded from Base64).
 * Returns null if no README exists (404).
 *
 * @param {string} owner
 * @param {string} repo
 * @returns {Promise<string|null>} Plain-text README content, or null
 */
async function getReadme(owner, repo) {
    try {
        const url = `${BASE_URL}/repos/${owner}/${repo}/readme`;
        const response = await axios.get(url, { headers: buildHeaders() });
        const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
        return content;
    } catch (err) {
        if (err.response && err.response.status === 404) {
            return null;
        }
        throw err;
    }
}

/**
 * Fetch the full recursive file tree for the default branch.
 * Returns an array of tree entry objects: { path, type, sha, … }
 *
 * Uses ?recursive=1 so nested paths (e.g. .github/workflows/ci.yml)
 * are included — without this, subdirectories appear as a single entry.
 *
 * @param {string} owner
 * @param {string} repo
 * @returns {Promise<Array<object>>} Tree entries
 */
async function getTree(owner, repo) {
    // First grab the default branch SHA
    const repoData = await getRepo(owner, repo);
    const branch = repoData.default_branch;
    const branchUrl = `${BASE_URL}/repos/${owner}/${repo}/branches/${branch}`;
    const branchResp = await axios.get(branchUrl, { headers: buildHeaders() });
    const treeSha = branchResp.data.commit.commit.tree.sha;

    const treeUrl = `${BASE_URL}/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`;
    const treeResp = await axios.get(treeUrl, { headers: buildHeaders() });
    return treeResp.data.tree; // array of { path, type, sha, url }
}

module.exports = { getRepo, getReadme, getTree };
