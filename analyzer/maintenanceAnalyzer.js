'use strict';

function getAgeInDays(timestamp) {
  if (!timestamp) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.floor((Date.now() - new Date(timestamp).getTime()) / 86400000);
}

function getRecentCommitScore(updatedAt) {
  const ageInDays = getAgeInDays(updatedAt);

  if (ageInDays <= 30) {
    return 30;
  }

  if (ageInDays <= 90) {
    return 20;
  }

  if (ageInDays <= 180) {
    return 10;
  }

  return 0;
}

function getContributorScore(contributorCount) {
  if (contributorCount > 5) {
    return 20;
  }

  if (contributorCount >= 3) {
    return 12;
  }

  if (contributorCount >= 1) {
    return 6;
  }

  return 0;
}

function getReleaseScore(recentReleaseCount, lastReleaseAt) {
  if (recentReleaseCount >= 2) {
    return 25;
  }

  if (recentReleaseCount === 1) {
    return 18;
  }

  const ageInDays = getAgeInDays(lastReleaseAt);
  if (ageInDays <= 730) {
    return 10;
  }

  return 0;
}

function getIssueActivityScore(recentIssueActivityCount, lastIssueUpdatedAt) {
  if (recentIssueActivityCount >= 5) {
    return 25;
  }

  if (recentIssueActivityCount >= 2) {
    return 18;
  }

  const ageInDays = getAgeInDays(lastIssueUpdatedAt);
  if (ageInDays <= 30) {
    return 12;
  }

  if (ageInDays <= 90) {
    return 8;
  }

  return 0;
}

function analyzeMaintenance(input) {
  const repository = input.repoMetadata || {};
  const contributorCount = Number.isFinite(repository.contributor_count) ? repository.contributor_count : 0;
  const recentReleaseCount = Number.isFinite(repository.recent_release_count) ? repository.recent_release_count : 0;
  const recentIssueActivityCount = Number.isFinite(repository.recent_issue_activity_count)
    ? repository.recent_issue_activity_count
    : 0;

  const recentCommitScore = getRecentCommitScore(repository.updated_at);
  const contributorScore = getContributorScore(contributorCount);
  const releaseScore = getReleaseScore(recentReleaseCount, repository.last_release_at);
  const issueActivityScore = getIssueActivityScore(recentIssueActivityCount, repository.last_issue_updated_at);

  let score = recentCommitScore + contributorScore + releaseScore + issueActivityScore;
  const improvements = [];

  if (recentCommitScore < 30) {
    improvements.push('Ship updates more regularly so recent maintenance activity is visible.');
  }

  if (contributorScore < 20) {
    improvements.push('Grow active contributor participation to improve maintenance resilience.');
  }

  if (releaseScore < 25) {
    improvements.push('Publish releases more consistently so maintenance cadence is easier to trust.');
  }

  if (issueActivityScore < 25) {
    improvements.push('Improve visible issue response activity so maintainers appear responsive.');
  }

  if (repository.archived) {
    score = Math.min(score, 20);
    improvements.push('The repository is archived, which lowers confidence in active maintenance.');
  }

  return {
    score: Math.min(score, 100),
    improvements: [...new Set(improvements)],
  };
}

module.exports = {
  analyzeMaintenance,
};
