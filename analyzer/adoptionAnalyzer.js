'use strict';

function getStarsScore(stars) {
  if (stars >= 100000) {
    return 50;
  }

  if (stars >= 25000) {
    return 42;
  }

  if (stars >= 5000) {
    return 34;
  }

  if (stars >= 1000) {
    return 24;
  }

  if (stars >= 100) {
    return 14;
  }

  if (stars >= 10) {
    return 6;
  }

  return 0;
}

function getForksScore(forks) {
  if (forks >= 20000) {
    return 30;
  }

  if (forks >= 5000) {
    return 25;
  }

  if (forks >= 1000) {
    return 18;
  }

  if (forks >= 200) {
    return 12;
  }

  if (forks >= 25) {
    return 6;
  }

  return 0;
}

function getWatchersScore(watchers) {
  if (watchers >= 5000) {
    return 20;
  }

  if (watchers >= 1000) {
    return 16;
  }

  if (watchers >= 250) {
    return 10;
  }

  if (watchers >= 50) {
    return 5;
  }

  return 0;
}

function analyzeAdoption(input) {
  const repository = input.repoMetadata || {};
  const stars = Number.isFinite(repository.stargazers_count) ? repository.stargazers_count : 0;
  const forks = Number.isFinite(repository.forks_count) ? repository.forks_count : 0;
  const watchers = Number.isFinite(repository.watchers_count) ? repository.watchers_count : 0;

  const score = Math.min(100, getStarsScore(stars) + getForksScore(forks) + getWatchersScore(watchers));
  const improvements = [];

  if (score < 20) {
    improvements.push('Increase project visibility and usage signals to strengthen adoption confidence.');
  } else if (score < 45) {
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
