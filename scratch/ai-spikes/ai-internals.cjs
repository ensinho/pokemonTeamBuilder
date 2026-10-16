const path = require('path');
const { Battle, Teams, Dex } = require(path.join(process.cwd(), 'node_modules/@pkmn/sim'));
const T = (s) => Teams.pack(Teams.import(s));
const FORMAT = 'gen9customgame@@@Sleep Clause Mod,Terastal Clause';
const mk = () => {
  const b = new Battle({ formatid: FORMAT, seed: [5, 6, 7, 8] });
  b.setPlayer('p1', { name: 'U', team: T('Togekiss @ Assault Vest\nAbility: Serene Grace\nLevel: 50\nTera Type: Steel\nEVs: 252 HP / 252 SpD\nCalm Nature\n- Air Slash\n- Moonblast\n- Flamethrower\n- Aura Sphere') });
  b.setPlayer('p2', { name: 'C', team: T('Garchomp @ Yache Berry\nAbility: Rough Skin\nLevel: 50\nEVs: 252 Atk / 252 Spe\nJolly Nature\n- Dragon Claw\n- Earthquake\n- Stone Edge\n- Crunch') });
  b.choose('p1', 'default'); b.choose('p2', 'default'); b.sendUpdates?.();
  return b;
};
const b = mk();
// 1) Terastal Clause at battle time
const okTera = b.choose('p1', 'move 1 terastallize');
console.log('tera accepted with Terastal Clause?', okTera);
// 2) deterministic min/max damage on a clone, crit disabled
const range = (battle, atkSide, defSide, moveId) => {
  const out = [];
  for (const mode of ['min', 'max']) {
    const c = Battle.fromJSON(battle.toJSON()); c.send = () => {};
    c.randomizer = (d) => (mode === 'max' ? d : Math.floor(Math.floor(d * 85) / 100));
    const atk = c.sides[atkSide].active[0], def = c.sides[defSide].active[0];
    const move = c.dex.getActiveMove(moveId); move.willCrit = false;
    out.push(c.actions.getDamage(atk, def, move, true));
  }
  return out;
};
const b2 = mk();
console.log('Stone Edge vs real Togekiss (AV, 252 HP/SpD):', range(b2, 1, 0, 'stoneedge'), 'hp', b2.sides[0].active[0].maxhp);
// 3) fog: replace hidden item/EVs with beliefs on the clone
const fogged = (battle) => {
  const c = Battle.fromJSON(battle.toJSON()); c.send = () => {};
  const foe = c.sides[0].active[0];
  foe.item = ''; // item not revealed yet
  const species = foe.species; const lvl = foe.level;
  const stat = (base, isHp) => isHp ? Math.floor(((2 * base + 31 + 21) * lvl) / 100) + lvl + 10 : Math.floor(((2 * base + 31 + 21) * lvl) / 100) + 5; // 84 EVs belief
  const bs = species.baseStats;
  foe.storedStats = { atk: stat(bs.atk), def: stat(bs.def), spa: stat(bs.spa), spd: stat(bs.spd), spe: stat(bs.spe) };
  return c;
};
const f = fogged(b2);
const fr = []; for (const mode of ['min','max']) { const c = Battle.fromJSON(f.toJSON()); c.send=()=>{}; c.sides[0].active[0].item=''; c.randomizer = (d) => (mode === 'max' ? d : Math.floor(Math.floor(d * 85) / 100)); const m = c.dex.getActiveMove('stoneedge'); m.willCrit=false; fr.push(c.actions.getDamage(c.sides[1].active[0], c.sides[0].active[0], m, true)); }
console.log('Stone Edge vs believed Togekiss (no item known, 84 EVs):', fr);
// 4) speed + priority helpers exist
const g = b2.sides[1].active[0], t = b2.sides[0].active[0];
console.log('getActionSpeed', typeof g.getActionSpeed === 'function' ? [g.getActionSpeed(), t.getActionSpeed()] : 'n/a', '| extremespeed priority', Dex.moves.get('extremespeed').priority);
// 5) the p2 request the AI reads
console.log('p2 request keys', Object.keys(b2.sides[1].activeRequest || {}), 'moves[0]', JSON.stringify(b2.sides[1].activeRequest.active[0].moves[0]));
