import { typeColors } from './types';

/**
 * The cosmetics a trainer can unlock (2026-10-17, docs/modules/rewards.md).
 * Data only: what each item is and what unlocks it. utils/rewards.js decides,
 * useRewardsStore records, the views draw. Names and hints live in
 * translations.js under `rewards.items.<id>`.
 *
 * Kinds:
 * - `frame` — a ring around the trainer's avatar, seen by others (forum,
 *   profile, the account menu). Two rings: `colors[0]` inside, `colors[1]` out.
 * - `title` — a line under the trainer's name.
 * - `theme` — a whole app theme (constants/theme.js, `reward: true` there).
 *
 * Unlocks (`unlock.type`):
 * - `level`    — reach Trainer Level `level` (utils/trainerLevel.js).
 * - `badge`    — hold the badge `badgeId` (constants/badges.jsx).
 * - `journeys` — finish `count` journeys.
 * - `checkins` — check in `count` times (utils/dailyCheckin.js).
 *
 * Cosmetic only, on purpose: no item ever gates a feature.
 *
 * Colours: type colours and Poké Ball colours are canon, theme-independent —
 * the documented exception to "never write a raw colour" (design-system skill).
 * They are only ever drawn as rings, never as text.
 */

const BALL = {
    red: '#e3350d',
    white: '#f2f2f2',
    blue: '#3b6fd8',
    black: '#2b2b2b',
    yellow: '#f4c430',
    violet: '#7b3fb8',
    pink: '#e05aa5',
    gold: '#d4a017',
};

export const COSMETIC_KINDS = ['frame', 'title', 'theme'];

export const COSMETICS = [
    // ── Frames ─────────────────────────────────────────────────────────────
    { id: 'frame_poke', kind: 'frame', colors: [BALL.red, BALL.white], unlock: { type: 'level', level: 2 } },
    { id: 'frame_grass', kind: 'frame', colors: [typeColors.grass, typeColors.grass], unlock: { type: 'level', level: 3 } },
    { id: 'frame_fire', kind: 'frame', colors: [typeColors.fire, typeColors.fire], unlock: { type: 'level', level: 3 } },
    { id: 'frame_water', kind: 'frame', colors: [typeColors.water, typeColors.water], unlock: { type: 'level', level: 3 } },
    { id: 'frame_electric', kind: 'frame', colors: [typeColors.electric, BALL.black], unlock: { type: 'level', level: 5 } },
    { id: 'frame_great', kind: 'frame', colors: [BALL.blue, BALL.red], unlock: { type: 'level', level: 8 } },
    { id: 'frame_ice', kind: 'frame', colors: [typeColors.ice, BALL.white], unlock: { type: 'level', level: 11 } },
    { id: 'frame_dragon', kind: 'frame', colors: [typeColors.dragon, typeColors.dragon], unlock: { type: 'level', level: 14 } },
    { id: 'frame_ultra', kind: 'frame', colors: [BALL.yellow, BALL.black], unlock: { type: 'level', level: 16 } },
    { id: 'frame_ghost', kind: 'frame', colors: [typeColors.ghost, BALL.black], unlock: { type: 'level', level: 22 } },
    { id: 'frame_master', kind: 'frame', colors: [BALL.violet, BALL.pink], unlock: { type: 'level', level: 25 } },
    { id: 'frame_daily', kind: 'frame', colors: [BALL.yellow, BALL.red], unlock: { type: 'checkins', count: 30 } },
    { id: 'frame_shiny', kind: 'frame', colors: [BALL.gold, BALL.white], premium: true, unlock: { type: 'badge', badgeId: 'badge_streak_30' } },
    { id: 'frame_champion', kind: 'frame', colors: [BALL.gold, BALL.violet], premium: true, unlock: { type: 'journeys', count: 5 } },

    // ── Titles ─────────────────────────────────────────────────────────────
    { id: 'title_rising', kind: 'title', unlock: { type: 'level', level: 4 } },
    { id: 'title_loyal', kind: 'title', unlock: { type: 'checkins', count: 7 } },
    { id: 'title_explorer', kind: 'title', unlock: { type: 'badge', badgeId: 'badge_journey_first_steps' } },
    { id: 'title_builder', kind: 'title', unlock: { type: 'badge', badgeId: 'badge_journey_first_team' } },
    { id: 'title_strategist', kind: 'title', unlock: { type: 'badge', badgeId: 'badge_journey_strategy' } },
    { id: 'title_social', kind: 'title', unlock: { type: 'badge', badgeId: 'badge_journey_community' } },
    { id: 'title_challenger', kind: 'title', unlock: { type: 'badge', badgeId: 'badge_journey_league' } },
    { id: 'title_ace', kind: 'title', unlock: { type: 'level', level: 10 } },
    { id: 'title_puzzle', kind: 'title', unlock: { type: 'badge', badgeId: 'badge_soul' } },
    { id: 'title_quiz', kind: 'title', unlock: { type: 'badge', badgeId: 'badge_marsh' } },
    { id: 'title_elite', kind: 'title', unlock: { type: 'level', level: 18 } },
    { id: 'title_veteran', kind: 'title', unlock: { type: 'badge', badgeId: 'badge_days_100' } },
    { id: 'title_legend', kind: 'title', unlock: { type: 'level', level: 30 } },

    // ── Themes ─────────────────────────────────────────────────────────────
    { id: 'theme_ember', kind: 'theme', themeId: 'ember', unlock: { type: 'level', level: 6 } },
    { id: 'theme_viridian', kind: 'theme', themeId: 'viridian', unlock: { type: 'level', level: 12 } },
    { id: 'theme_blossom', kind: 'theme', themeId: 'blossom', unlock: { type: 'level', level: 16 } },
    { id: 'theme_aurum', kind: 'theme', themeId: 'aurum', unlock: { type: 'level', level: 20 } },
];

export const COSMETICS_BY_ID = Object.fromEntries(COSMETICS.map((item) => [item.id, item]));

export const getCosmetic = (id) => (id && COSMETICS_BY_ID[id]) || null;

/** The reward item that unlocks a theme, or null for the six free themes. */
export const themeReward = (themeId) => COSMETICS.find((item) => item.kind === 'theme' && item.themeId === themeId) || null;
