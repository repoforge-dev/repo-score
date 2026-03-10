'use strict';

function getAdoptionBonus(stars) {
  if (stars >= 10000) {
    return 20;
  }

  if (stars >= 1000) {
    return 15;
  }

  if (stars >= 100) {
    return 10;
  }

  if (stars >= 10) {
    return 5;
  }

  return 0;
}

function analyzeAdoption(input) {
  const repository = input.repoMetadata || {};
  const stars = Number.isFinite(repository.stargazers_count) ? repository.stargazers_count : 0;
  const score = getAdoptionBonus(stars);
  const improvements = [];

  if (score === 0) {
    improvements.push('Increase project visibility and usage signals to strengthen adoption confidence.');
  } else if (score < 15) {
    improvements.push('Broaden community reach through documentation, examples, and distribution channels.');
  }

  return {
    score,
    improvements,
  };
}

module.exports = {
  analyzeAdoption,
};
