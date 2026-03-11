'use strict';

function analyzeDiscoverability(input) {
  const repository = input.repoMetadata || {};
  const readme = input.readmeContent || '';
  const normalizedReadme = readme.toLowerCase();
  const topics = Array.isArray(repository.topics) ? repository.topics : [];
  const files = Array.isArray(input.fileTree) ? input.fileTree.map((entry) => String(entry.path || '').toLowerCase()) : [];

  const hasReadmeBadges = /!\[[^\]]*\]\([^)]+\)/.test(readme);
  const hasClearDescription = Boolean(repository.description && repository.description.trim().length >= 20);
  const hasDocsWebsiteLink =
    /https?:\/\/[^\s)]+(docs|documentation|guide|learn|reference)/i.test(readme) ||
    files.some((filePath) => filePath.startsWith('docs/'));
  const hasReadmeKeywords = ['installation', 'usage', 'example', 'quickstart', 'api', 'reference', 'getting started']
    .filter((keyword) => normalizedReadme.includes(keyword)).length >= 3;

  let score = 0;
  const improvements = [];

  if (topics.length > 0) {
    score += 25;
    if (topics.length < 3) {
      improvements.push('Add more GitHub topics so the project is easier to discover.');
    }
  } else {
    improvements.push('Add GitHub topics that reflect the project domain and audience.');
  }

  if (repository.homepage) {
    score += 20;
  } else {
    improvements.push('Set a homepage URL in the repository metadata.');
  }

  if (hasReadmeBadges) {
    score += 15;
  } else {
    improvements.push('Add a small set of README badges for version, CI, or quality signals.');
  }

  if (hasClearDescription) {
    score += 20;
  } else {
    improvements.push('Add a concise GitHub repository description.');
  }

  if (hasDocsWebsiteLink || hasReadmeKeywords) {
    score += 20;
    if (!hasDocsWebsiteLink) {
      improvements.push('Add a docs website or deeper documentation links for easier discovery.');
    }
  } else {
    improvements.push('Link to docs or make deeper usage and API guidance easier to find from the README.');
  }

  if (!hasReadmeKeywords) {
    improvements.push('Use README headings like installation, usage, examples, or API reference.');
  }

  return {
    score: Math.min(score, 100),
    improvements: [...new Set(improvements)],
  };
}

module.exports = {
  analyzeDiscoverability,
};
