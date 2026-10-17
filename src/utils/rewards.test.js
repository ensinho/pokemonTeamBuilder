import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { COSMETICS, COSMETICS_BY_ID, COSMETIC_KINDS, themeReward } from '../constants/cosmetics';
import { BADGES_BY_ID } from '../constants/badges';
import { THEME_META, THEMES } from '../constants/theme';
import { frameProps, isRewardEarned, levelTrack, mergeRewards, newlyEarnedRewards, nextLevelReward, normalizeRewards, unlockLabel, validEquip } from './rewards';

describe('the catalogue', () => {
    it('has unique ids of a known kind', () => {
        expect(new Set(COSMETICS.map((i) => i.id)).size).toBe(COSMETICS.length);
        for (const item of COSMETICS) expect(COSMETIC_KINDS).toContain(item.kind);
    });

    it('only names badges that exist', () => {
        for (const item of COSMETICS.filter((i) => i.unlock.type === 'badge')) {
            expect(BADGES_BY_ID[item.unlock.badgeId], item.id).toBeTruthy();
        }
    });

    it('only unlocks themes that exist and are marked as rewards', () => {
        for (const item of COSMETICS.filter((i) => i.kind === 'theme')) {
            expect(THEMES[item.themeId], item.id).toBeTruthy();
            expect(THEME_META.find((m) => m.id === item.themeId)?.reward, item.id).toBe(true);
        }
        for (const meta of THEME_META.filter((m) => m.reward)) expect(themeReward(meta.id)).toBeTruthy();
        expect(themeReward('dark')).toBeNull();
    });

    it('gives every frame two ring colours', () => {
        for (const item of COSMETICS.filter((i) => i.kind === 'frame')) expect(item.colors).toHaveLength(2);
    });

    it('lists every frame and title in the public profile rule', () => {
        // firestore.rules accepts only catalogue ids for frameId / titleId; a
        // new item missing there would make every profile sync fall back.
        const rules = readFileSync(fileURLToPath(new URL('../../firestore.rules', import.meta.url)), 'utf8');
        for (const item of COSMETICS.filter((i) => i.kind !== 'theme')) {
            expect(rules, item.id).toContain(`'${item.id}'`);
        }
    });
});

describe('isRewardEarned', () => {
    it('reads each kind of unlock', () => {
        expect(isRewardEarned(COSMETICS_BY_ID.frame_poke, { level: 2 })).toBe(true);
        expect(isRewardEarned(COSMETICS_BY_ID.frame_poke, { level: 1 })).toBe(false);
        expect(isRewardEarned(COSMETICS_BY_ID.title_explorer, { badgeIds: ['badge_journey_first_steps'] })).toBe(true);
        expect(isRewardEarned(COSMETICS_BY_ID.frame_champion, { journeysDone: 4 })).toBe(false);
        expect(isRewardEarned(COSMETICS_BY_ID.frame_champion, { journeysDone: 5 })).toBe(true);
        expect(isRewardEarned(COSMETICS_BY_ID.title_loyal, { checkins: 7 })).toBe(true);
        expect(isRewardEarned(null, { level: 99 })).toBe(false);
    });
});

describe('newlyEarnedRewards', () => {
    it('lists what progress earns and the record does not hold yet', () => {
        const ids = newlyEarnedRewards({ level: 3 }, { frame_poke: '2026-10-01' });
        expect(ids).toEqual(['frame_grass', 'frame_fire', 'frame_water']);
    });

    it('is empty for a trainer at the start', () => {
        expect(newlyEarnedRewards({ level: 1 }, {})).toEqual([]);
    });
});

describe('levelTrack', () => {
    it('lists the paying levels in order, starter frames together', () => {
        const track = levelTrack();
        const levels = track.map((s) => s.level);
        expect(levels).toEqual([...levels].sort((a, b) => a - b));
        expect(track.find((s) => s.level === 3).items.map((i) => i.id)).toEqual(['frame_grass', 'frame_fire', 'frame_water']);
    });

    it('names the next step above a level, and none past the end', () => {
        expect(nextLevelReward(1).level).toBe(2);
        expect(nextLevelReward(3).level).toBe(4);
        expect(nextLevelReward(99)).toBeNull();
    });
});

describe('frameProps', () => {
    it('gives a frame its data attribute and ring colours', () => {
        const props = frameProps('frame_fire');
        expect(props['data-frame']).toBe('frame_fire');
        expect(props.style['--frame-a']).toMatch(/^#/);
    });

    it('is empty for nothing, or for something that is not a frame', () => {
        expect(frameProps(null)).toEqual({});
        expect(frameProps('title_ace')).toEqual({});
    });
});

describe('validEquip', () => {
    it('keeps a real item of the asked kind only', () => {
        expect(validEquip('title_ace', 'title')).toBe('title_ace');
        expect(validEquip('title_ace', 'frame')).toBeNull();
        expect(validEquip('<script>', 'title')).toBeNull();
    });
});

describe('unlockLabel', () => {
    it('describes every unlock in the catalogue', () => {
        for (const item of COSMETICS) expect(unlockLabel(item).key).not.toBe('rewards.unlock.unknown');
    });
});

describe('normalizeRewards / mergeRewards', () => {
    it('drops junk: unknown ids, bad days, the wrong kind equipped', () => {
        const rec = normalizeRewards({
            xp: -5,
            unlocked: { frame_fire: '2026-10-17', nope: '2026-10-17', title_ace: 'yesterday' },
            equipped: { frame: 'title_ace', title: 'title_ace' },
            seen: { frame_fire: true, frame_poke: 'yes' },
        });
        expect(rec).toEqual({
            xp: 0,
            unlocked: { frame_fire: '2026-10-17' },
            equipped: { frame: null, title: 'title_ace' },
            equippedAt: 0,
            seen: { frame_fire: true },
        });
    });

    it('never takes anything back: the higher XP, every unlock, the earlier day', () => {
        const merged = mergeRewards(
            { xp: 500, unlocked: { frame_poke: '2026-10-10', frame_fire: '2026-10-12' } },
            { xp: 300, unlocked: { frame_fire: '2026-10-11', title_ace: '2026-10-13' } },
        );
        expect(merged.xp).toBe(500);
        expect(merged.unlocked).toEqual({ frame_poke: '2026-10-10', frame_fire: '2026-10-11', title_ace: '2026-10-13' });
    });

    it('keeps the equip chosen last, so leaving right after equipping loses nothing', () => {
        const local = { equipped: { frame: 'frame_fire', title: null }, equippedAt: 2000 };
        const remote = { equipped: { frame: null, title: 'title_ace' }, equippedAt: 1000 };
        expect(mergeRewards(local, remote).equipped).toEqual({ frame: 'frame_fire', title: null });
        expect(mergeRewards({ ...local, equippedAt: 500 }, remote).equipped).toEqual({ frame: null, title: 'title_ace' });
    });
});
