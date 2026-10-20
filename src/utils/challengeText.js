/**
 * A battle moment → the line in the DS text box, translated.
 *
 * Pure: it takes `t` instead of importing the store, so it is tested with a
 * fake translator. The player's own Pokémon is named plainly; Cynthia's is
 * "the foe's X", as on the DS.
 */

const STATUSES = new Set(['brn', 'par', 'slp', 'psn', 'tox', 'frz']);
const CANT_REASONS = new Set(['slp', 'par', 'frz', 'flinch', 'recharge']);
const WEATHERS = new Set(['SunnyDay', 'RainDance', 'Sandstorm', 'Snow', 'Hail', 'none']);
const STATS = new Set(['atk', 'def', 'spa', 'spd', 'spe', 'accuracy', 'evasion']);

const fromItem = (from) => (from && from.startsWith('item:') ? from.slice(5).trim() : null);

/**
 * @param {object} event a `battleTimeline` event
 * @param {{t: Function, mySide?: string, championName: string, foeSimName?: string, rival?: boolean}} ctx
 *   `rival`: a friend battle — the outcome lines are not Cynthia's (`battle.stage.*`),
 *   and `foeSimName` is the name `|win|` uses for the opponent.
 * @returns {{text: string|null, speaker: string|null}}
 */
export const eventText = (event, { t, mySide = 'p1', championName, foeSimName = null, rival = false }) => {
    const who = event.side === mySide ? event.species : t('challenge.text.foe', { species: event.species });
    const say = (key, params = {}) => ({ text: t(key, { who, name: championName, ...params }), speaker: null });

    switch (event.type) {
        case 'intro':
            return say('challenge.text.intro');
        case 'switch':
            if (event.drag) return say('challenge.text.dragged');
            return event.side === mySide
                ? say('challenge.text.go', { species: event.species })
                : say('challenge.text.sendOut', { species: event.species });
        case 'move':
            return say('challenge.text.move', { move: event.move });
        case 'effect':
            if (event.kind === 'supereffective') return say('challenge.text.superEffective');
            if (event.kind === 'resisted') return say('challenge.text.resisted');
            if (event.kind === 'crit') return say('challenge.text.crit');
            if (event.kind === 'immune') return say('challenge.text.immune');
            if (event.kind === 'miss') return say('challenge.text.miss');
            return { text: null, speaker: null };
        case 'faint':
            return say('challenge.text.faint');
        case 'status':
            return STATUSES.has(event.status) ? say(`challenge.text.status.${event.status}`) : { text: null, speaker: null };
        case 'cure':
            return say('challenge.text.cure');
        case 'stat': {
            if (!STATS.has(event.stat)) return { text: null, speaker: null };
            const size = Math.abs(event.amount) >= 2 ? '2' : '';
            const direction = event.amount > 0 ? 'up' : 'down';
            return say(`challenge.text.stat.${direction}${size}`, { stat: t(`challenge.text.stats.${event.stat}`) });
        }
        case 'weather':
            return WEATHERS.has(event.weather) ? say(`challenge.text.weather.${event.weather}`) : { text: null, speaker: null };
        case 'cant':
            return CANT_REASONS.has(event.reason) ? say(`challenge.text.cant.${event.reason}`) : say('challenge.text.cant.other');
        case 'ability':
            return say('challenge.text.ability', { ability: event.ability });
        case 'item':
            return say(event.consumed ? 'challenge.text.ateItem' : 'challenge.text.lostItem', { item: event.item });
        case 'hp': {
            if (!event.from) return { text: null, speaker: null };
            const item = fromItem(event.from);
            if (item) return say(event.heal ? 'challenge.text.healItem' : 'challenge.text.hurtItem', { item });
            const source = event.from.replace(/^(move|ability):\s*/, '');
            if (STATUSES.has(source)) return say(`challenge.text.hurtStatus.${source === 'tox' ? 'psn' : source}`);
            if (source === 'Recoil' || source === 'recoil') return say('challenge.text.recoil');
            if (event.heal) return say('challenge.text.healed');
            return say('challenge.text.hurt');
        }
        case 'dialogue':
            return { text: t(event.key, event.params || {}), speaker: championName };
        case 'end': {
            const lost = event.winner === (foeSimName || championName);
            if (rival) return say(lost ? 'battle.stage.lostTo' : 'battle.stage.beat');
            return lost ? say('challenge.text.lost') : say('challenge.text.won');
        }
        default:
            return { text: null, speaker: null };
    }
};
