'use strict';

function clampScore(value) {
  return Math.max(0, Math.min(100, value));
}

function getLogScore(count) {
  if (!Number.isFinite(count) || count <= 0) {
    return 0;
  }

  return clampScore(Math.log10(count) * 25);
}

function analyzeAdoption(input) {
  const repository = input.repoMetadata || {};
  const stars = Number.isFinite(repository.stargazers_count) ? repository.stargazers_count : 0;
  const forks = Number.isFinite(repository.forks_count) ? repository.forks_count : 0;
  const contributors = Number.isFinite(repository.contributor_count) ? repository.contributor_count : 0;

  const starsScore = getLogScore(stars);
  const forkScore = getLogScore(forks);
  const contributorScore = clampScore(contributors * 2);
  const score = Math.round((starsScore + forkScore + contributorScore) / 3);

  const improvements = [];

  if (starsScore < 35) {
    improvements.push('Increase project visibility so repository adoption signals become easier to trust.');
  }

  if (forkScore < 30) {
    improvements.push('Grow downstream usage and integration signals to strengthen adoption confidence.');
  }

  if (contributorScore < 20) {
    improvements.push('Broaden community contribution so adoption is not concentrated in a single maintainer.');
  }

  return {
    score,
    improvements: [...new Set(improvements)],
  };
}

module.exports = {
  analyzeAdoption,
  getLogScore,
};
