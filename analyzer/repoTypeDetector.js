'use strict';

const TYPE_PRIORITY = [
  'ai-agent-framework',
  'agent-runtime',
  'ai-tooling',
  'analysis-tool',
  'framework',
  'sdk',
  'cli-tool',
  'application',
  'library',
  'dataset',
  'template',
  'reference',
  'learning-resource',
  'developer-tool',
];

const SOURCE_WEIGHTS = {
  packageJson: 1.5,
  structure: 1.45,
  dependencies: 1.3,
  entrypoints: 1.2,
  topics: 0.6,
  readme: 0.5,
  metadata: 0.5,
};

const CLI_DEPENDENCIES = ['commander', 'yargs', 'oclif', 'cac', 'clipanion', 'ink'];
const AI_TOOLING_DEPENDENCIES = [
  'openai',
  '@anthropic-ai/sdk',
  'langchain',
  '@langchain/core',
  'llamaindex',
  '@pinecone-database/pinecone',
  'weaviate-client',
  'chromadb',
  '@qdrant/js-client-rest',
];
const FRAMEWORK_DEPENDENCIES = ['koa', '@nestjs/core', 'fastify-plugin', 'hono', 'middy'];
const AGENT_ORCHESTRATION_DEPENDENCIES = ['langgraph', '@mastra/core', 'autogen', 'crewai'];

function createEmptyScores() {
  return TYPE_PRIORITY.reduce((scores, type) => {
    scores[type] = 0;
    return scores;
  }, {});
}

function addScore(scores, type, source, weight) {
  scores[type] = (scores[type] || 0) + weight * SOURCE_WEIGHTS[source];
}

function getFilePaths(fileTree) {
  return Array.isArray(fileTree)
    ? fileTree.map((entry) => String(entry.path || '').toLowerCase()).filter(Boolean)
    : [];
}

function getDependencyMap(packageJson) {
  return {
    ...(packageJson?.dependencies || {}),
    ...(packageJson?.devDependencies || {}),
    ...(packageJson?.peerDependencies || {}),
  };
}

function hasAnyDependency(dependencyMap, packages) {
  return packages.some((packageName) => Object.prototype.hasOwnProperty.call(dependencyMap, packageName));
}

function hasAnyPath(files, patterns) {
  return patterns.some((pattern) =>
    files.some((filePath) => (pattern instanceof RegExp ? pattern.test(filePath) : filePath.includes(pattern)))
  );
}

function countMarkdownFiles(files) {
  return files.filter((filePath) => filePath.endsWith('.md')).length;
}

function getTopics(repoMetadata) {
  return Array.isArray(repoMetadata?.topics)
    ? repoMetadata.topics.map((topic) => String(topic).toLowerCase())
    : [];
}

function collectPackageSignals(scores, packageJson) {
  if (!packageJson) {
    return;
  }

  const keywords = Array.isArray(packageJson.keywords)
    ? packageJson.keywords.map((keyword) => String(keyword).toLowerCase())
    : [];
  const scripts = Object.keys(packageJson.scripts || {}).map((script) => script.toLowerCase());
  const name = String(packageJson.name || '').toLowerCase();

  if (packageJson.bin) {
    addScore(scores, 'cli-tool', 'packageJson', 11);
  }

  if (packageJson.exports) {
    addScore(scores, 'library', 'packageJson', 10);
  }

  if ((packageJson.main || packageJson.module) && !packageJson.private) {
    addScore(scores, 'library', 'packageJson', 6);
  }

  if (packageJson.types || packageJson.typings) {
    addScore(scores, 'library', 'packageJson', 4);
    addScore(scores, 'sdk', 'packageJson', 2);
  }

  if (Array.isArray(packageJson.files) && packageJson.files.some((entry) => String(entry).startsWith('dist'))) {
    addScore(scores, 'library', 'packageJson', 3);
  }

  if (packageJson.private && scripts.some((script) => ['dev', 'start', 'build', 'preview'].includes(script))) {
    addScore(scores, 'application', 'packageJson', 8);
  }

  if (packageJson.workspaces) {
    addScore(scores, 'framework', 'packageJson', 2);
    addScore(scores, 'developer-tool', 'packageJson', 1);
  }

  if (name.includes('sdk') || keywords.some((keyword) => keyword.includes('sdk'))) {
    addScore(scores, 'sdk', 'packageJson', 8);
  }

  if (keywords.some((keyword) => keyword.includes('analysis') || keyword.includes('repository-analysis') || keyword.includes('repo-quality'))) {
    addScore(scores, 'analysis-tool', 'packageJson', 5);
  }

  if (keywords.some((keyword) => keyword.includes('developer-tool') || keyword.includes('developer-tools') || keyword.includes('developer-experience'))) {
    addScore(scores, 'developer-tool', 'packageJson', 4);
  }

  if (keywords.some((keyword) => keyword.includes('template') || keyword.includes('starter') || keyword.includes('boilerplate'))) {
    addScore(scores, 'template', 'packageJson', 6);
  }

  if (keywords.some((keyword) => keyword.includes('dataset') || keyword.includes('benchmark'))) {
    addScore(scores, 'dataset', 'packageJson', 6);
  }
}

function collectDependencySignals(scores, packageJson) {
  const dependencyMap = getDependencyMap(packageJson);
  const dependencyNames = Object.keys(dependencyMap);

  if (dependencyNames.length === 0) {
    return;
  }

  if (hasAnyDependency(dependencyMap, CLI_DEPENDENCIES)) {
    addScore(scores, 'cli-tool', 'dependencies', 9);
  }

  if (hasAnyDependency(dependencyMap, AI_TOOLING_DEPENDENCIES)) {
    addScore(scores, 'ai-tooling', 'dependencies', 10);
  }

  if (hasAnyDependency(dependencyMap, FRAMEWORK_DEPENDENCIES)) {
    addScore(scores, 'framework', 'dependencies', 7);
  }

  if (Object.keys(packageJson?.peerDependencies || {}).length > 0) {
    addScore(scores, 'library', 'dependencies', 4);
    addScore(scores, 'framework', 'dependencies', 2);
  }

  if (packageJson?.private && hasAnyDependency(dependencyMap, ['next', 'react', 'vite', 'express', 'fastify'])) {
    addScore(scores, 'application', 'dependencies', 6);
  }

  if (hasAnyDependency(dependencyMap, ['octokit', '@octokit/rest', 'simple-git'])) {
    addScore(scores, 'analysis-tool', 'dependencies', 4);
    addScore(scores, 'developer-tool', 'dependencies', 3);
  }
}

function getAgentFrameworkSignals(files, dependencyMap, readme) {
  const agentSignalChecks = [
    hasAnyPath(files, [/agent.*runtime/, /runtime.*agent/, /execution-loop/, /run-loop/, /agent-runner/, /orchestrator/]) ||
      /\bagent runtime loop\b|\bexecution loop\b|\brun loop\b/.test(readme),
    hasAnyPath(files, [/tool-execution/, /tool-runner/, /execute-tool/, /tool-manager/, /tools\//]) ||
      /\btool execution\b|\bexecute tools?\b/.test(readme),
    hasAnyPath(files, [/memory\//, /memory-store/, /agent-memory/, /memory-layer/]) ||
      /\bagent memory\b|\bmemory store\b/.test(readme),
    hasAnyPath(files, [/planner\//, /planning\//, /task-planner/, /plan-executor/]) ||
      /\bplanner module\b|\bplanning module\b/.test(readme),
    hasAnyPath(files, [/tool-registry/, /registry\/tools/, /tools\/registry/, /registry\/index/]) ||
      /\btool registry\b/.test(readme),
    hasAnyPath(files, [/decision-loop/, /autonomous/, /policy-engine/, /goal-manager/]) ||
      /\bautonomous decision loop\b|\bautonomous execution\b/.test(readme),
  ];

  const runtimeSignalCount = agentSignalChecks.filter(Boolean).length;
  const orchestrationDependencyCount = AGENT_ORCHESTRATION_DEPENDENCIES.filter((dependency) =>
    Object.prototype.hasOwnProperty.call(dependencyMap, dependency)
  ).length;

  return {
    runtimeSignalCount,
    orchestrationDependencyCount,
  };
}

function collectStructureSignals(scores, input) {
  const files = getFilePaths(input.fileTree);
  const markdownCount = countMarkdownFiles(files);
  const packageJson = input.packageJson || null;
  const dependencyMap = getDependencyMap(packageJson);
  const readme = String(input.readmeContent || '').toLowerCase();

  if (hasAnyPath(files, [/^bin\//, /^commands\//, /src\/cli/, /cli\.(js|ts|mjs|cjs)$/])) {
    addScore(scores, 'cli-tool', 'structure', 8);
  }

  if (hasAnyPath(files, [/^src\/index\./, /^lib\//, /^dist\//])) {
    addScore(scores, 'library', 'structure', 6);
  }

  if (hasAnyPath(files, [/^app\//, /^pages\//, /^public\//, /^routes\//, /^prisma\//, /^server\./])) {
    addScore(scores, 'application', 'structure', 7);
  }

  if (hasAnyPath(files, [/^plugins\//, /^middleware\//, /^adapters\//, /^integrations\//])) {
    addScore(scores, 'framework', 'structure', 8);
  }

  if (hasAnyPath(files, [/^packages\//])) {
    addScore(scores, 'framework', 'structure', 3);
  }

  if (hasAnyPath(files, [/^templates\//, /^starter\//, /boilerplate/, /^examples\/starter/])) {
    addScore(scores, 'template', 'structure', 8);
  }

  if (hasAnyPath(files, [/^data\//, /\.csv$/, /\.jsonl$/, /\.parquet$/, /\.tsv$/])) {
    addScore(scores, 'dataset', 'structure', 8);
  }

  if (hasAnyPath(files, [/^api\//, /^analyzer\//, /^scoring\//, /^scanners\//])) {
    addScore(scores, 'analysis-tool', 'structure', 9);
  }

  if (hasAnyPath(files, [/^cache\//, /^data\/repos\//])) {
    addScore(scores, 'analysis-tool', 'structure', 5);
  }

  if (hasAnyPath(files, [/^utils\//, /^docs\//, /^\.github\//])) {
    addScore(scores, 'developer-tool', 'structure', 3);
  }

  if (hasAnyPath(files, [/prompt/, /embedding/, /vector/, /rag/, /providers\//, /models\//])) {
    addScore(scores, 'ai-tooling', 'structure', 7);
  }

  if (hasAnyPath(files, [/guard/, /enforcement/, /budget/, /throttle/, /integrity/])) {
    addScore(scores, 'ai-tooling', 'structure', 6);
  }

  const agentSignals = getAgentFrameworkSignals(files, dependencyMap, readme);
  if (agentSignals.runtimeSignalCount >= 2) {
    addScore(scores, 'ai-agent-framework', 'structure', 16);
    addScore(scores, 'agent-runtime', 'structure', 6);
  } else if (agentSignals.runtimeSignalCount === 1 && agentSignals.orchestrationDependencyCount > 0) {
    addScore(scores, 'agent-runtime', 'structure', 7);
  }

  if (hasAnyPath(files, [/runtime\//, /workflow\//, /orchestrator\//, /executor\//])) {
    addScore(scores, 'agent-runtime', 'structure', 5);
  }

  if (hasAnyPath(files, [/^docs\//, /^guides\//]) && markdownCount >= 4 && !packageJson) {
    addScore(scores, 'reference', 'structure', 7);
  }

  if (markdownCount >= 6 && hasAnyPath(files, [/curriculum/, /roadmap/, /lessons?/, /tutorials?/])) {
    addScore(scores, 'learning-resource', 'structure', 7);
  }
}

function collectEntrypointSignals(scores, input) {
  const packageJson = input.packageJson || null;
  const files = getFilePaths(input.fileTree);
  const scripts = Object.keys(packageJson?.scripts || {}).map((script) => script.toLowerCase());

  if (packageJson?.bin) {
    addScore(scores, 'cli-tool', 'entrypoints', 6);
  }

  if (packageJson?.main || packageJson?.module || packageJson?.exports) {
    addScore(scores, 'library', 'entrypoints', 4);
  }

  if (scripts.some((script) => ['start', 'dev', 'serve', 'preview'].includes(script)) && hasAnyPath(files, [/server\./, /^api\//, /^app\//])) {
    addScore(scores, 'application', 'entrypoints', 6);
  }

  if (scripts.some((script) => script.startsWith('scan') || script.includes('analyze'))) {
    addScore(scores, 'analysis-tool', 'entrypoints', 4);
  }
}

function collectTopicSignals(scores, topics) {
  for (const topic of topics) {
    if (topic.includes('analysis') || topic.includes('repo-quality') || topic.includes('github-analysis')) {
      addScore(scores, 'analysis-tool', 'topics', 4);
    }

    if (topic.includes('developer-tool') || topic.includes('developer-tools')) {
      addScore(scores, 'developer-tool', 'topics', 3);
    }

    if (topic.includes('sdk')) {
      addScore(scores, 'sdk', 'topics', 4);
    }

    if (topic.includes('cli')) {
      addScore(scores, 'cli-tool', 'topics', 4);
    }

    if (topic.includes('framework')) {
      addScore(scores, 'framework', 'topics', 3);
    }

    if (
      topic.includes('ai-guardrails') ||
      topic.includes('llm-security') ||
      topic.includes('runtime-safety') ||
      topic.includes('execution-limits')
    ) {
      addScore(scores, 'ai-tooling', 'topics', 4);
    }

    if (topic.includes('dataset') || topic.includes('benchmark')) {
      addScore(scores, 'dataset', 'topics', 4);
    }

    if (topic.includes('template') || topic.includes('starter')) {
      addScore(scores, 'template', 'topics', 4);
    }

    if (topic.includes('rag') || topic.includes('embeddings') || topic.includes('vector-db')) {
      addScore(scores, 'ai-tooling', 'topics', 4);
    }
  }
}

function collectReadmeSignals(scores, readme) {
  if (!readme) {
    return;
  }

  if (/\banaly(?:sis|ze|zes|zing)\b|\bscore breakdown\b|\brepository quality\b/.test(readme)) {
    addScore(scores, 'analysis-tool', 'readme', 3);
  }

  if (/\bdeveloper workflow\b|\bmaintainers?\b|\bonboarding\b/.test(readme)) {
    addScore(scores, 'developer-tool', 'readme', 2);
  }

  if (/\bcli\b|\bcommand line\b/.test(readme)) {
    addScore(scores, 'cli-tool', 'readme', 2);
  }

  if (/\bembeddings?\b|\bprompt\b|\bvector store\b|\brag\b/.test(readme)) {
    addScore(scores, 'ai-tooling', 'readme', 3);
  }

  if (/\bguardrails?\b|\btoken budgets?\b|\btool calls?\b|\bruntime limits?\b/.test(readme)) {
    addScore(scores, 'ai-tooling', 'readme', 3);
  }

  if (/\bplugin system\b|\bmiddleware\b|\bextensible\b/.test(readme)) {
    addScore(scores, 'framework', 'readme', 2);
  }
}

function collectMetadataSignals(scores, repoMetadata) {
  const description = String(repoMetadata?.description || '').toLowerCase();

  if (description.includes('analysis') || description.includes('repository quality')) {
    addScore(scores, 'analysis-tool', 'metadata', 3);
  }

  if (description.includes('developer tool') || description.includes('developer workflow')) {
    addScore(scores, 'developer-tool', 'metadata', 2);
  }

  if (description.includes('guardrails') || description.includes('runtime limits') || description.includes('llm security')) {
    addScore(scores, 'ai-tooling', 'metadata', 4);
  }

  if (description.includes('dataset') || description.includes('benchmark')) {
    addScore(scores, 'dataset', 'metadata', 4);
  }

  if (description.includes('template') || description.includes('starter')) {
    addScore(scores, 'template', 'metadata', 4);
  }
}

function chooseBestType(scores) {
  const ranked = TYPE_PRIORITY.map((type) => ({ type, score: scores[type] || 0 }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return TYPE_PRIORITY.indexOf(left.type) - TYPE_PRIORITY.indexOf(right.type);
    });

  const best = ranked[0] || { type: 'developer-tool', score: 0 };
  const runnerUp = ranked[1] || { score: 0 };
  const confidenceGap = best.score - runnerUp.score;

  if (best.score < 9) {
    return 'developer-tool';
  }

  if (best.type === 'ai-agent-framework' && best.score < 18) {
    return 'developer-tool';
  }

  if (confidenceGap < 2.5 && best.score < 16) {
    return 'developer-tool';
  }

  return best.type;
}

function detectRepoType(input) {
  const repoMetadata = input.repoMetadata || {};
  const packageJson = input.packageJson || null;
  const readme = String(input.readmeContent || '').toLowerCase();
  const topics = getTopics(repoMetadata);
  const scores = createEmptyScores();

  collectPackageSignals(scores, packageJson);
  collectDependencySignals(scores, packageJson);
  collectStructureSignals(scores, input);
  collectEntrypointSignals(scores, input);
  collectTopicSignals(scores, topics);
  collectReadmeSignals(scores, readme);
  collectMetadataSignals(scores, repoMetadata);

  return chooseBestType(scores);
}

module.exports = {
  detectRepoType,
};
