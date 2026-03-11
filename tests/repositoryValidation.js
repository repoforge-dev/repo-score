'use strict';

const analyzeRoute = require('../api/analyze');
const { readRepoCache } = require('../cache/repoCache');
const dataset = require('./repositoryDataset');

function formatCategoryScores(scores) {
  return [
    `  documentation: ${scores.documentation ?? 'N/A'}`,
    `  structure: ${scores.structure ?? 'N/A'}`,
    `  discoverability: ${scores.discoverability ?? 'N/A'}`,
    `  maintenance: ${scores.maintenance ?? 'N/A'}`,
    `  adoption: ${scores.adoption ?? 'N/A'}`,
    `  agentSafety: ${scores.agentSafety ?? 'N/A'}`,
  ].join('\n');
}

function isAiType(repoType) {
  return new Set(['ai-tooling', 'ai-agent-framework', 'agent-runtime', 'llm-framework']).has(
    String(repoType || '').toLowerCase()
  );
}

function collectWarnings(entry, analysis) {
  const warnings = [];
  const scores = analysis.scores || {};
  const stars = Number(analysis._repoMetadata?.stargazers_count || 0);

  if (analysis.repoType !== entry.expectedType) {
    warnings.push('TYPE MISMATCH');
  }

  if (stars > 50000 && analysis.repoScore < 60) {
    warnings.push('HIGH-ADOPTION REPOSITORY SCORES BELOW 60');
  }

  if (analysis.repoScore > 95) {
    warnings.push('REPOSCORE ABOVE 95');
  }

  if (isAiType(analysis.repoType) && (scores.agentSafety === null || scores.agentSafety === undefined)) {
    warnings.push('AI REPOSITORY MISSING AGENT SAFETY SCORE');
  }

  return warnings;
}

async function main() {
  let totalReposTested = 0;
  let exactTypeMatches = 0;
  let scoreWarningCount = 0;
  let totalRepoScore = 0;
  let failedRepos = 0;

  for (const entry of dataset) {
    try {
      const { owner, repo } = analyzeRoute.parseRepositoryInput(entry.repo);
      const analysis = await analyzeRoute.buildRepoAnalysis(owner, repo);
      const cached = await readRepoCache(owner, repo);
      const repoMetadata = cached?.snapshot?.repoMetadata || {};
      const enrichedAnalysis = {
        ...analysis,
        _repoMetadata: repoMetadata,
      };
      const finalWarnings = collectWarnings(entry, enrichedAnalysis);

      totalReposTested += 1;
      totalRepoScore += analysis.repoScore;
      if (analysis.repoType === entry.expectedType) {
        exactTypeMatches += 1;
      }
      scoreWarningCount += finalWarnings.length;

      console.log(`Repository: ${entry.repo}`);
      console.log(`Detected Type: ${analysis.repoType}`);
      console.log(`Expected Type: ${entry.expectedType}`);
      console.log(`RepoScore: ${analysis.repoScore}`);
      console.log('Category Scores:');
      console.log(formatCategoryScores(analysis.scores || {}));

      if (finalWarnings.length) {
        for (const warning of finalWarnings) {
          if (warning === 'TYPE MISMATCH') {
            console.log('WARNING: TYPE MISMATCH');
          } else {
            console.log(`WARNING: ${warning}`);
          }
        }
      }

      console.log('');
    } catch (error) {
      failedRepos += 1;
      console.log(`Repository: ${entry.repo}`);
      console.log(`ERROR: ${error.message}`);
      console.log('');
    }
  }

  const typeAccuracy = totalReposTested > 0 ? ((exactTypeMatches / totalReposTested) * 100).toFixed(1) : '0.0';
  const averageRepoScore = totalReposTested > 0 ? (totalRepoScore / totalReposTested).toFixed(1) : '0.0';

  console.log('Summary Report');
  console.log(`totalReposTested: ${totalReposTested}`);
  console.log(`typeAccuracy: ${typeAccuracy}%`);
  console.log(`averageRepoScore: ${averageRepoScore}`);
  console.log(`numberOfScoreWarnings: ${scoreWarningCount}`);
  console.log(`failedRepos: ${failedRepos}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
