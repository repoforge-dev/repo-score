'use strict';

const TYPE_PRIORITY = [
  'ai-agent-framework',
  'agent-runtime',
  'llm-framework',
  'ai-tooling',
  'framework',
  'sdk',
  'cli-tool',
  'library',
  'application',
  'reference',
  'learning-resource',
  'dataset',
  'template',
  'unknown',
];

const SOURCE_WEIGHTS = {
  topics: 1.5,
  packageJson: 1.2,
  dependencies: 1,
  readme: 1,
  structure: 0.9,
  metadata: 0.8,
};

const TOPIC_SIGNAL_RULES = [
  { type: 'ai-agent-framework', patterns: ['agent', 'agents', 'multi-agent', 'autonomous-agent'], weight: 12 },
  { type: 'agent-runtime', patterns: ['agent-runtime', 'workflow-engine', 'orchestration'], weight: 11 },
  { type: 'llm-framework', patterns: ['llm-framework', 'foundation-model', 'prompt-framework'], weight: 10 },
  { type: 'ai-tooling', patterns: ['llm', 'rag', 'openai', 'langchain', 'anthropic', 'ai'], weight: 9 },
  { type: 'framework', patterns: ['framework'], weight: 9 },
  { type: 'sdk', patterns: ['sdk'], weight: 8 },
  { type: 'cli-tool', patterns: ['cli', 'command-line'], weight: 9 },
  { type: 'library', patterns: ['library', 'utility'], weight: 8 },
  { type: 'application', patterns: ['app', 'application', 'service'], weight: 7 },
  { type: 'reference', patterns: ['awesome', 'reference'], weight: 9 },
  { type: 'learning-resource', patterns: ['tutorial', 'course', 'guide', 'learning', 'primer'], weight: 10 },
  { type: 'dataset', patterns: ['dataset', 'benchmark', 'corpus'], weight: 11 },
  { type: 'template', patterns: ['template', 'starter', 'boilerplate'], weight: 10 },
];

const README_SIGNAL_RULES = [
  { type: 'ai-agent-framework', pattern: /\bagent\b|\bmulti-agent\b|\bautonomous\b/, weight: 9 },
  { type: 'agent-runtime', pattern: /\bruntime\b|\borchestrat(?:e|ion)\b|\bworkflow engine\b|\bexecution engine\b/, weight: 8 },
  { type: 'llm-framework', pattern: /\bllm framework\b|\bmodel framework\b|\bprompt framework\b/, weight: 8 },
  { type: 'ai-tooling', pattern: /\bllm\b|\brag\b|\bembeddings?\b|\bprompt\b|\bvector store\b/, weight: 7 },
  { type: 'framework', pattern: /\bframework\b|\bplugin system\b|\bextensible\b/, weight: 7 },
  { type: 'sdk', pattern: /\bsdk\b|\bclient library\b/, weight: 7 },
  { type: 'cli-tool', pattern: /\bcli\b|\bcommand line\b|\busage:\s+\w+/i, weight: 7 },
  { type: 'library', pattern: /\blibrary\b|\bpackage\b/, weight: 6 },
  { type: 'application', pattern: /\bweb app\b|\bdashboard\b|\bself-hosted\b|\bdeploy\b/, weight: 6 },
  { type: 'reference', pattern: /\bawesome\b|\breference\b|\bcheatsheet\b|\bcatalog\b/, weight: 8 },
  { type: 'learning-resource', pattern: /\bguide\b|\btutorial\b|\blearn\b|\bprimer\b|\bcourse\b|\bstudy\b/, weight: 8 },
  { type: 'dataset', pattern: /\bdataset\b|\bbenchmark\b|\btraining data\b/, weight: 8 },
  { type: 'template', pattern: /\btemplate\b|\bstarter\b|\bscaffold\b/, weight: 8 },
];

const DEPENDENCY_SIGNAL_RULES = [
  { type: 'ai-agent-framework', packages: ['autogen', 'crewai', 'langgraph', '@mastra/core'], weight: 10 },
  { type: 'agent-runtime', packages: ['temporal', 'bullmq', '@trigger.dev/sdk', 'inngest'], weight: 8 },
  { type: 'llm-framework', packages: ['guidance', 'dspy', 'lmql'], weight: 8 },
  { type: 'ai-tooling', packages: ['openai', '@anthropic-ai/sdk', 'langchain', '@langchain/core', 'llamaindex'], weight: 8 },
  { type: 'framework', packages: ['next', 'nuxt', '@angular/core', '@nestjs/core', 'remix'], weight: 7 },
  { type: 'cli-tool', packages: ['commander', 'yargs', 'oclif', 'cac', 'clipanion'], weight: 9 },
];

function createEmptyScores() {
  return TYPE_PRIORITY.reduce((scores, type) => {
    if (type !== 'unknown') {
      scores[type] = 0;
    }

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

function collectTopicScores(scores, topics) {
  for (const topic of topics) {
    for (const rule of TOPIC_SIGNAL_RULES) {
      if (rule.patterns.some((pattern) => topic.includes(pattern))) {
        addScore(scores, rule.type, 'topics', rule.weight);
      }
    }
  }
}

function collectPackageJsonScores(scores, packageJson) {
  if (!packageJson) {
    return;
  }

  const name = String(packageJson.name || '').toLowerCase();
  const keywords = Array.isArray(packageJson.keywords)
    ? packageJson.keywords.map((keyword) => String(keyword).toLowerCase())
    : [];
  const scripts = Object.keys(packageJson.scripts || {}).map((script) => script.toLowerCase());

  if (packageJson.bin) {
    addScore(scores, 'cli-tool', 'packageJson', 12);
  }

  if (packageJson.exports) {
    addScore(scores, 'library', 'packageJson', 12);
  }

  if ((packageJson.main || packageJson.module) && !packageJson.private) {
    addScore(scores, 'library', 'packageJson', 8);
  }

  if (name.includes('sdk') || keywords.some((keyword) => keyword.includes('sdk'))) {
    addScore(scores, 'sdk', 'packageJson', 8);
  }

  if (keywords.some((keyword) => keyword.includes('runtime'))) {
    addScore(scores, 'agent-runtime', 'packageJson', 8);
  }

  if (keywords.some((keyword) => keyword.includes('llm-framework'))) {
    addScore(scores, 'llm-framework', 'packageJson', 8);
  }

  if (packageJson.private && scripts.some((script) => ['dev', 'start', 'build', 'preview'].includes(script))) {
    addScore(scores, 'application', 'packageJson', 8);
  }

  if (keywords.some((keyword) => keyword.includes('framework'))) {
    addScore(scores, 'framework', 'packageJson', 7);
  }

  if (keywords.some((keyword) => keyword.includes('template') || keyword.includes('starter'))) {
    addScore(scores, 'template', 'packageJson', 8);
  }

  if (keywords.some((keyword) => keyword.includes('dataset') || keyword.includes('benchmark'))) {
    addScore(scores, 'dataset', 'packageJson', 8);
  }

  if (keywords.some((keyword) => keyword.includes('reference') || keyword.includes('awesome'))) {
    addScore(scores, 'reference', 'packageJson', 7);
  }
}

function collectDependencyScores(scores, packageJson) {
  if (!packageJson) {
    return;
  }

  const dependencyMap = {
    ...(packageJson.dependencies || {}),
    ...(packageJson.devDependencies || {}),
    ...(packageJson.peerDependencies || {}),
  };

  for (const rule of DEPENDENCY_SIGNAL_RULES) {
    if (rule.packages.some((packageName) => Object.prototype.hasOwnProperty.call(dependencyMap, packageName))) {
      addScore(scores, rule.type, 'dependencies', rule.weight);
    }
  }

  if (packageJson.private) {
    if (Object.prototype.hasOwnProperty.call(dependencyMap, 'next') || Object.prototype.hasOwnProperty.call(dependencyMap, 'react')) {
      addScore(scores, 'application', 'dependencies', 5);
    }

    if (Object.prototype.hasOwnProperty.call(dependencyMap, 'express') || Object.prototype.hasOwnProperty.call(dependencyMap, 'fastify')) {
      addScore(scores, 'application', 'dependencies', 4);
    }
  }
}

function collectReadmeScores(scores, readme) {
  for (const rule of README_SIGNAL_RULES) {
    if (rule.pattern.test(readme)) {
      addScore(scores, rule.type, 'readme', rule.weight);
    }
  }
}

function collectStructureScores(scores, fileTree, packageJson) {
  const files = getFilePaths(fileTree);
  const markdownCount = files.filter((filePath) => filePath.endsWith('.md')).length;

  if (files.some((filePath) => filePath.startsWith('bin/') || filePath.startsWith('commands/'))) {
    addScore(scores, 'cli-tool', 'structure', 8);
  }

  if (files.some((filePath) => filePath.startsWith('data/') || filePath.endsWith('.csv') || filePath.endsWith('.jsonl') || filePath.endsWith('.parquet'))) {
    addScore(scores, 'dataset', 'structure', 8);
  }

  if (files.some((filePath) => filePath.startsWith('templates/') || filePath.startsWith('starter/') || filePath.includes('boilerplate'))) {
    addScore(scores, 'template', 'structure', 8);
  }

  if (files.some((filePath) => filePath.startsWith('src/')) && packageJson && !packageJson.private && (packageJson.exports || packageJson.main || packageJson.module)) {
    addScore(scores, 'library', 'structure', 6);
  }

  if (files.some((filePath) => ['app/', 'pages/', 'public/', 'prisma/'].some((prefix) => filePath.startsWith(prefix)))) {
    addScore(scores, 'application', 'structure', 6);
  }

  if (files.some((filePath) => filePath.startsWith('packages/') || filePath.startsWith('plugins/'))) {
    addScore(scores, 'framework', 'structure', 5);
  }

  if (files.some((filePath) => filePath.startsWith('docs/') || filePath.startsWith('guides/')) && markdownCount >= 3) {
    addScore(scores, 'reference', 'structure', 7);
  }

  if (markdownCount >= 5 && !packageJson) {
    addScore(scores, 'learning-resource', 'structure', 7);
  }
}

function collectMetadataScores(scores, repoMetadata) {
  const description = String(repoMetadata.description || '').toLowerCase();
  const language = String(repoMetadata.language || '').toLowerCase();

  if (!repoMetadata.language || language === 'unknown') {
    addScore(scores, 'reference', 'metadata', 3);
  }

  if (description.includes('guide') || description.includes('tutorial') || description.includes('learn') || description.includes('primer')) {
    addScore(scores, 'learning-resource', 'metadata', 8);
  }

  if (description.includes('reference') || description.includes('awesome list') || description.includes('list of')) {
    addScore(scores, 'reference', 'metadata', 8);
  }

  if (description.includes('dataset') || description.includes('benchmark')) {
    addScore(scores, 'dataset', 'metadata', 7);
  }
}

function chooseBestType(scores, input) {
  let bestType = 'unknown';
  let bestScore = 0;

  for (const type of TYPE_PRIORITY) {
    if (type === 'unknown') {
      continue;
    }

    const score = scores[type] || 0;
    if (score > bestScore) {
      bestType = type;
      bestScore = score;
    }
  }

  if (bestScore >= 8) {
    return bestType;
  }

  const readme = String(input.readmeContent || '').toLowerCase();
  const repoMetadata = input.repoMetadata || {};
  const packageJson = input.packageJson || null;
  const files = getFilePaths(input.fileTree);

  if (/\bawesome\b|\breference\b|\bcatalog\b/.test(readme) || String(repoMetadata.description || '').toLowerCase().includes('list of')) {
    return 'reference';
  }

  if (/\bguide\b|\btutorial\b|\blearn\b|\bprimer\b|\bcourse\b/.test(readme)) {
    return 'learning-resource';
  }

  if (files.some((filePath) => filePath.endsWith('.csv') || filePath.endsWith('.jsonl') || filePath.endsWith('.parquet'))) {
    return 'dataset';
  }

  if (packageJson && (packageJson.exports || packageJson.main || packageJson.module) && !packageJson.private) {
    return 'library';
  }

  if (packageJson?.private || files.some((filePath) => ['app/', 'pages/', 'public/'].some((prefix) => filePath.startsWith(prefix)))) {
    return 'application';
  }

  return 'library';
}

function detectRepoType(input) {
  const repoMetadata = input.repoMetadata || {};
  const packageJson = input.packageJson || null;
  const readme = (input.readmeContent || '').toLowerCase();
  const topics = Array.isArray(repoMetadata.topics)
    ? repoMetadata.topics.map((topic) => String(topic).toLowerCase())
    : [];
  const scores = createEmptyScores();

  collectTopicScores(scores, topics);
  collectPackageJsonScores(scores, packageJson);
  collectDependencyScores(scores, packageJson);
  collectReadmeScores(scores, readme);
  collectStructureScores(scores, input.fileTree, packageJson);
  collectMetadataScores(scores, repoMetadata);

  return chooseBestType(scores, input);
}

module.exports = {
  detectRepoType,
};
