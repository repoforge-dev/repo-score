'use strict';

const TYPE_PRIORITY = [
  'system-project',
  'learning-platform',
  'language-tooling',
  'ai-agent-framework',
  'ai-tooling',
  'framework',
  'sdk',
  'cli-tool',
  'analysis-tool',
  'application',
  'library',
  'learning-resource',
  'reference',
  'dataset',
  'template',
  'developer-tool',
];

const SOURCE_WEIGHTS = {
  structure: 5,
  packageJson: 2.5,
  dependencies: 1.5,
  entrypoints: 1,
  topics: 1.5,
  readme: 1,
  metadata: 1,
};

const CLI_DEPENDENCIES = ['commander', 'yargs', 'oclif', 'cac', 'clipanion', 'ink', 'cobra'];
const FRAMEWORK_DEPENDENCIES = [
  'next',
  'nuxt',
  'vite',
  'vitepress',
  'sveltekit',
  '@nestjs/core',
  'express',
  'koa',
  'fastify',
  'hono',
];
const SDK_DEPENDENCIES = ['axios', 'got', 'undici', 'httpx', 'requests', 'aiohttp', 'fetch', 'grpc'];
const AI_DEPENDENCIES = [
  'openai',
  '@anthropic-ai/sdk',
  'langchain',
  '@langchain/core',
  '@langchain/openai',
  'llamaindex',
  'transformers',
  'sentence-transformers',
  'tokenizers',
  'torch',
  'tensorflow',
  'onnxruntime',
];
const AGENT_FRAMEWORK_DEPENDENCIES = ['langchain', 'langgraph', 'autogen', 'crewai', 'llamaindex'];
const LANGUAGE_TOOLING_DEPENDENCIES = ['typescript', '@babel/core', 'esbuild', 'swc', 'tree-sitter'];

function createScores() {
  return TYPE_PRIORITY.reduce((accumulator, type) => {
    accumulator[type] = 0;
    return accumulator;
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
    ...(packageJson?.optionalDependencies || {}),
  };
}

function getTopics(repoMetadata) {
  return Array.isArray(repoMetadata?.topics)
    ? repoMetadata.topics.map((topic) => String(topic).toLowerCase())
    : [];
}

function hasDependency(dependencyMap, dependencies) {
  return dependencies.some((dependency) => Object.prototype.hasOwnProperty.call(dependencyMap, dependency));
}

function countDependencies(dependencyMap, dependencies) {
  return dependencies.filter((dependency) => Object.prototype.hasOwnProperty.call(dependencyMap, dependency)).length;
}

function hasPath(files, patterns) {
  return patterns.some((pattern) =>
    files.some((filePath) => (pattern instanceof RegExp ? pattern.test(filePath) : filePath.includes(pattern)))
  );
}

function countMatches(files, patterns) {
  return files.filter((filePath) =>
    patterns.some((pattern) => (pattern instanceof RegExp ? pattern.test(filePath) : filePath.includes(pattern)))
  ).length;
}

function getTopLevelDirectories(files) {
  return new Set(
    files
      .map((filePath) => filePath.split('/')[0])
      .filter((segment) => segment && !segment.includes('.'))
  );
}

function hasReadmeKeyword(readme, patterns) {
  return patterns.some((pattern) => pattern.test(readme));
}

function getAgentRuntimeSignals(files, dependencyMap, readme) {
  return [
    hasPath(files, [/agent.*runtime/, /runtime.*agent/, /execution-loop/, /run-loop/, /agent-runner/, /orchestrator/]) ||
    /\bagent runtime\b|\bexecution loop\b|\bautonomous execution\b/.test(readme),
    hasPath(files, [/tool-execution/, /tool-runner/, /tools\/registry/, /tool-registry/, /tool-manager/]) ||
    /\btool execution\b|\btool registry\b|\btool calling\b/.test(readme),
    hasPath(files, [/memory\//, /memory-store/, /agent-memory/, /memory-manager/]) ||
    /\bagent memory\b|\bmemory store\b/.test(readme),
    hasPath(files, [/planner\//, /planning\//, /task-planner/, /plan-executor/]) ||
    /\bplanner\b|\bplanning module\b/.test(readme),
    hasPath(files, [/decision-loop/, /goal-manager/, /autonomous/, /policy-engine/]) ||
    /\bautonomous agent\b|\bautonomous loop\b|\bdecision loop\b/.test(readme),
    countDependencies(dependencyMap, AGENT_FRAMEWORK_DEPENDENCIES) >= 2,
  ].filter(Boolean).length;
}

function getAgentContextSignals(readme, topics, description) {
  return [
    topics.some((topic) => topic.includes('ai-agents') || topic.includes('agents') || topic.includes('multiagent')),
    /\bagents?\b/.test(readme),
    /\btools?\b|\btoolkits?\b/.test(readme),
    /\bmemory\b/.test(readme),
    /\bagent\b|\bautonomous\b/.test(description),
  ].filter(Boolean).length;
}

function collectPackageSignals(scores, packageJson) {
  if (!packageJson) {
    return;
  }

  const keywords = Array.isArray(packageJson.keywords)
    ? packageJson.keywords.map((keyword) => String(keyword).toLowerCase())
    : [];
  const scripts = Object.keys(packageJson.scripts || {}).map((script) => script.toLowerCase());
  const packageName = String(packageJson.name || '').toLowerCase();
  const exportsField = packageJson.exports;

  if (packageJson.bin) {
    addScore(scores, 'cli-tool', 'packageJson', 8);
  }

  if (exportsField || packageJson.main || packageJson.module) {
    addScore(scores, 'library', 'packageJson', 8);
  }

  if (packageJson.types || packageJson.typings) {
    addScore(scores, 'library', 'packageJson', 3);
    addScore(scores, 'sdk', 'packageJson', 2);
    addScore(scores, 'language-tooling', 'packageJson', 2);
  }

  if (packageJson.private && scripts.some((script) => ['dev', 'start', 'serve', 'preview'].includes(script))) {
    addScore(scores, 'application', 'packageJson', 7);
  }

  if (packageJson.workspaces) {
    addScore(scores, 'framework', 'packageJson', 3);
    addScore(scores, 'learning-platform', 'packageJson', 2);
  }

  if (packageName.includes('sdk') || keywords.some((keyword) => keyword.includes('sdk'))) {
    addScore(scores, 'sdk', 'packageJson', 7);
  }

  if (keywords.some((keyword) => keyword.includes('framework'))) {
    addScore(scores, 'framework', 'packageJson', 6);
  }

  if (keywords.some((keyword) => keyword.includes('cli') || keyword.includes('command-line'))) {
    addScore(scores, 'cli-tool', 'packageJson', 5);
  }

  if (keywords.some((keyword) => keyword.includes('analysis') || keyword.includes('scoring') || keyword.includes('repo-quality'))) {
    addScore(scores, 'analysis-tool', 'packageJson', 6);
  }

  if (keywords.some((keyword) => keyword.includes('developer-tool') || keyword.includes('developer-tools'))) {
    addScore(scores, 'developer-tool', 'packageJson', 5);
  }

  if (keywords.some((keyword) => keyword.includes('template') || keyword.includes('starter') || keyword.includes('boilerplate'))) {
    addScore(scores, 'template', 'packageJson', 6);
  }

  if (keywords.some((keyword) => keyword.includes('dataset') || keyword.includes('benchmark'))) {
    addScore(scores, 'dataset', 'packageJson', 6);
  }

  if (keywords.some((keyword) => keyword.includes('compiler') || keyword.includes('transpiler') || keyword.includes('language-server'))) {
    addScore(scores, 'language-tooling', 'packageJson', 8);
  }
}

function collectDependencySignals(scores, packageJson) {
  const dependencyMap = getDependencyMap(packageJson);
  if (Object.keys(dependencyMap).length === 0) {
    return dependencyMap;
  }

  if (hasDependency(dependencyMap, CLI_DEPENDENCIES)) {
    addScore(scores, 'cli-tool', 'dependencies', 7);
  }

  if (hasDependency(dependencyMap, FRAMEWORK_DEPENDENCIES)) {
    addScore(scores, 'framework', 'dependencies', 7);
  }

  if (hasDependency(dependencyMap, SDK_DEPENDENCIES)) {
    addScore(scores, 'sdk', 'dependencies', 5);
  }

  if (hasDependency(dependencyMap, AI_DEPENDENCIES)) {
    addScore(scores, 'ai-tooling', 'dependencies', 7);
  }

  if (countDependencies(dependencyMap, AGENT_FRAMEWORK_DEPENDENCIES) >= 2) {
    addScore(scores, 'ai-agent-framework', 'dependencies', 9);
  }

  if (hasDependency(dependencyMap, LANGUAGE_TOOLING_DEPENDENCIES)) {
    addScore(scores, 'language-tooling', 'dependencies', 8);
  }

  if (Object.keys(packageJson?.peerDependencies || {}).length > 0) {
    addScore(scores, 'library', 'dependencies', 3);
    addScore(scores, 'framework', 'dependencies', 2);
  }

  return dependencyMap;
}

function collectStructureSignals(scores, input, dependencyMap) {
  const files = getFilePaths(input.fileTree);
  const readme = String(input.readmeContent || '').toLowerCase();
  const topics = getTopics(input.repoMetadata || {});
  const description = String(input.repoMetadata?.description || '').toLowerCase();
  const topLevelDirectories = getTopLevelDirectories(files);
  const pythonPackageCount = countMatches(files, [/\/__init__\.py$/, /^__init__\.py$/]);
  const readmeCount = countMatches(files, [/\/readme\.md$/, /^readme\.md$/]);
  const agentRuntimeSignals = getAgentRuntimeSignals(files, dependencyMap, readme);
  const agentContextSignals = getAgentContextSignals(readme, topics, description);

  if (
    ['arch', 'drivers', 'fs', 'include', 'init', 'kernel', 'mm', 'net'].filter((directory) => topLevelDirectories.has(directory)).length >= 5 ||
    hasPath(files, [/^arch\//, /^drivers\//, /^fs\//, /^kernel\//, /^mm\//, /^net\//, /^init\//, /(^|\/)kconfig$/])
  ) {
    addScore(scores, 'system-project', 'structure', 12);
  }

  if (
    hasPath(files, [/^curriculum\//, /^courses?\//, /^lessons?\//, /^certifications?\//, /\/learn\//]) &&
    hasPath(files, [/^app\//, /^api\//, /^client\//, /^server\//, /^web\//])
  ) {
    addScore(scores, 'learning-platform', 'structure', 12);
    addScore(scores, 'application', 'structure', 4);
  }

  if (
    ((readmeCount >= 5 &&
      hasPath(files, [/algorithm/, /tutorial/, /lesson/, /practice/, /examples?\//])) &&
      (topics.some((topic) => topic.includes('education') || topic.includes('learn') || topic.includes('practice')) ||
        description.includes('education') ||
        description.includes('algorithm') ||
        /\bfor education\b|\blearn\b|\bpractice\b/.test(readme))) ||
    (topLevelDirectories.size >= 12 &&
      !hasPath(files, [/^app\//, /^api\//, /^server\//, /^client\//]) &&
      hasPath(files, [/algorithm/, /tutorial/, /lesson/, /practice/, /examples?\//]) &&
      (topics.some((topic) => topic.includes('education') || topic.includes('learn') || topic.includes('practice')) ||
        description.includes('education') ||
        description.includes('algorithm')))
  ) {
    addScore(scores, 'learning-resource', 'structure', 7);
  }

  if (hasPath(files, [/^src\//, /^lib\//, /^packages\//, /^include\//]) || pythonPackageCount >= 2) {
    addScore(scores, 'library', 'structure', 7);
  }

  if (pythonPackageCount >= 10) {
    addScore(scores, 'library', 'structure', 5);
  }

  // Require at least two of these well-known app-structure folders to count — 'web/' alone is often just a docs site
  const appDirs = ['app', 'pages', 'public', 'server', 'api', 'client'].filter(d =>
    hasPath(files, [new RegExp('^' + d + '\/')])
  );
  if (appDirs.length >= 2 || (appDirs.length >= 1 && hasPath(files, [/^web\//]))) {
    addScore(scores, 'application', 'structure', 6);
  }

  if (
    hasPath(files, [/next\.config\./, /vite\.config\./, /nuxt\.config\./, /svelte\.config\./, /^routes\//, /^router\//, /^middleware\//, /^plugins\//]) ||
    (hasPath(files, [/^packages\//]) && hasPath(files, [/^packages\/[^/]+\/src\//, /^packages\/[^/]+\/server\//]))
  ) {
    addScore(scores, 'framework', 'structure', 9);
  }

  if (hasPath(files, [/^src\/platforms\//, /(^|\/)runtime-core\//, /(^|\/)compiler-core\//, /(^|\/)compiler-sfc\//, /(^|\/)packages\/vue\//])) {
    addScore(scores, 'framework', 'structure', 6);
  }

  if (hasPath(files, [/^cmd\//, /^bin\//, /^commands\//, /(^|\/)cli(\/|\.|$)/])) {
    addScore(scores, 'cli-tool', 'structure', 9);
  }

  if (hasPath(files, [/^api\//, /^analyzers?\//, /^scanners?\//, /^scoring\//, /^reports\//, /^metrics\//]) || hasPath(files, [/^data\/repos\//, /^cache\//])) {
    addScore(scores, 'analysis-tool', 'structure', 10);
  }

  if (hasPath(files, [/^docs\/architecture\.md$/, /^docs\/enforcement\.md$/, /doctor\.(ts|js|py)$/])) {
    addScore(scores, 'analysis-tool', 'structure', 4);
  }

  if (hasPath(files, [/(^|\/)(embeddings?|prompts?|tokenizers?|models?|pipelines?|vector(store|db)?|guardrails?|policies|safety)(\/|$)/])) {
    addScore(scores, 'ai-tooling', 'structure', 8);
  }

  if (hasPath(files, [/^src\/transformers\//, /(^|\/)(modeling|tokenization|generation|pipelines?)_/])) {
    addScore(scores, 'ai-tooling', 'structure', 7);
  }

  if (agentRuntimeSignals >= 3 || (agentRuntimeSignals >= 1 && agentContextSignals >= 3)) {
    addScore(scores, 'ai-agent-framework', 'structure', 12);
  }

  if (
    hasPath(files, [
      /^src\/compiler\//,
      /^src\/services\//,
      /^src\/server\//,
      /(^|\/)(tsserver|language-?service|transpiler)(\/|\.|$)/,
      /(^|\/)typescript\/src\/compiler\//,
    ])
  ) {
    addScore(scores, 'language-tooling', 'structure', 12);
  }

  if (hasPath(files, [/^templates?\//, /^starters?\//, /boilerplate/, /scaffold/])) {
    addScore(scores, 'template', 'structure', 8);
  }

  if (hasPath(files, [/^data\//, /\.csv$/, /\.jsonl$/, /\.parquet$/, /\.tsv$/])) {
    addScore(scores, 'dataset', 'structure', 8);
  }

  if (hasPath(files, [/^src\/.*client/, /^clients?\//, /^services\//, /^resources\//, /_client\./, /client\.(ts|js|py|go|rb)$/])) {
    addScore(scores, 'sdk', 'structure', 7);
  }
}

function collectEntrypointSignals(scores, input) {
  const files = getFilePaths(input.fileTree);
  const packageJson = input.packageJson || null;
  const scripts = Object.keys(packageJson?.scripts || {}).map((script) => script.toLowerCase());

  if (packageJson?.bin || hasPath(files, [/^cmd\/[^/]+\/main\.go$/, /^bin\/[^/]+$/, /^bin\/[^/]+\.(js|ts|mjs|cjs|py)$/])) {
    addScore(scores, 'cli-tool', 'entrypoints', 7);
  }

  if (packageJson?.exports || packageJson?.main || packageJson?.module) {
    addScore(scores, 'library', 'entrypoints', 4);
  }

  if (scripts.some((script) => ['dev', 'start', 'serve', 'preview'].includes(script)) && hasPath(files, [/^app\//, /^api\//, /^server\//])) {
    addScore(scores, 'application', 'entrypoints', 5);
  }

  if (scripts.some((script) => script.includes('build') || script.includes('compiler') || script.includes('tsc'))) {
    addScore(scores, 'language-tooling', 'entrypoints', 3);
  }

  if (scripts.some((script) => script.includes('analy') || script.includes('scan') || script.includes('score'))) {
    addScore(scores, 'analysis-tool', 'entrypoints', 4);
  }
}

function collectTopicSignals(scores, topics) {
  for (const topic of topics) {
    if (topic.includes('framework')) {
      addScore(scores, 'framework', 'topics', 4);
    }

    if (topic.includes('cli') || topic.includes('command-line')) {
      addScore(scores, 'cli-tool', 'topics', 4);
    }

    if (topic.includes('sdk')) {
      addScore(scores, 'sdk', 'topics', 4);
    }

    if (topic.includes('analysis') || topic.includes('repo-quality') || topic.includes('developer-insights')) {
      addScore(scores, 'analysis-tool', 'topics', 4);
    }

    if (topic.includes('developer-tool')) {
      addScore(scores, 'developer-tool', 'topics', 3);
    }

    if (topic.includes('education') || topic.includes('curriculum') || topic.includes('certification')) {
      addScore(scores, 'learning-platform', 'topics', 4);
      addScore(scores, 'learning-resource', 'topics', 3);
    }

    if (topic.includes('algorithm') || topic.includes('practice') || topic.includes('learn')) {
      addScore(scores, 'learning-resource', 'topics', 3);
    }

    if (topic.includes('language') || topic.includes('compiler') || topic.includes('transpiler')) {
      addScore(scores, 'language-tooling', 'topics', 4);
    }

    if (topic.includes('kernel') || topic.includes('operating-system')) {
      addScore(scores, 'system-project', 'topics', 4);
    }

    if (topic.includes('llm') || topic.includes('embeddings') || topic.includes('vector') || topic.includes('ml') || topic.includes('nlp')) {
      addScore(scores, 'ai-tooling', 'topics', 3);
    }

    if (topic.includes('agent') || topic.includes('autonomous-agent')) {
      addScore(scores, 'ai-agent-framework', 'topics', 2);
    }

    if (topic.includes('agent-runtime') || topic.includes('agent-guardrails') || topic.includes('agent-security') ||
      topic.includes('ai-guardrails') || topic.includes('ai-safety') || topic.includes('ai-runtime') ||
      topic.includes('runtime-guardrails') || topic.includes('runtime-safety') || topic.includes('llm-guardrails') ||
      topic.includes('ai-infrastructure') || topic.includes('agentic-ai')) {
      addScore(scores, 'ai-tooling', 'topics', 5);
      addScore(scores, 'library', 'topics', 2);
    }

    // Curated awesome/reference lists
    if (topic === 'awesome' || topic === 'awesome-list' || topic === 'lists' || topic === 'list' ||
      topic === 'resources' || topic === 'resource' || topic === 'reference' ||
      topic === 'books' || topic === 'cheatsheets' || topic === 'unicorns' ||
      topic === 'collections' || topic === 'free' || topic === 'free-software') {
      addScore(scores, 'reference', 'topics', 5);
    }

    // Dataset signals — only strong dataset indicators, not scientific analysis library topics
    if (topic === 'dataset' || topic === 'public-api' || topic === 'public-apis') {
      addScore(scores, 'dataset', 'topics', 5);
    }
    // 'api' and 'apis' alone are moderate dataset signals
    if (topic === 'api' || topic === 'apis') {
      addScore(scores, 'dataset', 'topics', 3);
    }

    // Tutorial/learning signals (not education — interview prep, projects)
    if (topic.includes('tutorial') || topic.includes('interview') || topic.includes('interview-preparation') ||
      topic === 'interview-questions' || topic === 'project' || topic.includes('beginner-project') ||
      topic === 'data-structures' || topic === 'computer-science') {
      addScore(scores, 'learning-resource', 'topics', 3);
    }
  }
}

function collectReadmeSignals(scores, readme) {
  if (!readme) {
    return;
  }

  if (hasReadmeKeyword(readme, [/\brepository quality\b/, /\brepo score\b/, /\bscore breakdown\b/, /\banalyze github repositories\b/])) {
    addScore(scores, 'analysis-tool', 'readme', 4);
  }

  if (hasReadmeKeyword(readme, [/\bframework\b/, /\bplugin system\b/, /\bmiddleware\b/, /\brouting\b/, /\bserver rendering\b/])) {
    addScore(scores, 'framework', 'readme', 3);
  }

  if (hasReadmeKeyword(readme, [/\bcommand line\b/, /\bcli\b/, /\bterminal\b/])) {
    addScore(scores, 'cli-tool', 'readme', 3);
  }

  if (hasReadmeKeyword(readme, [/\bcommand line tools?\b/, /#!\/usr\/bin\/env node/, /\bgenerate completion scripts\b/])) {
    addScore(scores, 'cli-tool', 'readme', 4);
  }

  if (hasReadmeKeyword(readme, [/\bofficial\b.*\blibrary\b/, /\bapi client\b/, /\brest api\b/, /\bservice client\b/])) {
    addScore(scores, 'sdk', 'readme', 4);
  }

  if (hasReadmeKeyword(readme, [/\blibrary for\b/, /\bjavascript library\b/, /\bpython module\b/])) {
    addScore(scores, 'library', 'readme', 3);
  }

  if (hasReadmeKeyword(readme, [/\bprompt\b/, /\bembedding\b/, /\bvector store\b/, /\btokenizer\b/, /\bmodel weights?\b/])) {
    addScore(scores, 'ai-tooling', 'readme', 3);
  }

  if (hasReadmeKeyword(readme, [/\bplanner\b/, /\bmemory\b/, /\btool registry\b/, /\bautonomous\b/, /\bagent workflows?\b/])) {
    addScore(scores, 'ai-agent-framework', 'readme', 3);
  }

  if (hasReadmeKeyword(readme, [/\bcurriculum\b/, /\bcertification\b/, /\blearn to code\b/, /\blearning platform\b/])) {
    addScore(scores, 'learning-platform', 'readme', 4);
  }

  if (hasReadmeKeyword(readme, [/\balgorithms?\b/, /\bfor education\b/, /\bpractice\b/, /\btutorial\b/])) {
    addScore(scores, 'learning-resource', 'readme', 4);
  }

  if (hasReadmeKeyword(readme, [/\blanguage service\b/, /\bcompiler\b/, /\btranspiler\b/, /\btype checker\b/])) {
    addScore(scores, 'language-tooling', 'readme', 4);
  }

  if (hasReadmeKeyword(readme, [/\bkernel\b/, /\bsource tree\b/, /\bdrivers\b/, /\boperating system\b/])) {
    addScore(scores, 'system-project', 'readme', 5);
  }

  // Curated lists / references
  if (hasReadmeKeyword(readme, [/\ba curated list\b/, /\ba collection of\b/, /\bcurated list of\b/, /\bawesome list\b/])) {
    addScore(scores, 'reference', 'readme', 6);
  }

  // Dataset / API list — strong signal when the README describes a list of APIs
  if (hasReadmeKeyword(readme, [/\ba (collective|curated) list of.{0,40}api/])) {
    addScore(scores, 'dataset', 'readme', 10);
  }
}

function collectMetadataSignals(scores, repoMetadata) {
  const description = String(repoMetadata?.description || '').toLowerCase();
  const language = String(repoMetadata?.language || '').toLowerCase();

  if (description.includes('framework')) {
    addScore(scores, 'framework', 'metadata', 7);
  }

  if (description.includes('command line') || description.includes('cli')) {
    addScore(scores, 'cli-tool', 'metadata', 7);
  }

  if (description.includes('official') && description.includes('library')) {
    addScore(scores, 'sdk', 'metadata', 8);
    addScore(scores, 'library', 'metadata', 3);
  }

  if (description.includes('api') && (description.includes('library') || description.includes('client'))) {
    addScore(scores, 'sdk', 'metadata', 7);
  }

  if (description.includes('official') && description.includes('api')) {
    addScore(scores, 'sdk', 'metadata', 4);
  }

  if (description.includes('library')) {
    addScore(scores, 'library', 'metadata', 8);
  }

  if (description.includes('analysis') || description.includes('scoring') || description.includes('quality')) {
    addScore(scores, 'analysis-tool', 'metadata', 5);
  }

  if (description.includes('developer tool')) {
    addScore(scores, 'developer-tool', 'metadata', 4);
  }

  if (description.includes('curriculum') || description.includes('learn') || description.includes('certification')) {
    addScore(scores, 'learning-platform', 'metadata', 8);
    addScore(scores, 'learning-resource', 'metadata', 4);
  }

  if (description.includes('algorithm') || description.includes('education')) {
    addScore(scores, 'learning-resource', 'metadata', 7);
  }

  if (description.includes('compiler') || description.includes('language service') || description.includes('transpiler')) {
    addScore(scores, 'language-tooling', 'metadata', 7);
  }

  if (description.includes('kernel') || description.includes('source tree')) {
    addScore(scores, 'system-project', 'metadata', 9);
  }

  if (description.includes('machine learning') || description.includes('llm') || description.includes('transformer')) {
    addScore(scores, 'ai-tooling', 'metadata', 8);
  }

  if (description.includes('agent') || description.includes('autonomous')) {
    addScore(scores, 'ai-agent-framework', 'metadata', 2);
  }

  if (description.includes('guardrails') || description.includes('runtime limits') || description.includes('runtime guardrails') || description.includes('runtime safety')) {
    addScore(scores, 'ai-tooling', 'metadata', 8);
    addScore(scores, 'library', 'metadata', 4);
  }

  // Curated lists / references
  if (/^a(n opinionated)? (curated |awesome |collective )?list of/i.test(description) ||
    /^:books:|freely available|collection of inspiring|a curated list/i.test(description) ||
    description.includes('awesome list') || description.includes('cheatsheet') ||
    (/counting stars/i.test(description))) {
    addScore(scores, 'reference', 'metadata', 10);
  }

  // Dataset / API list
  if (/a (collective|curated) list of.{0,30}api/i.test(description) ||
    (description.includes('list of') && (description.includes(' api') || description.includes('apis')))) {
    addScore(scores, 'dataset', 'metadata', 10);
  }

  // Interactive web application
  if (/interactive (roadmap|guide|content)/i.test(description) || description.includes('interactive roadmap')) {
    addScore(scores, 'application', 'metadata', 10);
  }

  if (language === 'python') {
    addScore(scores, 'library', 'metadata', 1);
  }
}

function applySafetyGuards(scores, input, dependencyMap) {
  const files = getFilePaths(input.fileTree);
  const readme = String(input.readmeContent || '').toLowerCase();
  const topics = getTopics(input.repoMetadata || {});
  const packageJson = input.packageJson || null;
  const description = String(input.repoMetadata?.description || '').toLowerCase();

  const agentRuntimeSignals = getAgentRuntimeSignals(files, dependencyMap, readme);
  const agentContextSignals = getAgentContextSignals(readme, topics, description);
  if (agentRuntimeSignals < 3 && !(agentRuntimeSignals >= 1 && agentContextSignals >= 3)) {
    scores['ai-agent-framework'] = 0;
  }

  const cliSignals =
    Number(Boolean(packageJson?.bin)) +
    Number(hasDependency(dependencyMap, CLI_DEPENDENCIES)) +
    Number(hasPath(files, [/^cmd\//, /^bin\//, /^commands\//, /(^|\/)cli(\/|\.|$)/])) +
    Number(/\bcommand line\b|\bcli\b/.test(readme)) +
    Number(topics.some((topic) => topic.includes('cli')));

  if (cliSignals < 2) {
    scores['cli-tool'] = 0;
  }

  const frameworkSignals =
    Number(hasPath(files, [/next\.config\./, /vite\.config\./, /nuxt\.config\./, /svelte\.config\./])) +
    Number(hasPath(files, [/^routes\//, /^router\//, /^middleware\//, /^plugins\//])) +
    Number(hasDependency(dependencyMap, FRAMEWORK_DEPENDENCIES)) +
    // Exclude curated-list topics like 'python-framework' — these describe what the list covers, not the repo being a framework
    Number(topics.some((topic) => topic === 'framework' || topic === 'javascript-framework' || topic === 'nodejs-framework' || topic === 'nestjs' || topic === 'react')) +
    Number(/\bframework\b/.test(readme) && !/\ba curated list\b|\bcollection of\b/.test(readme)) +
    Number(String(input.repoMetadata?.description || '').toLowerCase().includes('framework') && !/list of|collection of/i.test(description));

  if (frameworkSignals < 2) {
    scores['framework'] = Math.min(scores['framework'], 10);
  } else {
    scores['language-tooling'] = Math.min(scores['language-tooling'], 8);
    scores['framework'] += 6;
  }

  // Protect reference and dataset types from being overridden by generic library/framework/application signals
  const referenceScore = scores['reference'] || 0;
  const datasetScore = scores['dataset'] || 0;
  if (referenceScore >= 10) {
    scores['framework'] = Math.min(scores['framework'], 8);
    scores['library'] = Math.min(scores['library'], 8);
    scores['application'] = Math.min(scores['application'], 8);
    // If dataset is also strong, let it win over reference (e.g. public-apis is a dataset, not just a reference)
    if (datasetScore >= referenceScore - 5) {
      scores['reference'] = Math.min(scores['reference'], datasetScore - 1);
    }
  }
  if (datasetScore >= 10) {
    scores['library'] = Math.min(scores['library'], 8);
  }

  const languageToolingSignals =
    Number(
      hasPath(files, [
        /^src\/compiler\//,
        /^src\/services\//,
        /^src\/server\//,
        /(^|\/)(tsserver|language-?service|transpiler)(\/|\.|$)/,
        /(^|\/)typescript\/src\/compiler\//,
      ])
    ) +
    Number(hasDependency(dependencyMap, LANGUAGE_TOOLING_DEPENDENCIES)) +
    Number(/\bcompiler\b|\blanguage service\b|\btype checker\b/.test(readme)) +
    Number(description.includes('compiler') || description.includes('language service'));

  if (languageToolingSignals < 2) {
    scores['language-tooling'] = 0;
  }

  const sdkSignals =
    Number(description.includes('sdk')) +
    Number(description.includes('api') && (description.includes('client') || description.includes('library'))) +
    Number(readme.includes('rest api') || readme.includes('api client') || readme.includes('official')) +
    Number(hasPath(files, [/^src\/.*client/, /^clients?\//, /^services\//, /^resources\//, /_client\./])) +
    Number(hasDependency(dependencyMap, SDK_DEPENDENCIES));

  if (sdkSignals < 2) {
    scores['sdk'] = Math.min(scores['sdk'], 6);
  } else {
    scores['sdk'] += 5;
    if (description.includes('official') && description.includes('api')) {
      scores['library'] = Math.min(scores['library'], 10);
      scores['sdk'] += 8;
    }
  }

  if (description.includes('library') && cliSignals < 4) {
    scores['cli-tool'] = Math.min(scores['cli-tool'], 6);
  }

  if (/\bcommand line tools?\b/.test(readme) || /\bcommand line\b/.test(description)) {
    scores['cli-tool'] += 6;
    if (cliSignals >= 3) {
      scores['library'] = Math.min(scores['library'], 8);
      scores['cli-tool'] += 4;
    }
  }

  if (description.includes('library') && !/\bcommand line tools?\b/.test(readme)) {
    scores['cli-tool'] = Math.min(scores['cli-tool'], 4);
  }

  if (
    (description.includes('guardrails') || description.includes('runtime limits') || description.includes('runtime guardrails')) &&
    hasPath(files, [/^docs\/architecture\.md$/, /^docs\/enforcement\.md$/, /doctor\.(ts|js|py)$/])
  ) {
    // This is a runtime safety library, not an analysis tool
    scores['ai-tooling'] += 12;
    scores['library'] += 8;
    scores['analysis-tool'] = Math.min(scores['analysis-tool'], 4);
  }

  if (
    topics.some(
      (topic) =>
        topic.includes('machine-learning') ||
        topic.includes('deep-learning') ||
        topic.includes('nlp') ||
        topic.includes('transformers')
    )
  ) {
    scores['ai-tooling'] += 8;
  }

  const aiToolingSignals =
    Number(hasDependency(dependencyMap, AI_DEPENDENCIES)) +
    Number(
      topics.some(
        (topic) =>
          topic.includes('ai') ||
          topic.includes('llm') ||
          topic.includes('ml') ||
          topic.includes('machine-learning') ||
          topic.includes('transformers') ||
          topic.includes('nlp')
      )
    ) +
    Number(/\bllm\b|\bembeddings?\b|\bprompt\b|\bvector store\b|\btokenizer\b|\btransformers?\b/.test(readme)) +
    Number(/\bmachine learning\b|\btransformers?\b|\bllm\b/.test(description));

  if (aiToolingSignals < 2) {
    scores['ai-tooling'] = Math.min(scores['ai-tooling'], 6);
  }

  // --- Library protection ---
  // Repos with explicit 'library' phrasing should not become framework or dataset
  if (/\blibrary for\b|\bjavascript library\b|\bpython library\b|\butility library\b|\ba library\b/i.test(description) ||
    (description.includes('library') && !description.includes('list of'))) {
    // Cap framework at library level
    scores['framework'] = Math.min(scores['framework'], Math.max((scores['library'] || 0) - 2, 8));
    // Cap dataset
    scores['dataset'] = Math.min(scores['dataset'], 8);
    // Protect library score itself: data manipulation libraries are always libraries
    if (/data analysis|manipulation library|data manipulation/i.test(description)) {
      scores['library'] += 6;
      scores['dataset'] = Math.min(scores['dataset'], 6);
    }
    // Cap application for non-private library repos (libraries may have web/docs dirs)
    if (!(packageJson && packageJson.private)) {
      scores['application'] = Math.min(scores['application'], Math.max((scores['library'] || 0) - 1, 10));
    }
  }

  // --- Active scientific/ML library protection ---
  // scikit-learn / numpy / pandas style repos: has Python source + data-science/ml topics = library
  const hasDataScienceLib =
    hasPath(files, [/\.(py|pyx|pxd)$/]) &&
    topics.some(t => t === 'data-science' || t === 'machine-learning' || t === 'data-analysis' || t === 'statistics' || t === 'pandas' || t === 'numpy') &&
    (
      // Has a named package directory matching a common ML lib
      hasPath(files, [/^(pandas|sklearn|numpy|scipy|torch|tensorflow|matplotlib|seaborn)\//]) ||
      // OR the description explicitly mentions 'machine learning in python/r' or 'data analysis'
      /machine learning in (python|r)\b|data analysis.+python|Python library for/i.test(description)
    );
  if (hasDataScienceLib) {
    scores['library'] += 10;
    scores['learning-resource'] = Math.min(scores['learning-resource'], 8);
    scores['dataset'] = Math.min(scores['dataset'], 8);
  }

  // --- Learning-resource for content-only repos ---
  // Repos with tutorial/interview topics but NO actual source code are learning resources
  const hasTutorialTopics = topics.some(t =>
    t.includes('tutorial') || t.includes('interview') || t.includes('algorithms') || t.includes('computer-science')
  );
  const hasSourceFiles = hasPath(files, [/\.(js|ts|py|go|rb|java|c|cpp|cs|rs)$/]);
  if (hasTutorialTopics && !hasSourceFiles) {
    scores['learning-resource'] += 12;
    scores['developer-tool'] = Math.min(scores['developer-tool'], 4);
    scores['library'] = Math.min(scores['library'], 6);
    scores['application'] = Math.min(scores['application'], 6);
  }

  // Interview-prep repos that have source files but no private package + no real app structure
  // are primarily learning resources (e.g. system-design-primer)
  if (topics.some(t => t === 'interview-practice' || t === 'interview-questions' || t === 'interview-preparation') &&
    !hasPath(files, [/^(app|server|client)\//]) &&
    hasSourceFiles) {
    scores['learning-resource'] += 8;
    scores['library'] = Math.min(scores['library'], 8);
    scores['sdk'] = Math.min(scores['sdk'], 6);
    scores['application'] = Math.min(scores['application'], 6);
  }

  // --- Active web application protection ---
  // Private repos with interactive ui + src/ + public/ are clearly web applications
  if (packageJson && packageJson.private &&
    /interactive (roadmap|guide|tool|content|platform)|visual tool/i.test(description) &&
    hasPath(files, [/^src\//])) {
    scores['application'] += 10;
    scores['library'] = Math.min(scores['library'], Math.max((scores['application'] || 0) - 2, 8));
  }
}

function chooseBestType(scores) {
  const ranked = TYPE_PRIORITY.map((type) => ({ type, score: scores[type] || 0 })).sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return TYPE_PRIORITY.indexOf(left.type) - TYPE_PRIORITY.indexOf(right.type);
  });

  const best = ranked[0] || { type: 'developer-tool', score: 0 };
  const runnerUp = ranked[1] || { score: 0 };

  if (best.score < 8) {
    return 'developer-tool';
  }

  if (best.score - runnerUp.score < 3 && best.score < 18) {
    return 'developer-tool';
  }

  return best.type;
}

function detectRepoType(input) {
  const scores = createScores();
  const dependencyMap = collectDependencySignals(scores, input.packageJson || null);

  collectPackageSignals(scores, input.packageJson || null);
  collectStructureSignals(scores, input, dependencyMap);
  collectEntrypointSignals(scores, input);
  collectTopicSignals(scores, getTopics(input.repoMetadata || {}));
  collectReadmeSignals(scores, String(input.readmeContent || '').toLowerCase());
  collectMetadataSignals(scores, input.repoMetadata || {});
  applySafetyGuards(scores, input, dependencyMap);

  return chooseBestType(scores);
}

module.exports = {
  detectRepoType,
};
