'use strict';

const http = require('http');

function post(body) {
    return new Promise((resolve) => {
        const data = JSON.stringify(body);
        const req = http.request(
            {
                hostname: 'localhost', port: 3000, path: '/api/analyze', method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
            },
            (res) => { let raw = ''; res.on('data', c => raw += c); res.on('end', () => resolve(JSON.parse(raw))); }
        );
        req.write(data);
        req.end();
    });
}

post({ repoUrl: 'https://github.com/expressjs/express' }).then((b) => {
    console.log('repo   :', b.repo);
    console.log('score  :', b.score, '(' + b.label + ')');
    console.log('breakdown:');
    console.log('  metadata  ', b.breakdown.metadata.score + '/' + b.breakdown.metadata.max);
    console.log('  readme    ', b.breakdown.readme.score + '/' + b.breakdown.readme.max);
    console.log('  structure ', b.breakdown.structure.score + '/' + b.breakdown.structure.max, ' ciBonus=' + b.breakdown.structure.ciBonus);
});
