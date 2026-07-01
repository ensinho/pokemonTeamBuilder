import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('public/data/gym-leaders.json', 'utf8'));
for (const g of data.games) {
  const e4 = g.leaders.filter(l => l.gym === 'Elite Four' || l.gym === 'Champion');
  console.log(`${g.key} (${g.kind}): ${g.leaders.length} total, ${e4.length} E4/Champion. E4 names: ${e4.map(l => l.name).join(', ')}`);
}
