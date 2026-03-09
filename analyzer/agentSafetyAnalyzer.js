'use strict';

const AGENT_SAFETY_REPO_TYPES = new Set([
  'ai-agent-framework',
  'ai-tooling',
  'llm-framework',
  'agent-runtime',
]);

function getFilePaths(fileTree) {
  return Array.isArray(fileTree)
    ? fileTree.map((entry) => String(entry.path || '').toLowerCase()).filter(Boolean)
    : [];
}

function analyzeAgentSafety(input, repoType) {
  const repository = input.repoMetadata || {};
  const readme = (input.readmeContent || '').toLowerCase();
  const topics = Array.isArray(repository.topics)
    ? repository.topics.map((topic) => String(topic).toLowerCase())
    : [];
  const files = getFilePaths(input.fileTree);
  const packageJson = input.packageJson || {};
  const dependencies = {
    ...(packageJson.dependencies || {}),
    ...(packageJson.devDependencies || {}),
    ...(packageJson.peerDependencies || {}),
  };

  const isAgentFramework =
    repoType === 'ai-agent-framework' ||
    repoType === 'agent-runtime' ||
    topics.some((topic) => topic.includes('agent')) ||
    /\bagent\b|\bmulti-agent\b|\bautonomous\b/.test(readme);

  const isLlmTooling =
    repoType === 'ai-tooling' ||
    repoType === 'llm-framework' ||
    ['openai', '@anthropic-ai/sdk', 'langchain', '@langchain/core', 'llamaindex'].some((dependency) =>
      Object.prototype.hasOwnProperty.call(dependencies, dependency)
    ) ||
    /\bllm\b|\brag\b|\bprompt\b|\bembeddings?\b/.test(readme);

  const hasSafetyDocs =
    /\bsafety\b|\bguardrails?\b|\bsecurity\b|\bpolicy\b/.test(readme) ||
    files.some((filePath) => ['security.md', 'safety.md', '.github/security.md'].includes(filePath));
  const hasEvaluationGuidance = /\bevals?\b|\bevaluation\b|\bred team\b|\btesting\b/.test(readme);
  const hasOperationalBoundaries =
    /\bsandbox\b|\bpermission\b|\bapproval\b|\brate limit\b|\bhuman in the loop\b/.test(readme);

  let score = 90;
  const improvements = [];

  if (isAgentFramework || isLlmTooling) {
    score = 35;

    if (hasSafetyDocs) {
      score += 30;
    } else {
      improvements.push('Document safety, security, or guardrail expectations for AI-assisted workflows.');
    }

    if (hasEvaluationGuidance) {
      score += 20;
    } else {
      improvements.push('Explain how agent or LLM behaviors are evaluated before release.');
    }

    if (hasOperationalBoundaries) {
      score += 15;
    } else {
      improvements.push('Describe permissions, sandboxing, or approval boundaries for automation.');
    }
  } else if (!hasSafetyDocs) {
    score -= 5;
    improvements.push('Add SECURITY.md or equivalent operational guidance.');
  }

  return {
    score: Math.max(0, Math.min(score, 100)),
    improvements,
  };
}

module.exports = {
  AGENT_SAFETY_REPO_TYPES,
  analyzeAgentSafety,
};
