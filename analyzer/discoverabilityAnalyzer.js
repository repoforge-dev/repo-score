'use strict';

function analyzeDiscoverability(input) {
  const repository = input.repoMetadata || {};
  const readme = (input.readmeContent || '').toLowerCase();
  const topics = Array.isArray(repository.topics) ? repository.topics : [];

  const keywordMatches = [
    'installation',
    'usage',
    'example',
    'quickstart',
    'api',
    'reference',
    'getting started',
  ].filter((keyword) => readme.includes(keyword));

  let score = 0;
  const improvements = [];

  if (repository.description && repository.description.trim()) {
    score += 25;
  } else {
    improvements.push('Add a concise GitHub repository description.');
  }

  if (topics.length >= 6) {
    score += 30;
  } else if (topics.length >= 3) {
    score += 22;
  } else if (topics.length >= 1) {
    score += 12;
    improvements.push('Add more GitHub topics so the project is easier to discover.');
  } else {
    improvements.push('Add GitHub topics that reflect the project domain and audience.');
  }

  score += Math.min(keywordMatches.length * 6, 30);
  if (keywordMatches.length < 3) {
    improvements.push('Use README headings like installation, usage, examples, or API reference.');
  }

  if (repository.homepage) {
    score += 15;
  } else {
    improvements.push('Set a homepage or docs URL in the repository metadata.');
  }

  return {
    score: Math.min(score, 100),
    improvements,
  };
}

module.exports = {
  analyzeDiscoverability,
};
