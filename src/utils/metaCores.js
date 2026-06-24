// Meta "cores" — the recurring archetypes VGC teams are built around (weather,
// Trick Room, terrains, Tailwind). Each core is defined by ABILITY / MOVE
// signatures; we then scan the Smogon set data (public/data/smogon.json) to find
// which species set the strategy up vs. which abuse it, and rank them by real
// tournament usage. This powers the Meta Cores guide — "pick a core, learn how
// to build it" — entirely from data we already bake.

const titleCase = (slug = '') => slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Core archetype definitions. Signatures are PokéAPI slugs (matching how
 * abilities/moves are stored in smogon.json):
 *  - setterAbilities / setterMoves  → species that ENABLE the strategy
 *  - abuserAbilities / abuserMoves  → species that PAY OFF under it
 *  - keyMoves                       → strong enablers counted as payoff (e.g. Aurora Veil)
 *  - abuserBySlowIv                 → Trick Room: any set running 0 Speed IVs
 */
export const CORES = [
    {
        id: 'rain', name: 'Rain', emoji: '🌧️', accent: '#3b82f6',
        summary: { en: 'Drizzle sets rain; Swift Swim sweepers and boosted Water moves clean up.', pt: 'Drizzle traz a chuva; varredores com Swift Swim e golpes de Água potencializados fecham o jogo.' },
        setterAbilities: ['drizzle'], setterMoves: ['rain-dance'],
        abuserAbilities: ['swift-swim'], abuserMoves: ['electro-shot', 'wave-crash', 'hydro-pump', 'surf', 'weather-ball', 'water-spout', 'muddy-water'],
        guide: {
            en: ['Lead a Drizzle setter (Pelipper, Politoed) to turn on rain for 5 turns.', 'Pair Swift Swim sweepers that double Speed and fire off rain-boosted Water moves.', 'Add a Tailwind or redirection partner to buy turns if your weather is overwritten.', 'Carry a Water-immune or Grass answer for opposing rain mirrors.'],
            pt: ['Comece com um setter de Drizzle (Pelipper, Politoed) para ativar a chuva por 5 turnos.', 'Combine varredores Swift Swim que dobram a Velocidade e disparam golpes de Água potencializados.', 'Adicione um parceiro de Tailwind ou redirecionamento para ganhar turnos se o clima for sobrescrito.', 'Tenha uma resposta imune a Água ou tipo Planta para espelhos de chuva.'],
        },
    },
    {
        id: 'sun', name: 'Sun', emoji: '☀️', accent: '#f59e0b',
        summary: { en: 'Drought powers Fire attacks; Chlorophyll & Protosynthesis sweepers snowball.', pt: 'Drought potencializa ataques de Fogo; varredores Chlorophyll e Protosynthesis dominam.' },
        setterAbilities: ['drought', 'orichalcum-pulse'], setterMoves: ['sunny-day'],
        abuserAbilities: ['chlorophyll', 'solar-power', 'protosynthesis'], abuserMoves: ['weather-ball', 'heat-wave', 'flamethrower', 'overheat', 'fire-blast', 'solar-beam'],
        guide: {
            en: ['Open with a Drought setter (Torkoal, Groudon, Koraidon) to bank sun.', 'Bring Chlorophyll sweepers for doubled Speed or Protosynthesis Paradox attackers.', 'Sun also weakens enemy Water moves — lean into Fire/Grass offense.', 'Pack a Wide Guard / redirection support to protect your frail abusers.'],
            pt: ['Abra com um setter de Drought (Torkoal, Groudon, Koraidon) para garantir o sol.', 'Traga varredores Chlorophyll com Velocidade dobrada ou atacantes Paradox com Protosynthesis.', 'O sol também enfraquece golpes de Água inimigos — aposte na ofensiva Fogo/Planta.', 'Inclua suporte de Wide Guard / redirecionamento para proteger seus atacantes frágeis.'],
        },
    },
    {
        id: 'sand', name: 'Sand', emoji: '🏜️', accent: '#d97706',
        summary: { en: 'Sand Stream chips the field and powers Sand Rush / Sand Force attackers.', pt: 'Sand Stream desgasta o campo e potencializa atacantes Sand Rush / Sand Force.' },
        setterAbilities: ['sand-stream'], setterMoves: ['sandstorm'],
        abuserAbilities: ['sand-rush', 'sand-force', 'sand-veil'],
        guide: {
            en: ['Set sand with Tyranitar or another Sand Stream lead.', 'Sand boosts Rock-types\' Sp. Def and enables Sand Rush Speed doubling.', 'Use the chip damage to break Focus Sashes and weaken foes over time.', 'Keep a setter backup since weather wars are common.'],
            pt: ['Ative a areia com Tyranitar ou outro líder Sand Stream.', 'A areia aumenta a Def. Esp. de tipos Pedra e dobra a Velocidade com Sand Rush.', 'Use o dano contínuo para quebrar Focus Sash e enfraquecer oponentes ao longo do tempo.', 'Mantenha um setter reserva, já que guerras de clima são comuns.'],
        },
    },
    {
        id: 'snow', name: 'Snow', emoji: '❄️', accent: '#7dd3fc',
        summary: { en: 'Snow Warning + Aurora Veil walls hits; Slush Rush sweepers race ahead.', pt: 'Snow Warning + Aurora Veil bloqueiam dano; varredores Slush Rush disparam à frente.' },
        setterAbilities: ['snow-warning'], setterMoves: ['snowscape', 'chilly-reception'],
        abuserAbilities: ['slush-rush', 'ice-body'], abuserMoves: ['blizzard', 'icicle-crash', 'ice-spinner'], keyMoves: ['aurora-veil'],
        guide: {
            en: ['Set snow (Ninetales-Alola, Baxcalibur) to raise Ice-types\' Defense.', 'Click Aurora Veil turn one to halve incoming damage for both slots.', 'Snowball with Slush Rush sweepers under the veil.', 'Snow only lasts 5 turns — apply pressure fast.'],
            pt: ['Ative a neve (Ninetales-Alola, Baxcalibur) para elevar a Defesa de tipos Gelo.', 'Use Aurora Veil no primeiro turno para reduzir pela metade o dano em ambos os slots.', 'Domine com varredores Slush Rush sob o véu.', 'A neve dura só 5 turnos — pressione rápido.'],
        },
    },
    {
        id: 'trickroom', name: 'Trick Room', emoji: '🔄', accent: '#a855f7',
        summary: { en: 'Reverse the speed order for 5 turns so slow, powerful attackers move first.', pt: 'Inverte a ordem de velocidade por 5 turnos para que atacantes lentos e fortes ajam primeiro.' },
        setterMoves: ['trick-room'], abuserBySlowIv: true,
        guide: {
            en: ['Run a bulky Trick Room setter (Cresselia, Hatterene, Farigiraf, Indeedee).', 'Fill the team with slow, hard-hitting attackers (min Speed IVs, Brave/Quiet/Relaxed natures).', 'Protect the setter — losing it strands your slow mons.', 'Carry a way to re-set Trick Room or a fallback plan for the 5-turn gaps.'],
            pt: ['Use um setter resistente de Trick Room (Cresselia, Hatterene, Farigiraf, Indeedee).', 'Preencha o time com atacantes lentos e fortes (IVs de Velocidade mínimos, naturezas Brave/Quiet/Relaxed).', 'Proteja o setter — perdê-lo deixa seus mons lentos vulneráveis.', 'Tenha como re-ativar o Trick Room ou um plano para os intervalos de 5 turnos.'],
        },
    },
    {
        id: 'tailwind', name: 'Tailwind', emoji: '🪶', accent: '#22d3ee',
        summary: { en: 'Double your team\'s Speed for 4 turns — the most flexible offensive engine.', pt: 'Dobra a Velocidade do time por 4 turnos — o motor ofensivo mais flexível.' },
        setterMoves: ['tailwind'],
        guide: {
            en: ['Bring a fast, durable Tailwind setter (Tornadus, Whimsicott, Talonflame).', 'Back it with hard-hitting attackers that outspeed everything under Tailwind.', 'Have a second setter or Tailwind redundancy for the 4-turn windows.', 'Pair with redirection or screens to keep the tempo.'],
            pt: ['Traga um setter de Tailwind rápido e durável (Tornadus, Whimsicott, Talonflame).', 'Apoie-o com atacantes fortes que superam tudo sob Tailwind.', 'Tenha um segundo setter ou redundância de Tailwind para as janelas de 4 turnos.', 'Combine com redirecionamento ou telas para manter o ritmo.'],
        },
    },
    {
        id: 'psyterrain', name: 'Psychic Terrain', emoji: '🔮', accent: '#ec4899',
        summary: { en: 'Blocks priority and boosts Psychic moves — a fortress for slower setups.', pt: 'Bloqueia prioridade e potencializa golpes Psíquicos — uma fortaleza para setups lentos.' },
        setterAbilities: ['psychic-surge'], setterMoves: ['psychic-terrain'],
        abuserMoves: ['expanding-force', 'psychic', 'psyshock', 'psystrike'],
        guide: {
            en: ['Lead Indeedee or another Psychic Surge setter to shut off priority moves.', 'This protects slow setup and Trick Room sweepers from Fake Out / priority.', 'Boosted Psychic-type attacks hit hard into the meta.', 'Watch for Terrain overwrites and Grassy/Electric setters.'],
            pt: ['Comece com Indeedee ou outro setter de Psychic Surge para anular golpes de prioridade.', 'Isso protege setups lentos e varredores de Trick Room contra Fake Out / prioridade.', 'Ataques Psíquicos potencializados causam muito dano no meta.', 'Cuidado com sobrescrita de terreno e setters Grassy/Electric.'],
        },
    },
    {
        id: 'eleterrain', name: 'Electric Terrain', emoji: '⚡', accent: '#eab308',
        summary: { en: 'Powers Electric moves and blocks sleep; Quark Drive Paradoxes thrive.', pt: 'Potencializa golpes Elétricos e bloqueia sono; Paradoxos com Quark Drive prosperam.' },
        setterAbilities: ['electric-surge', 'hadron-engine'], setterMoves: ['electric-terrain'],
        abuserAbilities: ['quark-drive'], abuserMoves: ['rising-voltage', 'thunderbolt', 'thunder', 'thunderclap'],
        guide: {
            en: ['Set the terrain (Pawmot, Miraidon, Tapu Koko-style leads).', 'Quark Drive Paradox attackers get a free offensive or Speed boost.', 'Grounded teammates can\'t be put to sleep — great vs. Spore/Yawn.', 'Boosted Electric STAB pressures Water and Flying cores.'],
            pt: ['Ative o terreno (Pawmot, Miraidon e líderes do estilo Tapu Koko).', 'Atacantes Paradox com Quark Drive ganham bônus ofensivo ou de Velocidade grátis.', 'Companheiros no chão não podem dormir — ótimo contra Spore/Yawn.', 'O STAB Elétrico potencializado pressiona cores de Água e Voador.'],
        },
    },
    {
        id: 'grassyterrain', name: 'Grassy Terrain', emoji: '🌿', accent: '#22c55e',
        summary: { en: 'Grassy Surge heals and boosts Grass moves; activates Grassy Glide.', pt: 'Grassy Surge cura e potencializa golpes Planta; ativa Grassy Glide.' },
        setterAbilities: ['grassy-surge'], setterMoves: ['grassy-terrain'],
        abuserAbilities: ['grass-pelt'], abuserMoves: ['grassy-glide', 'wood-hammer', 'leaf-storm', 'power-whip'],
        guide: {
            en: [
                'Lead a Grassy Surge setter (Rillaboom) to automatically set Grassy Terrain.',
                'Pair with partners that run Grassy Glide for priority Grass-type attacks.',
                'Grounded Pokémon will recover a small amount of HP each turn under terrain.',
                'Be careful with opposing Flying, Poison, or Steel types that resist Grass.'
            ],
            pt: [
                'Comece com um setter de Grassy Surge (Rillaboom) para ativar o Grassy Terrain.',
                'Combine com parceiros com Grassy Glide para obter golpes Planta com prioridade.',
                'Pokémon no chão recuperam um pouco de PS a cada turno sob o terreno.',
                'Cuidado com tipos Voadores, Venenosos ou Metálicos oponentes que resistem a Planta.'
            ]
        },
    },
];

const slugify = (name = '') => String(name).toLowerCase().trim()
    .replace(/[.'’:]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

// Aggregate the signals we trust for a species.
//  - ABILITIES are definitive (Drizzle, Sand Stream, Swift Swim…), so we take
//    them from BOTH Smogon sets and the abilities mined off real tournament
//    teams — this catches meta staples (e.g. Tyranitar) Smogon has no VGC set for.
//  - MOVES come ONLY from Smogon's curated sets, where the move is a real part
//    of a named build. The mined usage moves are a noisy top-8 union (a mon with
//    one niche Rain Dance would wrongly read as a rain setter), so we don't trust
//    them for archetype detection.
function aggregateSignals(smogonEntry, usageEntry) {
    const abilities = new Set();
    const moves = new Set();
    let slowIv = false;
    for (const set of smogonEntry?.sets || []) {
        if (set.ability) abilities.add(set.ability);
        for (const slot of set.moves || []) for (const m of slot) moves.add(m);
        if (set.ivs?.speed === 0) slowIv = true;
    }
    for (const a of usageEntry?.abilities || []) abilities.add(slugify(a.name));
    return { abilities, moves, slowIv };
}

function classify(sig, core) {
    const findAb = (list) => list?.find((a) => sig.abilities.has(a));
    const findMv = (list) => list?.find((m) => sig.moves.has(m));

    let setterTag = null;
    const sa = findAb(core.setterAbilities);
    if (sa) setterTag = titleCase(sa);
    else { const sm = findMv(core.setterMoves); if (sm) setterTag = titleCase(sm); }

    let abuserTag = null;
    const aa = findAb(core.abuserAbilities);
    if (aa) abuserTag = titleCase(aa);
    else if (core.abuserMoves && findMv(core.abuserMoves)) abuserTag = titleCase(findMv(core.abuserMoves));
    else if (core.abuserBySlowIv && sig.slowIv) abuserTag = 'Slow attacker';
    else { const km = findMv(core.keyMoves); if (km) abuserTag = titleCase(km); }

    return { setterTag, abuserTag };
}

/**
 * Populate every core from the Smogon sets + tournament-mined usage.
 * @param {object} data
 * @param {Record<string, {name:string, sets:Array}>} data.smogonById - smogon.json byId
 * @param {Record<string, {abilities:Array, moves:Array}>} data.usageById - competitive-usage.json byId
 * @param {Array<{id:number, name:string, count:number}>} data.popular - tournament popularity
 * @returns cores with `setters` and `abusers` member lists (ranked by usage)
 */
export function buildCores({ smogonById = {}, usageById = {}, popular = [] } = {}) {
    const popularMap = new Map(popular.map((p) => [p.id, p.count]));
    const nameMap = new Map(popular.map((p) => [p.id, p.name]));
    for (const [id, e] of Object.entries(smogonById)) if (e?.name) nameMap.set(Number(id), e.name);

    const ids = new Set([...Object.keys(smogonById), ...Object.keys(usageById)].map(Number));
    const bySort = (a, b) => b.usage - a.usage || a.name.localeCompare(b.name);

    return CORES.map((core) => {
        const setters = [];
        const abusers = [];
        for (const id of ids) {
            const name = nameMap.get(id);
            if (!name) continue; // can't render a member we can't name/sprite
            const sig = aggregateSignals(smogonById[id], usageById[id]);
            const { setterTag, abuserTag } = classify(sig, core);
            if (!setterTag && !abuserTag) continue;
            const base = { id, name, usage: popularMap.get(id) || 0, hasSets: Boolean(smogonById[id]?.sets?.length) };
            if (setterTag) setters.push({ ...base, tag: setterTag });
            else abusers.push({ ...base, tag: abuserTag });
        }
        return {
            ...core,
            setters: setters.sort(bySort).slice(0, 14),
            abusers: abusers.sort(bySort).slice(0, 28),
            memberCount: setters.length + abusers.length,
        };
    }).filter((c) => c.setters.length > 0 || c.abusers.length > 0);
}

/**
 * Which cores does the CURRENT team commit to? A team "fits" a core when it runs
 * a SETTER for it (a weather/terrain ability, Trick Room, Tailwind…) — the strong
 * signal that the team is actually built around that strategy. Returns a compact
 * descriptor per matched core for the builder's "fits a core" chips.
 * @returns {Array<{id:string, name:string, accent:string, by:string}>}
 */
export function detectTeamCores(teamIds = [], { smogonById = {}, usageById = {} } = {}) {
    const ids = [...new Set(teamIds)].filter((x) => x != null);
    const out = [];
    for (const core of CORES) {
        let by = null;
        for (const id of ids) {
            const sig = aggregateSignals(smogonById[id], usageById[id]);
            const { setterTag } = classify(sig, core);
            if (setterTag) { by = setterTag; break; }
        }
        if (by) out.push({ id: core.id, name: core.name, accent: core.accent, by });
    }
    return out;
}
