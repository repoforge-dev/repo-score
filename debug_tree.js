'use strict';

const githubClient = require('./src/github/githubClient');

githubClient.getTree('expressjs', 'express').then((tree) => {
    const ci = tree.filter(e =>
        e.path.startsWith('.github') ||
        e.path.startsWith('.circleci') ||
        e.path === '.travis.yml' ||
        e.path === 'azure-pipelines.yml' ||
        e.path === '.gitlab-ci.yml'
    );
    console.log('CI-related paths found in expressjs/express:');
    if (ci.length === 0) {
        console.log('  (none matching our CI patterns)');
    } else {
        ci.forEach(e => console.log(' ', e.path));
    }

    console.log('\nAll .github/* entries:');
    tree.filter(e => e.path.startsWith('.github')).forEach(e => console.log(' ', e.path));
});
