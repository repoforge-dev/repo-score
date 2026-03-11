'use strict';

function analyzeReadme(input) {
  const readme = input.readmeContent || '';
  const files = Array.isArray(input.fileTree) ? input.fileTree.map((entry) => String(entry.path || '').toLowerCase()) : [];

  if (!readme.trim()) {
    return {
      score: 0,
      improvements: ['Add a README with installation, usage, and project context.'],
    };
  }

  const normalized = readme.toLowerCase();
  const headingMatches = [...readme.matchAll(/^#{1,6}\s+.+$/gm)];
  const wordCount = readme.trim().split(/\s+/).filter(Boolean).length;
  const hasReadme = Boolean(readme.trim());

  const hasInstallSection = /\b(install|installation|get started|getting started|setup)\b/.test(normalized);
  const hasUsageExamples =
    /\b(usage|quickstart|example|examples)\b/.test(normalized) ||
    /```[\s\S]{20,}?```/.test(readme);
  const hasApiDocs = /\b(api|reference)\b/.test(normalized);
  const hasConfigDocs = /\b(config|configuration|options|environment)\b/.test(normalized);
  const hasContributingGuidance =
    /\b(contributing|development)\b/.test(normalized) ||
    files.some((filePath) => /(^|\/)contributing\.md$/i.test(filePath));

  let score = 0;
  const improvements = [];

  if (hasReadme) {
    score += 20;
  }

  if (wordCount >= 150) {
    score += 10;
  } else {
    improvements.push('Expand the README so it clearly covers project purpose and developer workflows.');
  }

  if (headingMatches.length >= 4) {
    score += 10;
  } else {
    improvements.push('Break the README into clearer sections with headings for faster scanning.');
  }

  if (hasInstallSection) {
    score += 15;
  } else {
    improvements.push('Document installation or setup steps in the README.');
  }

  if (hasUsageExamples) {
    score += 20;
  } else {
    improvements.push('Add concrete usage examples or a quickstart section.');
  }

  if (hasApiDocs) {
    score += 15;
  } else {
    improvements.push('Include API or reference details in the README.');
  }

  if (hasConfigDocs) {
    score += 10;
  } else {
    improvements.push('Document configuration, environment variables, or runtime options.');
  }

  if (hasContributingGuidance) {
    score += 10;
  } else {
    improvements.push('Add contributing guidance in the README or a CONTRIBUTING.md file.');
  }

  return {
    score: Math.min(score, 100),
    improvements,
  };
}

module.exports = {
  analyzeReadme,
};
