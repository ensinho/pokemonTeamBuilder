// Held-item recommender.
//
// PRIMARY source: real per-species usage mined from the pokepastes of tournament
// teams (public/data/competitive-usage.json) — i.e. the items players actually
// run on this exact Pokémon, with measured frequency. When no tournament data
// exists for a species, we fall back to a stat/archetype heuristic so every
// member still gets sensible ideas.

const ITEM_SPRITE_BASE = 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/items';
export const itemSpriteUrl = (slug) => `${ITEM_SPRITE_BASE}/${slug}.png`;

const r = (en, pt, lang) => (lang === 'pt' ? pt : en);

// ── Competitive role blurbs ─────────────────────────────────────────────────
// Short "why this item" phrases keyed by slug, combined with real usage %.
const ITEM_ROLES = {
    'life-orb': ['+30% damage on every move', '+30% de dano em todo golpe'],
    'choice-band': ['locks one move for +50% Atk', 'trava um golpe com +50% Atq'],
    'choice-specs': ['locks one move for +50% SpA', 'trava um golpe com +50% Atq.Esp'],
    'choice-scarf': ['+50% Speed to revenge-kill', '+50% Velocidade para vingar'],
    'focus-sash': ['survives one KO at full HP', 'sobrevive a um KO com HP cheio'],
    'leftovers': ['passive HP recovery each turn', 'recupera HP a cada turno'],
    'assault-vest': ['+50% Sp.Def, attacks only', '+50% Def.Esp, só ataques'],
    'rocky-helmet': ['chips contact attackers', 'fere atacantes de contato'],
    'sitrus-berry': ['restores 25% HP once', 'restaura 25% de HP uma vez'],
    'expert-belt': ['+20% on super-effective hits', '+20% em golpes super eficazes'],
    'weakness-policy': ['+2 Atk/SpA when hit super-effectively', '+2 Atq/Atq.Esp ao levar golpe eficaz'],
    'booster-energy': ['boosts Paradox best stat', 'aumenta o melhor stat Paradox'],
    'clear-amulet': ['blocks Intimidate & stat drops', 'bloqueia Intimidate e quedas de stat'],
    'covert-cloak': ['blocks added move effects', 'bloqueia efeitos secundários'],
    'safety-goggles': ['blocks powder & weather chip', 'bloqueia pó e dano de clima'],
    'loaded-dice': ['multi-hits always hit 4–5×', 'multi-golpes acertam 4–5×'],
    'mental-herb': ['breaks Taunt/Encore once', 'quebra Taunt/Encore uma vez'],
    'lum-berry': ['cures any status once', 'cura qualquer status uma vez'],
    'throat-spray': ['+1 SpA after a sound move', '+1 Atq.Esp após golpe sonoro'],
    'wide-lens': ['+10% accuracy', '+10% de precisão'],
    'eviolite': ['+50% defenses (not fully evolved)', '+50% defesas (não evoluído)'],
    'mystic-water': ['+20% Water moves', '+20% golpes de Água'],
    'charcoal': ['+20% Fire moves', '+20% golpes de Fogo'],
    'fairy-feather': ['+20% Fairy moves', '+20% golpes de Fada'],
    'magnet': ['+20% Electric moves', '+20% golpes Elétricos'],
    'miracle-seed': ['+20% Grass moves', '+20% golpes de Planta'],
    'terrain-extender': ['terrain lasts 8 turns', 'terreno dura 8 turnos'],
    'power-herb': ['skips a charge turn once', 'pula um turno de carga uma vez'],
    'mirror-herb': ['copies foe stat boosts', 'copia bônus de stat do oponente'],
    'adrenaline-orb': ['+1 Speed vs Intimidate', '+1 Velocidade contra Intimidate'],
};

// Type-resist berries: halve one super-effective hit of the named type.
const RESIST_BERRY = {
    'occa-berry': 'Fire', 'passho-berry': 'Water', 'wacan-berry': 'Electric',
    'rindo-berry': 'Grass', 'yache-berry': 'Ice', 'chople-berry': 'Fighting',
    'kebia-berry': 'Poison', 'shuca-berry': 'Ground', 'coba-berry': 'Flying',
    'payapa-berry': 'Psychic', 'tanga-berry': 'Bug', 'charti-berry': 'Rock',
    'kasib-berry': 'Ghost', 'haban-berry': 'Dragon', 'colbur-berry': 'Dark',
    'babiri-berry': 'Steel', 'roseli-berry': 'Fairy', 'chilan-berry': 'Normal',
};

const titleCase = (name = '') => name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// Resolve a one-line competitive role for any item slug.
const itemRole = (slug, language) => {
    if (ITEM_ROLES[slug]) return r(ITEM_ROLES[slug][0], ITEM_ROLES[slug][1], language);
    if (RESIST_BERRY[slug]) {
        const type = RESIST_BERRY[slug];
        return r(`resists one ${type} hit`, `resiste a um golpe de ${type}`, language);
    }
    if (slug.endsWith('ite') || /-(x|y)$/.test(slug)) {
        return r('Mega Stone — Mega Evolves', 'Mega Stone — Mega Evolui');
    }
    return null;
};

// ── Real tournament-usage picks ──────────────────────────────────────────────
function usagePicks(usageEntry, displayName, language) {
    const { n, items } = usageEntry;
    return items.slice(0, 3).map((it) => {
        const pct = Math.round((it.count / n) * 100);
        const role = itemRole(it.slug, language);
        const head = r(`${pct}% of tournament ${displayName}`, `${pct}% dos ${displayName} de torneio`, language);
        return {
            slug: it.slug,
            label: titleCase(it.name),
            reason: role ? `${head} · ${role}` : head,
        };
    });
}

// ── Smogon recommended picks (expert sets, robust full-meta coverage) ────────
// Used when there's no measured tournament usage for this species but Smogon
// curates sets for it — items come from the recommended sets (primary + listed
// alternatives), labelled with the set they belong to.
function smogonPicks(smogonEntry, language) {
    const picks = [];
    const seen = new Set();
    for (const set of smogonEntry.sets || []) {
        for (const slug of [set.item, ...(set.itemAlts || [])].filter(Boolean)) {
            if (seen.has(slug)) continue;
            seen.add(slug);
            const role = itemRole(slug, language);
            const head = r(`Smogon ${set.name} set`, `Conjunto ${set.name} (Smogon)`, language);
            picks.push({ slug, label: titleCase(slug), reason: role ? `${head} · ${role}` : head });
            if (picks.length >= 3) return picks;
        }
    }
    return picks;
}

// ── Heuristic fallback (no tournament data for this species) ─────────────────
const statMap = (stats = []) => {
    const out = { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 };
    stats.forEach((s) => {
        const key = s.name || s.stat?.name;
        const val = s.base_stat ?? s.value ?? 0;
        if (key in out) out[key] = val;
    });
    return out;
};

const HEUR_LABELS = {
    'life-orb': 'Life Orb', 'choice-band': 'Choice Band', 'choice-specs': 'Choice Specs',
    'choice-scarf': 'Choice Scarf', 'focus-sash': 'Focus Sash', 'leftovers': 'Leftovers',
    'assault-vest': 'Assault Vest', 'rocky-helmet': 'Rocky Helmet', 'sitrus-berry': 'Sitrus Berry',
    'expert-belt': 'Expert Belt', 'weakness-policy': 'Weakness Policy', 'clear-amulet': 'Clear Amulet',
};

function heuristicItems(pokemon, language) {
    const s = statMap(pokemon?.stats);
    const bulk = s.hp + s.defense + s['special-defense'];
    const physical = s.attack;
    const special = s['special-attack'];
    const offense = Math.max(physical, special);
    const isPhysical = physical >= special;
    const fast = s.speed >= 95;
    const frail = bulk < 230;
    const veryBulky = bulk >= 270;

    const picks = [];
    const add = (slug, en, pt) => {
        if (!HEUR_LABELS[slug] || picks.some((p) => p.slug === slug)) return;
        picks.push({ slug, label: HEUR_LABELS[slug], reason: r(en, pt, language) });
    };

    if (offense >= 110) {
        if (isPhysical) add('choice-band', 'Elite Atk — locks one move for max damage.', 'Atq elite — trava um golpe para dano máximo.');
        else add('choice-specs', 'Elite SpA — locks one move for max damage.', 'Atq.Esp elite — trava um golpe para dano máximo.');
        add('life-orb', '+30% on every move with full flexibility.', '+30% em todo golpe com flexibilidade total.');
    } else if (offense >= 90) {
        add('life-orb', 'Solid attacker — +30% on every move.', 'Atacante sólido — +30% em todo golpe.');
        add('expert-belt', 'Rewards super-effective coverage, no HP cost.', 'Recompensa cobertura eficaz, sem custo de HP.');
    }
    if (fast && offense >= 85) add('choice-scarf', 'Fast — Scarf outspeeds boosted threats.', 'Rápido — Scarf supera ameaças turbinadas.');
    if (frail && offense >= 85) add('focus-sash', 'Frail — Sash guarantees one full attack.', 'Frágil — Sash garante um golpe pleno.');
    if (veryBulky) {
        add('assault-vest', 'High bulk — +50% Sp.Def for attackers.', 'Resistente — +50% Def.Esp para atacantes.');
        add('leftovers', 'Bulky — passive recovery each turn.', 'Resistente — recuperação passiva por turno.');
    }
    if (s.defense >= 100 && bulk >= 240) add('rocky-helmet', 'High Def — punishes contact attackers.', 'Def alta — pune atacantes de contato.');

    add('sitrus-berry', 'Safe pick — restores 25% HP once.', 'Escolha segura — restaura 25% de HP.');
    add('leftovers', 'Reliable passive recovery for any build.', 'Recuperação passiva confiável.');
    return picks.slice(0, 3);
}

/**
 * Recommend held items, best source first:
 *   1. real tournament usage (what champions ran on this exact species),
 *   2. Smogon's expert-curated sets (robust, full-meta coverage),
 *   3. a stat/archetype heuristic (so every species still gets ideas).
 *
 * @param {{ stats?: Array, name?: string }} pokemon - enriched team member
 * @param {'en'|'pt'} language
 * @param {{ n: number, items: Array<{ name: string, slug: string, count: number }> }|null} [usageEntry]
 *        real mined usage for this species, if available
 * @param {{ sets?: Array<{ name: string, item: string, itemAlts?: string[] }> }|null} [smogonEntry]
 *        Smogon recommended sets for this species, if available
 * @returns {Array<{ slug: string, label: string, reason: string }>}
 */
export function suggestItemsForPokemon(pokemon, language = 'en', usageEntry = null, smogonEntry = null) {
    if (usageEntry && usageEntry.n >= 2 && usageEntry.items?.length) {
        const displayName = titleCase(pokemon?.name || '');
        const picks = usagePicks(usageEntry, displayName, language);
        if (picks.length) return picks;
    }
    if (smogonEntry && smogonEntry.sets?.length) {
        const picks = smogonPicks(smogonEntry, language);
        if (picks.length) return picks;
    }
    return heuristicItems(pokemon, language);
}
