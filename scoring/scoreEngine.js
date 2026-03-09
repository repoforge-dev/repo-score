'use strict';

const SCORING_PROFILES = {
  framework: {
    documentation: 25,
    structure: 25,
    maintenance: 20,
    adoption: 20,
    discoverability: 10,
  },
  library: {
    documentation: 30,
    structure: 20,
    maintenance: 20,
    adoption: 20,
    discoverability: 10,
  },
  sdk: {
    documentation: 30,
    structure: 20,
    maintenance: 20,
    adoption: 20,
    discoverability: 10,
  },
  'cli-tool': {
    documentation: 30,
    structure: 25,
    maintenance: 20,
    adoption: 15,
    discoverability: 10,
  },
  application: {
    structure: 30,
    documentation: 25,
    maintenance: 20,
    adoption: 15,
    discoverability: 10,
  },
  'ai-agent-framework': {
    agentSafety: 30,
    documentation: 25,
    structure: 20,
    maintenance: 15,
    adoption: 10,
  },
  'ai-tooling': {
    agentSafety: 25,
    documentation: 25,
    structure: 20,
    maintenance: 15,
    adoption: 10,
    discoverability: 5,
  },
  dataset: {
    documentation: 40,
    discoverability: 20,
    adoption: 20,
    maintenance: 20,
  },
  'learning-resource': {
    documentation: 50,
    structure: 20,
    adoption: 20,
    maintenance: 10,
  },
  reference: {
    documentation: 45,
    discoverability: 20,
    adoption: 20,
    maintenance: 15,
  },
  default: {
    documentation: 30,
    structure: 20,
    maintenance: 20,
    adoption: 20,
    discoverability: 10,
  },
};

function uniqueImprovements(items) {
  return [...new Set(items.filter(Boolean))];
}

function getProfileKey(repoType) {
  if (repoType === 'agent-runtime') {
    return 'ai-agent-framework';
  }

  if (repoType === 'llm-framework') {
    return 'ai-tooling';
  }

  return repoType;
}

function getScoringProfile(repoType) {
  return SCORING_PROFILES[getProfileKey(repoType)] || SCORING_PROFILES.default;
}

function computeRepoScore(repoType, results) {
  const profile = getScoringProfile(repoType);
  const scores = {
    documentation: Math.round(results.documentation.score),
    structure: Math.round(results.structure.score),
    discoverability: Math.round(results.discoverability.score),
    maintenance: Math.round(results.maintenance.score),
    adoption: Math.round(results.adoption.score),
    agentSafety: results.agentSafety && typeof results.agentSafety.score === 'number'
      ? Math.round(results.agentSafety.score)
      : null,
  };

  const totalWeight = Object.values(profile).reduce((sum, weight) => sum + weight, 0);
  const repoScore = Math.round(Object.entries(profile).reduce((total, [category, weight]) => {
    const score = category === 'agentSafety' && scores.agentSafety === null ? 0 : scores[category];
    return total + score * (weight / totalWeight);
  }, 0));

  const improvements = uniqueImprovements(
    Object.keys(profile).flatMap((category) => {
      if (category === 'agentSafety') {
        return results.agentSafety ? results.agentSafety.improvements : [];
      }

      return results[category]?.improvements || [];
    })
  ).slice(0, 8);

  return {
    repoScore,
    scores,
    improvements,
  };
}

module.exports = {
  SCORING_PROFILES,
  computeRepoScore,
  getScoringProfile,
};
