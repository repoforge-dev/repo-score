'use strict';

/**
 * POST /api/analyze
 *
 * Body: { repoUrl: "https://github.com/owner/repo" }
 *
 * Returns a RepoScore and per-category breakdown for the given repository.
 */

const express = require('express');
const router = express.Router();

const { parseRepoUrl } = require('../utils/repoParser');
const githubClient = require('../github/githubClient');
const metadataAnalyzer = require('../analyzers/metadataAnalyzer');
const readmeAnalyzer = require('../analyzers/readmeAnalyzer');
const structureAnalyzer = require('../analyzers/structureAnalyzer');
const { computeScore } = require('../scoring/scoreEngine');

router.post('/', async (req, res, next) => {
    try {
        const { repoUrl } = req.body;

        if (!repoUrl) {
            return res.status(400).json({ error: '`repoUrl` is required.' });
        }

        // 1. Parse the GitHub URL into owner + repo name
        //    parseRepoUrl throws on invalid/non-GitHub URLs → surface as 400
        let owner, repo;
        try {
            ({ owner, repo } = parseRepoUrl(repoUrl));
        } catch (parseErr) {
            return res.status(400).json({ error: `Invalid GitHub repository URL: ${parseErr.message}` });
        }

        // 2. Fetch raw data from the GitHub API
        const repoData = await githubClient.getRepo(owner, repo);
        const readmeData = await githubClient.getReadme(owner, repo);
        const treeData = await githubClient.getTree(owner, repo);

        // 3. Run analyzers
        const metadataResult = metadataAnalyzer.analyze(repoData);
        const readmeResult = readmeAnalyzer.analyze(readmeData);
        const structureResult = structureAnalyzer.analyze(treeData);

        // 4. Combine results into a final RepoScore
        const scoreResult = computeScore({ metadataResult, readmeResult, structureResult });

        return res.json({
            repo: `${owner}/${repo}`,
            ...scoreResult,
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
