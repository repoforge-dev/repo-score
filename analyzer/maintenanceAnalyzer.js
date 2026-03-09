'use strict';

function getRecencyScore(updatedAt) {
  if (!updatedAt) {
    return 0;
  }

  const ageInDays = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86400000);

  if (ageInDays <= 30) {
    return 45;
  }

  if (ageInDays <= 90) {
    return 35;
  }

  if (ageInDays <= 180) {
    return 25;
  }

  if (ageInDays <= 365) {
    return 15;
  }

  return 5;
}

function getPopularityScore(stars, forks) {
  const communitySize = stars + forks * 2;

  if (communitySize >= 10000) {
    return 25;
  }

  if (communitySize >= 2500) {
    return 20;
  }

  if (communitySize >= 500) {
    return 15;
  }

  if (communitySize >= 100) {
    return 10;
  }

  if (communitySize >= 20) {
    return 5;
  }

  return 0;
}

function getIssueLoadScore(openIssues, stars, forks) {
  const supportCapacity = Math.max(stars / 50 + forks / 10, 1);
  const issueLoad = openIssues / supportCapacity;

  if (issueLoad <= 1) {
    return 30;
  }

  if (issueLoad <= 3) {
    return 24;
  }

  if (issueLoad <= 6) {
    return 16;
  }

  if (issueLoad <= 12) {
    return 8;
  }

  return 2;
}

function analyzeMaintenance(input) {
  const repository = input.repoMetadata || {};
  const openIssues = Number.isFinite(repository.open_issues_count) ? repository.open_issues_count : 0;
  const stars = Number.isFinite(repository.stargazers_count) ? repository.stargazers_count : 0;
  const forks = Number.isFinite(repository.forks_count) ? repository.forks_count : 0;
  const recencyScore = getRecencyScore(repository.updated_at);
  const issueLoadScore = getIssueLoadScore(openIssues, stars, forks);
  const popularityScore = getPopularityScore(stars, forks);

  let score = recencyScore + issueLoadScore + popularityScore;
  const improvements = [];

  if (recencyScore < 25) {
    improvements.push('Ship updates more regularly so the repository does not look stale.');
  }

  if (issueLoadScore < 14) {
    improvements.push('Reduce unresolved issue backlog relative to project activity and community size.');
  }

  if (popularityScore < 10) {
    improvements.push('Grow adoption and contribution signals to improve maintenance confidence.');
  }

  if (repository.archived) {
    score = Math.min(score, 35);
    improvements.push('The repository is archived, which lowers confidence in active maintenance.');
  }

  return {
    score: Math.min(score, 100),
    improvements,
  };
}

module.exports = {
  analyzeMaintenance,
};
