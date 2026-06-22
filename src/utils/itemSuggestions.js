// Heuristic held-item recommender.
//
// PokéAPI's item list carries no competitive metadata, so we infer sensible held
// items from a Pokémon's base stat spread and typing. This is intentionally a
// lightweight "coach" — not a tier-list — meant to give the user a useful starting
// point per team member. Each suggestion has a stable item slug (for the sprite),
// a display label and a short rationale.

const ITEM_SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items';

export const itemSpriteUrl = (slug) => `${ITEM_SPRITE_BASE}/${slug}.png`;

const LABELS = {
    'life-orb': 'Life Orb',
    'choice-band': 'Choice Band',
    'choice-specs': 'Choice Specs',
    'choice-scarf': 'Choice Scarf',
    'focus-sash': 'Focus Sash',
    'leftovers': 'Leftovers',
    'assault-vest': 'Assault Vest',
    'rocky-helmet': 'Rocky Helmet',
    'sitrus-berry': 'Sitrus Berry',
    'eviolite': 'Eviolite',
    'expert-belt': 'Expert Belt',
    'weakness-policy': 'Weakness Policy',
};

const reason = (en, pt, language) => (language === 'pt' ? pt : en);

const statMap = (stats = []) => {
    const out = { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 };
    stats.forEach((s) => {
        const key = s.name || s.stat?.name;
        const val = s.base_stat ?? s.value ?? 0;
        if (key in out) out[key] = val;
    });
    return out;
};

/**
 * @param {{stats?: Array}} pokemon - enriched member with base stats
 * @param {string} language - 'en' | 'pt'
 * @returns {Array<{slug:string,label:string,reason:string}>}
 */
export function suggestItemsForPokemon(pokemon, language = 'en') {
    const s = statMap(pokemon?.stats);
    const bulk = s.hp + s.defense + s['special-defense'];
    const physical = s.attack;
    const special = s['special-attack'];
    const offense = Math.max(physical, special);
    const isPhysical = physical >= special;
    const fast = s.speed >= 95;
    const frail = s.hp + s.defense + s['special-defense'] < 230;

    const picks = [];
    const add = (slug, en, pt) => {
        if (!picks.some((p) => p.slug === slug)) picks.push({ slug, label: LABELS[slug] || slug, reason: reason(en, pt, language) });
    };

    // Primary item by role.
    if (offense >= 100) {
        if (isPhysical) {
            add('choice-band', 'Huge physical attack — locks into one move for big damage.', 'Ataque físico alto — trava em um golpe para dano máximo.');
        } else {
            add('choice-specs', 'Huge special attack — locks into one move for big damage.', 'Ataque especial alto — trava em um golpe para dano máximo.');
        }
        add('life-orb', 'Boosts every hit if you want move freedom.', 'Aumenta todos os golpes se quiser liberdade de movimentos.');
    } else if (offense >= 80) {
        add('life-orb', 'Solid offense — a flat damage boost on every move.', 'Ofensiva sólida — aumento de dano em todos os golpes.');
        add('expert-belt', 'Rewards hitting super-effective without locking moves.', 'Recompensa golpes super eficazes sem travar movimentos.');
    }

    // Speed control.
    if (fast && offense >= 90) {
        add('choice-scarf', 'Already fast — Scarf lets it outspeed boosted threats.', 'Já é rápido — o Scarf supera ameaças turbinadas.');
    }

    // Survivability.
    if (frail) {
        add('focus-sash', 'Frail — Sash guarantees it survives one hit to act.', 'Frágil — a Sash garante sobreviver a um golpe.');
    }
    if (bulk >= 250) {
        add('leftovers', 'Bulky — passive recovery keeps it on the field.', 'Resistente — recuperação passiva o mantém em campo.');
        add('assault-vest', 'Great special bulk if it only needs attacking moves.', 'Ótima defesa especial se só usa golpes ofensivos.');
    }
    if (s.defense >= 100) {
        add('rocky-helmet', 'High defense — punishes contact attackers.', 'Defesa alta — pune atacantes de contato.');
    }

    // Universal fallbacks so there are always a few ideas.
    add('sitrus-berry', 'A safe pick — restores HP once when low.', 'Escolha segura — restaura HP uma vez quando baixo.');
    add('leftovers', 'Reliable passive recovery for any build.', 'Recuperação passiva confiável para qualquer build.');

    return picks.slice(0, 3);
}
