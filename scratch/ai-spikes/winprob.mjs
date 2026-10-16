// Spike: can a logistic regression over simple turn features predict the winner?
import { createRequire } from 'node:module';
const require = createRequire(process.cwd() + '/package.json');
const { Battle, Teams, PRNG } = require('@pkmn/sim');
const { TeamGenerators } = require('@pkmn/randoms');
Teams.setGeneratorFactory(TeamGenerators);

const N_BATTLES = Number(process.argv[2] || 400);
const rng = new PRNG([9, 8, 7, 6]);
const lvl50 = (team) => team.map((s) => ({ ...s, level: 50 }));

let failures = 0;
const hpFrac = (p) => (p.fainted ? 0 : p.hp / p.maxhp);
const bestDmgFrac = (battle, atk, def) => {
  if (!atk || !def || atk.fainted || def.fainted) return 0;
  let best = 0;
  for (const slot of atk.moveSlots) {
    const move = battle.dex.getActiveMove(slot.id);
    if (move.category === 'Status') continue;
    move.willCrit = false;
    let d; try { d = battle.actions.getDamage(atk, def, move, true); } catch { failures++; d = 0; }
    if (typeof d === 'number') best = Math.max(best, Math.min(1, d / def.hp));
  }
  return best;
};
const features = (b) => {
  const [s1, s2] = b.sides; // perspective: p2 (Cynthia)
  const a1 = s1.active[0], a2 = s2.active[0];
  const alive = (s) => s.pokemon.filter((p) => !p.fainted).length;
  const hpSum = (s) => s.pokemon.reduce((t, p) => t + hpFrac(p), 0);
  const boosts = (p) => (p ? Object.values(p.boosts).reduce((t, v) => t + v, 0) : 0);
  const status = (s) => s.pokemon.filter((p) => !p.fainted && p.status).length;
  const faster = a1 && a2 ? Math.sign(a2.getActionSpeed() - a1.getActionSpeed()) : 0;
  return [
    alive(s2) - alive(s1),
    hpSum(s2) - hpSum(s1),
    bestDmgFrac(b, a2, a1) - bestDmgFrac(b, a1, a2),
    faster,
    (boosts(a2) - boosts(a1)) / 6,
    status(s1) - status(s2),
  ];
};
const choose = (b, sideIdx) => {
  const side = b.sides[sideIdx]; const req = side.activeRequest;
  if (!req || req.wait) return null;
  if (req.forceSwitch) {
    const opts = req.side.pokemon.map((p, i) => [p, i]).filter(([p, i]) => i > 0 && !p.condition.endsWith(' fnt'));
    return 'switch ' + (opts[rng.random(opts.length)][1] + 1);
  }
  if (req.teamPreview) return 'default';
  const moves = req.active[0].moves.map((m, i) => [m, i]).filter(([m]) => !m.disabled && (m.pp === undefined || m.pp > 0));
  if (!moves.length) return 'default';
  if (rng.random(100) < 25) return 'move ' + (moves[rng.random(moves.length)][1] + 1); // some randomness
  const me = side.active[0], foe = b.sides[1 - sideIdx].active[0];
  let best = moves[0], bestD = -1;
  for (const [m, i] of moves) {
    const mv = b.dex.getActiveMove(m.id); mv.willCrit = false;
    let d; try { d = mv.category === 'Status' ? 5 : b.actions.getDamage(me, foe, mv, true); } catch { failures++; d = 0; }
    const v = typeof d === 'number' ? d : 0;
    if (v > bestD) { bestD = v; best = [m, i]; }
  }
  return 'move ' + (best[1] + 1);
};

const data = []; // {battle, x, y}
const t0 = Date.now();
for (let n = 0; n < N_BATTLES; n++) {
  const seedA = [rng.random(65536), rng.random(65536), rng.random(65536), rng.random(65536)];
  const seedB = [rng.random(65536), rng.random(65536), rng.random(65536), rng.random(65536)];
  const t1 = Teams.pack(lvl50(Teams.generate('gen9randombattle', { seed: seedA })));
  const t2 = Teams.pack(lvl50(Teams.generate('gen9randombattle', { seed: seedB })));
  const b = new Battle({ formatid: 'gen9customgame@@@Sleep Clause Mod,Terastal Clause', seed: seedA });
  b.setPlayer('p1', { name: 'A', team: t1 }); b.setPlayer('p2', { name: 'B', team: t2 });
  b.choose('p1', 'default'); b.choose('p2', 'default');
  const rows = [];
  let guard = 0;
  while (!b.ended && guard++ < 400) {
    const r1 = b.sides[0].activeRequest, r2 = b.sides[1].activeRequest;
    if (r1?.active && r2?.active && !r1.forceSwitch && !r2.forceSwitch) rows.push(features(b));
    for (const i of [0, 1]) { const c = choose(b, i); if (c) b.choose(i ? 'p2' : 'p1', c); }
  }
  if (!b.ended || !b.winner) continue;
  const y = b.winner === 'B' ? 1 : 0;
  for (const x of rows) data.push({ battle: n, x, y });
}
console.log(`getDamage throws: ${failures}`);
console.log(`battles ${N_BATTLES}, turn rows ${data.length}, sim time ${((Date.now() - t0) / 1000).toFixed(1)}s`);

// split by battle (no leakage), standardize, logistic regression with L2 via gradient descent
const train = data.filter((d) => d.battle % 10 < 7), test = data.filter((d) => d.battle % 10 >= 7);
const k = train[0].x.length;
const mean = Array(k).fill(0), sd = Array(k).fill(0);
for (const d of train) d.x.forEach((v, j) => (mean[j] += v / train.length));
for (const d of train) d.x.forEach((v, j) => (sd[j] += (v - mean[j]) ** 2 / train.length));
sd.forEach((v, j) => (sd[j] = Math.sqrt(v) || 1));
const z = (x) => x.map((v, j) => (v - mean[j]) / sd[j]);
const sig = (t) => 1 / (1 + Math.exp(-t));
let w = Array(k).fill(0), b0 = 0; const lr = 0.1, l2 = 1e-3;
for (let epoch = 0; epoch < 400; epoch++) {
  const gw = Array(k).fill(0); let gb = 0;
  for (const d of train) { const xz = z(d.x); const p = sig(b0 + xz.reduce((t, v, j) => t + v * w[j], 0)); const e = p - d.y; xz.forEach((v, j) => (gw[j] += e * v)); gb += e; }
  w = w.map((wj, j) => wj - lr * (gw[j] / train.length + l2 * wj)); b0 -= lr * (gb / train.length);
}
const evalSet = (set, pred) => {
  let ll = 0, brier = 0, acc = 0;
  for (const d of set) { const p = Math.min(1 - 1e-9, Math.max(1e-9, pred(d))); ll += -(d.y * Math.log(p) + (1 - d.y) * Math.log(1 - p)); brier += (p - d.y) ** 2; acc += (p >= 0.5) === (d.y === 1) ? 1 : 0; }
  return { logLoss: (ll / set.length).toFixed(3), brier: (brier / set.length).toFixed(3), accuracy: (100 * acc / set.length).toFixed(1) + '%' };
};
const model = (d) => sig(b0 + z(d.x).reduce((t, v, j) => t + v * w[j], 0));
const naive = (d) => (d.x[0] > 0 ? 0.75 : d.x[0] < 0 ? 0.25 : 0.5); // "who has more Pokémon left"
console.log('baseline 0.5     ', evalSet(test, () => 0.5));
console.log('more mons left   ', evalSet(test, naive));
console.log('logistic model   ', evalSet(test, model));
const names = ['aliveDiff', 'hpSumDiff', 'matchupDiff', 'faster', 'boostDiff', 'statusDiff'];
console.log('weights (standardized):', Object.fromEntries(names.map((n, j) => [n, +w[j].toFixed(2)])), 'bias', +b0.toFixed(2));
// early-game slice: first 3 turn rows of each battle
const early = test.filter((d, i, arr) => arr.findIndex((e) => e.battle === d.battle) + 3 > i);
console.log('early turns only ', evalSet(early, model), 'n', early.length);
// cost of one prediction (features + dot product)
