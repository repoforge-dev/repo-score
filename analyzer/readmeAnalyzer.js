'use strict';

function analyzeReadme(input) {
  const readme = input.readmeContent || '';

  if (!readme.trim()) {
    return {
      score: 0,
      improvements: ['Add a README with installation, usage, and project context.'],
    };
  }

  const normalized = readme.toLowerCase();
  const headingMatches = [...readme.matchAll(/^#{1,6}\s+.+$/gm)];
  const wordCount = readme.trim().split(/\s+/).filter(Boolean).length;

  const hasInstallSection = /\b(install|installation|get started|getting started|setup)\b/.test(normalized);
  const hasUsageExamples =
    /\b(usage|quickstart|example|examples)\b/.test(normalized) ||
    /```[\s\S]{20,}?```/.test(readme);
  const hasReferenceSection = /\b(api|reference|configuration|options)\b/.test(normalized);
  const hasContributingSection = /\b(contributing|development)\b/.test(normalized);
  const hasLicenseSection = /\blicense\b/.test(normalized);

  let score = 20;
  const improvements = [];

  if (hasInstallSection) {
    score += 20;
  } else {
    improvements.push('Document installation or setup steps in the README.');
  }

  if (hasUsageExamples) {
    score += 20;
  } else {
    improvements.push('Add concrete usage examples or a quickstart section.');
  }

  if (hasReferenceSection) {
    score += 15;
  } else {
    improvements.push('Include API, configuration, or reference details in the README.');
  }

  if (hasContributingSection) {
    score += 10;
  } else {
    improvements.push('Explain how contributors can run, test, and contribute to the project.');
  }

  if (hasLicenseSection) {
    score += 5;
  }

  if (wordCount >= 250) {
    score += 10;
  } else if (wordCount < 120) {
    improvements.push('Expand the README so it covers project purpose and developer workflows.');
  }

  if (headingMatches.length >= 5) {
    score += 10;
  } else {
    improvements.push('Break the README into clearer sections for faster scanning.');
  }

  return {
    score: Math.min(score, 100),
    improvements,
  };
}

module.exports = {
  analyzeReadme,
};
