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
  if (!AGENT_SAFETY_REPO_TYPES.has(String(repoType || '').toLowerCase())) {
    return null;
  }

  const readme = (input.readmeContent || '').toLowerCase();
  const files = getFilePaths(input.fileTree);

  const hasSafetyDocs =
    /\bguardrails?\b|\bsafety\b|\bsecurity\b|\bpolicy\b/.test(readme) ||
    files.some((filePath) => ['security.md', 'safety.md', '.github/security.md'].includes(filePath));
  const hasToolPermissions =
    /\btool permissions?\b|\btool allowlist\b|\btool denylist\b|\btool throttle\b|\btool execution guardrails?\b/.test(readme) ||
    files.some((filePath) => /tool(throttle|guard|policy|registry)/.test(filePath));
  const hasRuntimeLimits =
    /\bruntime limits?\b|\btoken budgets?\b|\brate limits?\b|\bloop limits?\b|\bexecution limits?\b/.test(readme) ||
    files.some((filePath) => /(budget|limit|loopguard|throttle|enforcement)/.test(filePath));
  const hasPolicyEnforcement =
    /\bpolicy enforcement\b|\bapproval boundaries\b|\bpermission boundaries\b|\bfail closed\b/.test(readme) ||
    files.some((filePath) => /(policy|integrity|approval|permission)/.test(filePath));

  let score = 0;
  const improvements = [];

  if (hasSafetyDocs) {
    score += 25;
  } else {
    improvements.push('Document AI safety or guardrail expectations explicitly.');
  }

  if (hasToolPermissions) {
    score += 30;
  } else {
    improvements.push('Describe tool execution guardrails or permission controls.');
  }

  if (hasRuntimeLimits) {
    score += 25;
  } else {
    improvements.push('Explain runtime limits such as token, loop, or rate caps.');
  }

  if (hasPolicyEnforcement) {
    score += 20;
  } else {
    improvements.push('Document policy enforcement or approval boundaries for autonomous execution.');
  }

  return {
    score: Math.min(score, 100),
    improvements: [...new Set(improvements)],
  };
}

module.exports = {
  AGENT_SAFETY_REPO_TYPES,
  analyzeAgentSafety,
};
