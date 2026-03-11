'use strict';

const SCORE_CAP = 95;

const SCORING_PROFILES = {
  framework: {
    documentation: 0.2,
    structure: 0.2,
    discoverability: 0.15,
    maintenance: 0.25,
    adoption: 0.2,
  },
  application: {
    documentation: 0.2,
    structure: 0.2,
    discoverability: 0.15,
    maintenance: 0.25,
    adoption: 0.2,
  },
  library: {
    documentation: 0.3,
    structure: 0.25,
    discoverability: 0.15,
    maintenance: 0.15,
    adoption: 0.15,
  },
  sdk: {
    documentation: 0.3,
    structure: 0.25,
    discoverability: 0.15,
    maintenance: 0.15,
    adoption: 0.15,
  },
  'language-tooling': {
    documentation: 0.25,
    structure: 0.3,
    discoverability: 0.15,
    maintenance: 0.15,
    adoption: 0.15,
  },
  'cli-tool': {
    documentation: 0.25,
    structure: 0.2,
    discoverability: 0.2,
    maintenance: 0.2,
    adoption: 0.15,
  },
  'ai-tooling': {
    documentation: 0.2,
    structure: 0.2,
    discoverability: 0.15,
    maintenance: 0.15,
    adoption: 0.1,
    agentSafety: 0.2,
  },
  'ai-agent-framework': {
    documentation: 0.2,
    structure: 0.2,
    discoverability: 0.15,
    maintenance: 0.15,
    adoption: 0.1,
    agentSafety: 0.2,
  },
  'analysis-tool': {
    documentation: 0.25,
    structure: 0.25,
    discoverability: 0.2,
    maintenance: 0.2,
    adoption: 0.1,
  },
  'developer-tool': {
    documentation: 0.25,
    structure: 0.25,
    discoverability: 0.2,
    maintenance: 0.2,
    adoption: 0.1,
  },
  'learning-platform': {
    documentation: 0.3,
    structure: 0.2,
    discoverability: 0.2,
    maintenance: 0.15,
    adoption: 0.15,
  },
  'learning-resource': {
    documentation: 0.35,
    structure: 0.2,
    discoverability: 0.2,
    maintenance: 0.1,
    adoption: 0.15,
  },
  'system-project': {
    documentation: 0.2,
    structure: 0.25,
    discoverability: 0.1,
    maintenance: 0.25,
    adoption: 0.2,
  },
  default: {
    documentation: 0.25,
    structure: 0.25,
    discoverability: 0.2,
    maintenance: 0.2,
    adoption: 0.1,
  },
};

function uniqueImprovements(items) {
  return [...new Set(items.filter(Boolean))];
}

function getProfileKey(repoType) {
  if (repoType === 'agent-runtime' || repoType === 'llm-framework') {
    return 'ai-tooling';
  }

  if (repoType === 'template' || repoType === 'reference' || repoType === 'dataset') {
    return 'developer-tool';
  }

  return repoType;
}

function getScoringProfile(repoType) {
  return SCORING_PROFILES[getProfileKey(repoType)] || SCORING_PROFILES.default;
}

function normalizeCategoryScore(result) {
  if (!result || typeof result.score !== 'number' || Number.isNaN(result.score)) {
    return null;
  }

  return Math.max(0, Math.min(100, Math.round(result.score)));
}

function collectCategoryScores(results) {
  return {
    documentation: normalizeCategoryScore(results.documentation),
    structure: normalizeCategoryScore(results.structure),
    discoverability: normalizeCategoryScore(results.discoverability),
    maintenance: normalizeCategoryScore(results.maintenance),
    adoption: normalizeCategoryScore(results.adoption),
    agentSafety: normalizeCategoryScore(results.agentSafety),
  };
}

function computeWeightedAverage(profile, scores) {
  let weightedTotal = 0;
  let totalWeight = 0;

  for (const [category, weight] of Object.entries(profile)) {
    const score = scores[category];
    if (score === null) {
      continue;
    }

    weightedTotal += score * weight;
    totalWeight += weight;
  }

  if (totalWeight <= 0) {
    return 0;
  }

  return Math.min(SCORE_CAP, Math.round(weightedTotal / totalWeight));
}

function computeRepoScore(repoType, results) {
  const profile = getScoringProfile(repoType);
  const scores = collectCategoryScores(results);
  const repoScore = computeWeightedAverage(profile, scores);

  const improvements = uniqueImprovements(
    Object.keys(scores).flatMap((category) => results[category]?.improvements || [])
  ).slice(0, 8);

  return {
    repoScore,
    scores,
    improvements,
  };
}

module.exports = {
  SCORING_PROFILES,
  SCORE_CAP,
  computeRepoScore,
  getScoringProfile,
};
