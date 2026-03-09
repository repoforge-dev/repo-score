'use strict';

/**
 * repoParser.js
 *
 * Utility for extracting the owner and repository name from a GitHub URL.
 *
 * Supported URL formats:
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo.git
 *   http://github.com/owner/repo
 *   github.com/owner/repo          (no scheme)
 *   git@github.com:owner/repo.git  (SSH)
 */

const GITHUB_HTTPS_RE = /^(?:https?:\/\/)?github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/i;
const GITHUB_SSH_RE = /^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/i;

/**
 * Parse a GitHub URL and return the owner and repo name.
 *
 * @param {string} url  Any of the supported GitHub URL formats.
 * @returns {{ owner: string, repo: string }}
 * @throws {Error} If the URL cannot be parsed as a GitHub repository URL.
 */
function parseRepoUrl(url) {
    if (typeof url !== 'string') {
        throw new Error('Repository URL must be a string.');
    }

    const trimmed = url.trim();

    let match = trimmed.match(GITHUB_HTTPS_RE) || trimmed.match(GITHUB_SSH_RE);

    if (!match) {
        throw new Error(`Cannot parse GitHub repository URL: "${trimmed}"`);
    }

    const [, owner, repo] = match;

    if (!owner || !repo) {
        throw new Error(`Incomplete GitHub repository URL: "${trimmed}"`);
    }

    return { owner, repo };
}

module.exports = { parseRepoUrl };
