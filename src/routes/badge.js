'use strict';

/**
 * GET /api/badge/:owner/:repo
 *
 * Returns an SVG badge displaying the RepoScore for the given repository.
 * The badge is suitable for embedding directly in a GitHub README.
 *
 * Example:
 *   GET /api/badge/facebook/react
 */

const express = require('express');
const router = express.Router();

const { parseRepoUrl } = require('../utils/repoParser');
const githubClient = require('../github/githubClient');
const metadataAnalyzer = require('../analyzers/metadataAnalyzer');
const readmeAnalyzer = require('../analyzers/readmeAnalyzer');
const structureAnalyzer = require('../analyzers/structureAnalyzer');
const { computeScore } = require('../scoring/scoreEngine');
const { generateBadgeSvg } = require('../utils/badgeGenerator');

router.get('/:owner/:repo', async (req, res, next) => {
    try {
        const { owner, repo } = req.params;

        // Fetch and analyze (same pipeline as /api/analyze)
        const repoData = await githubClient.getRepo(owner, repo);
        const readmeData = await githubClient.getReadme(owner, repo);
        const treeData = await githubClient.getTree(owner, repo);

        const metadataResult = metadataAnalyzer.analyze(repoData);
        const readmeResult = readmeAnalyzer.analyze(readmeData);
        const structureResult = structureAnalyzer.analyze(treeData);

        const { score } = computeScore({ metadataResult, readmeResult, structureResult });

        // Return the SVG badge
        const svg = generateBadgeSvg(score);

        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=3600'); // cache for 1 hour
        return res.send(svg);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
