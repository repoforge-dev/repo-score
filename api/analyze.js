'use strict';

const express = require('express');

const { readRepoCache, writeRepoCache } = require('../cache/repoCache');
const { analyzeAdoption } = require('../analyzer/adoptionAnalyzer');
const { analyzeAgentSafety } = require('../analyzer/agentSafetyAnalyzer');
const { analyzeDiscoverability } = require('../analyzer/discoverabilityAnalyzer');
const { fetchRepositorySnapshot } = require('../analyzer/fetchRepo');
const { analyzeMaintenance } = require('../analyzer/maintenanceAnalyzer');
const { analyzeReadme } = require('../analyzer/readmeAnalyzer');
const { detectRepoType } = require('../analyzer/repoTypeDetector');
const { analyzeStructure } = require('../analyzer/structureAnalyzer');
const { computeRepoScore } = require('../scoring/scoreEngine');

const AGENT_SAFETY_REPO_TYPES = new Set([
  'ai-agent-framework',
  'ai-tooling',
  'llm-framework',
  'agent-runtime',
]);
const ANALYSIS_MODEL_VERSION = 6;

function hasCurrentAnalysisSchema(analysis) {
  if (!analysis || typeof analysis !== 'object' || !analysis.scores || typeof analysis.scores !== 'object') {
    return false;
  }

  const hasAdoption = Object.prototype.hasOwnProperty.call(analysis.scores, 'adoption');
  const hasAgentSafety = Object.prototype.hasOwnProperty.call(analysis.scores, 'agentSafety');

  return hasAdoption && hasAgentSafety;
}

function hasCurrentCachedAnalysis(cachePayload) {
  return Boolean(
    cachePayload &&
      cachePayload.analysisModelVersion === ANALYSIS_MODEL_VERSION &&
      hasCurrentAnalysisSchema(cachePayload.analysis)
  );
}

const router = express.Router();

function parseRepositoryInput(repoValue) {
  const normalized = String(repoValue || '')
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/^\/+|\/+$/g, '');

  const match = normalized.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (!match) {
    const error = new Error('Query parameter `repo` must be in the format `owner/repo`.');
    error.status = 400;
    throw error;
  }

  return {
    owner: match[1],
    repo: match[2],
    fullName: `${match[1]}/${match[2]}`,
  };
}

async function buildRepoAnalysis(owner, repo) {
  const cached = await readRepoCache(owner, repo);
  if (hasCurrentCachedAnalysis(cached)) {
    return cached.analysis;
  }

  let snapshot;
  try {
    snapshot = cached?.snapshot || (await fetchRepositorySnapshot(owner, repo));
  } catch (error) {
    const analysisError = new Error('Repository could not be analyzed');
    analysisError.status = 502;
    analysisError.expose = true;
    throw analysisError;
  }

  const repoType = detectRepoType(snapshot);

  const documentation = analyzeReadme(snapshot);
  const structure = analyzeStructure(snapshot);
  const discoverability = analyzeDiscoverability(snapshot);
  const maintenance = analyzeMaintenance(snapshot);
  const adoption = analyzeAdoption(snapshot);
  const agentSafety = AGENT_SAFETY_REPO_TYPES.has(repoType)
    ? analyzeAgentSafety(snapshot, repoType)
    : null;

  const scoring = computeRepoScore(repoType, {
    documentation,
    structure,
    discoverability,
    maintenance,
    adoption,
    agentSafety,
  });

  const payload = {
    repo: `${owner}/${repo}`,
    repoType,
    language: snapshot.repoMetadata?.language
      ? String(snapshot.repoMetadata.language).toLowerCase()
      : 'unknown',
    repoScore: scoring.repoScore,
    scores: scoring.scores,
    improvements: scoring.improvements,
    analyzedAt: new Date().toISOString(),
  };

  await writeRepoCache(owner, repo, {
    cachedAt: new Date().toISOString(),
    analysisModelVersion: ANALYSIS_MODEL_VERSION,
    snapshot,
    analysis: payload,
  });

  return payload;
}

router.get('/', async (req, res, next) => {
  try {
    if (!req.query.repo) {
      return res.status(400).json({
        error: 'Query parameter `repo` must be in the format `owner/repo`.',
      });
    }

    const { owner, repo } = parseRepositoryInput(req.query.repo);
    const analysis = await buildRepoAnalysis(owner, repo);
    return res.json(analysis);
  } catch (error) {
    return next(error);
  }
});

router.buildRepoAnalysis = buildRepoAnalysis;
router.hasCurrentCachedAnalysis = hasCurrentCachedAnalysis;
router.hasCurrentAnalysisSchema = hasCurrentAnalysisSchema;
router.parseRepositoryInput = parseRepositoryInput;

module.exports = router;
