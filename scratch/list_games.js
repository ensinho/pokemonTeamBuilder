import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('public/data/gym-leaders.json', 'utf8'));
console.log(data.games.map(g => ({ key: g.key, label: g.label, kind: g.kind })));
