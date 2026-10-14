const path = require('path');
const { Battle, Teams, PRNG, extractChannelMessages } = require(path.join(process.cwd(), 'node_modules/@pkmn/sim'));
const T = (s) => Teams.pack(Teams.import(s));
const P1 = T(`Garchomp @ Choice Scarf\nAbility: Rough Skin\nLevel: 50\nEVs: 252 Atk / 4 SpD / 252 Spe\nJolly Nature\n- Earthquake\n- Outrage\n- Stone Edge\n- Fire Fang\n\nRotom-Wash @ Leftovers\nAbility: Levitate\nLevel: 50\n- Hydro Pump\n- Volt Switch\n- Will-O-Wisp\n- Protect\n\nKingambit @ Black Glasses\nAbility: Supreme Overlord\nLevel: 50\n- Sucker Punch\n- Iron Head\n- Swords Dance\n- Kowtow Cleave`);
const P2 = T(`Spiritomb @ Lum Berry\nAbility: Pressure\nLevel: 50\n- Dark Pulse\n- Will-O-Wisp\n- Shadow Ball\n- Nasty Plot\n\nTogekiss @ Sitrus Berry\nAbility: Serene Grace\nLevel: 50\n- Air Slash\n- Moonblast\n- Roost\n- Thunder Wave\n\nGarchomp @ Yache Berry\nAbility: Rough Skin\nLevel: 50\n- Dragon Claw\n- Earthquake\n- Swords Dance\n- Crunch`);
const p1Log = [];
const b = new Battle({ formatid: 'gen9customgame@@@Sleep Clause Mod,Species Clause,OHKO Clause,Evasion Moves Clause,Terastal Clause', seed: [1, 2, 3, 4] });
b.send = (type, data) => {
  if (type === 'update') { const lines = Array.isArray(data) ? data.join('\n') : data; p1Log.push(extractChannelMessages(lines, [0])[0].join('\n')); }
  else if (type === 'sideupdate') { const [side, ...rest] = String(data).split('\n'); if (side === 'p1') p1Log.push(rest.join('\n')); }
};
b.setPlayer('p1', { name: 'U', team: P1 }); b.setPlayer('p2', { name: 'Cynthia', team: P2 });
b.choose('p1', 'default'); b.choose('p2', 'default'); b.sendUpdates();
b.choose('p1', 'move 1'); b.choose('p2', 'move 4'); b.sendUpdates();
const log = p1Log.join('\n');
console.log('p1 log has request:', /\|request\|/.test(log), '| hides p2 item (Lum Berry):', !log.includes('Lum Berry'), '| shows own item:', log.includes('Choice Scarf'));
// clone cost
let t = performance.now(); let json; for (let i = 0; i < 50; i++) json = b.toJSON(); const toJ = (performance.now() - t) / 50;
t = performance.now(); let c; for (let i = 0; i < 50; i++) c = Battle.fromJSON(json); const fromJ = (performance.now() - t) / 50;
console.log('toJSON ms', toJ.toFixed(2), 'fromJSON ms', fromJ.toFixed(2));
// one-turn simulation on a clone with a fresh deterministic PRNG and "fogged" foe item
t = performance.now(); const N = 60; let fainted = 0;
for (let i = 0; i < N; i++) {
  const s = Battle.fromJSON(json); s.send = () => {}; s.prng = new PRNG([i, 7, 7, 7]);
  const foe = s.sides[0].active[0]; foe.item = ''; // fog: unrevealed item unknown to Cynthia
  s.choose('p1', 'move ' + (1 + (i % 4))); s.choose('p2', 'move ' + (1 + (i % 3)));
  if (s.sides[1].active[0]?.fainted || s.sides[1].active[0]?.hp === 0) fainted++;
}
console.log('clone+simulate 1 turn ms', ((performance.now() - t) / N).toFixed(2), '| live battle prng untouched:', JSON.stringify(b.prng.getSeed ? b.prng.getSeed() : b.prng.seed));
