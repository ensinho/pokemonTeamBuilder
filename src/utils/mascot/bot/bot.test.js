import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateAvatar } from '../../../vendor/open-bot-avatar/validate.js';
import { buildBotDefinition } from '../../../../scripts/lib/mascotBot.mjs';
import { BOT_DEFINITION, RIG_TO_BOX, RIG_SCALE } from './definition.js';
import { botInner, botSvg, botDefs, botMotion, botState, botVolume } from './frame.js';
import { BOT_STATES, isBotState, createBotAnimator, computeBotPose, blendBotPoses } from './state.js';
import { MOODS, POSES, resolvePose } from '../catalog.js';

const NO_NAN = /NaN|undefined|Infinity/;

describe('the bot definition', () => {
    it('is a valid open-bot-avatar v1 definition', () => {
        const res = validateAvatar(BOT_DEFINITION);
        expect(res.ok ? [] : res.errors).toEqual([]);
    });

    it('is the rig as it is now (rerun `npm run mascot:bot` after editing the rig)', () => {
        const built = buildBotDefinition();
        expect(built.definition).toEqual(BOT_DEFINITION);
        expect(built.RIG_TO_BOX).toBe(RIG_TO_BOX);
        expect(built.RIG_SCALE).toBe(RIG_SCALE);
    });

    it('ships the same definition for the open-bot-avatar editor', () => {
        const json = JSON.parse(readFileSync(new URL('../../../../public/mascot-bot.json', import.meta.url), 'utf8'));
        expect(json).toEqual(BOT_DEFINITION);
    });

    it('gives the head, the two barbs and the two sparks a volume each', () => {
        const { vol } = botVolume();
        expect(vol.parts).toHaveLength(5);
        expect(vol.eyePart).toBe(0);
        expect(vol.parts[0].depth).toBeGreaterThan(vol.parts[3].depth);
    });
});

describe('the bot frame', () => {
    it('draws every mood and every pose without NaN', () => {
        for (const mood of Object.keys(MOODS)) {
            const out = botInner(resolvePose({ mood }), { time: 1.3, motion: botMotion(mood) });
            expect(out, mood).not.toMatch(NO_NAN);
        }
        for (const pose of Object.keys(POSES)) {
            const out = botInner(resolvePose({ pose }), { time: 2.1, motion: botMotion(undefined, pose), gaze: { x: 0.4, y: -0.3, weight: 1 } });
            expect(out, pose).not.toMatch(NO_NAN);
        }
    });

    it('is deterministic: the same pose and clock give the same markup', () => {
        const life = { time: 3.7, motion: 'happy', gaze: { x: -0.5, y: 0.2, weight: 0.6 } };
        expect(botInner({}, life)).toBe(botInner({}, life));
    });

    it('paints the face on the front, and hides it once the front turns away', () => {
        expect(botInner({}, { time: 0 })).toContain('bot-face');
        expect(botInner({}, { time: 0, view: { yaw: 1.4, pitch: 0 } })).not.toContain('bot-face');
    });

    it('paints the line as the bevel and the dark tile as the front (the icon, straight on)', () => {
        const out = botInner({}, { time: 0, reducedMotion: true });
        expect(out).toMatch(/class="bs5"/); // the silhouette in the line's violet
        expect(out).toMatch(/class="bs10"/); // the front plateau in the icon's tile
    });

    it('drops the sparks with the mood that drops them', () => {
        const sparks = (pose) => (botInner(pose, { time: 0 }).match(/href="#mb-p[34]/g) || []).length;
        expect(sparks({})).toBeGreaterThan(0);
        expect(sparks(resolvePose({ mood: 'sonolento' }))).toBe(0);
    });

    it('references only sections that botDefs defines', () => {
        const defs = botDefs('mb-');
        const used = [...botInner({}, { time: 0.5, gaze: { x: 1, y: 1, weight: 1 } }).matchAll(/href="#(mb-p\d[zx]\d+)"/g)].map((m) => m[1]);
        expect(used.length).toBeGreaterThan(5);
        for (const id of used) expect(defs).toContain(`id="${id}"`);
    });

    it('a standalone svg carries its own sections', () => {
        const svg = botSvg({}, { time: 0 });
        const used = new Set([...svg.matchAll(/href="#(mb-p\d[zx]\d+)"/g)].map((m) => m[1]));
        for (const id of used) expect(svg).toContain(`id="${id}"`);
    });
});

describe('botMotion', () => {
    it('hops for joy, thinks for thought, idles otherwise', () => {
        expect(botMotion('radiante')).toBe('happy');
        expect(botMotion(undefined, 'comemorando')).toBe('happy');
        expect(botMotion('pensando')).toBe('thinking');
        expect(botMotion('perdido', 'pataNoQueixo')).toBe('thinking');
        expect(botMotion('feliz')).toBe('idle');
        expect(botMotion()).toBe('idle');
    });
});

describe('bot states & ribbons', () => {
    it('supports exactly idle, thinking, working, done and excludes blocked and waiting', () => {
        expect(BOT_STATES).toEqual(['idle', 'thinking', 'working', 'done']);
        expect(BOT_STATES).not.toContain('blocked');
        expect(BOT_STATES).not.toContain('waiting');
        expect(isBotState('blocked')).toBe(false);
        expect(isBotState('waiting')).toBe(false);
        expect(isBotState('done')).toBe(true);
        expect(botState('feliz', undefined, 'done')).toBe('done');
        expect(botState('feliz', undefined, 'blocked')).toBe('idle');
        expect(botState('pensando')).toBe('thinking');
    });

    it('renders back and front celebration ribbons in done state at stateAge 1.2 without NaN', () => {
        const out = botInner({}, { time: 1.2, state: 'done', stateAge: 1.2 });
        expect(out).not.toMatch(NO_NAN);
        expect(out).toContain('bot-ribbons--back is-done');
        expect(out).toContain('bot-ribbons--front is-done');
        expect(out).toContain('bot-ribbon ');
        expect(out).toContain(' is-back');
    });

    it('renders 0 ribbons in done state when reducedMotion is true', () => {
        const out = botInner({}, { time: 1.2, state: 'done', stateAge: 1.2, reducedMotion: true });
        expect(out).not.toMatch(NO_NAN);
        expect(out).not.toContain('bot-ribbon');
    });

    it('keeps the body slices in thinking state and renders no dots or bang marks', () => {
        const out = botInner(resolvePose({ mood: 'pensando' }), { time: 1.5, state: 'thinking', stateAge: 1.5 });
        expect(out).not.toMatch(NO_NAN);
        expect(out).toMatch(/href="#mb-p0[zx]\d+"/);
        expect(out).not.toMatch(/dots|bang/i);
        expect(out).not.toContain('bot-ribbon');
    });

    it('keeps ribbon sweep and cage pinned while blending ribbons out', () => {
        const active = computeBotPose({ seed: 42, time: 1.2, state: 'done', stateAge: 1.2 });
        const idle = computeBotPose({ seed: 42, time: 1.2, state: 'idle', stateAge: 0 });
        expect(active.ribbons).toBeGreaterThan(0.5);
        const mid = blendBotPoses(active, idle, 0.5);
        expect(mid.ribbons).toBeCloseTo(active.ribbons * 0.5, 5);
        expect(mid.sweep).toBe(active.sweep);
        expect(mid.cage).toBe(active.cage);
    });

    it('transitions cleanly through idle -> working -> done -> idle in createBotAnimator', () => {
        const anim = createBotAnimator();
        const sequence = [
            { now: 0, state: 'idle' },
            { now: 200, state: 'working' },
            { now: 350, state: 'working' },
            { now: 600, state: 'done', stateKey: 1 },
            { now: 900, state: 'done', stateKey: 1 },
            { now: 1200, state: 'done', stateKey: 2 },
            { now: 1500, state: 'idle' },
            { now: 2200, state: 'idle' },
        ];
        for (const frame of sequence) {
            const step = anim.step({ ...frame, motion: 'idle', reducedMotion: false });
            expect(Number.isFinite(step.stateAge)).toBe(true);
            const out = botInner({}, {
                time: frame.now / 1000,
                state: frame.state,
                stateAge: step.stateAge,
                motionBlend: step.motionBlend,
                gaze: step.gaze,
            });
            expect(out).not.toMatch(NO_NAN);
        }
        // Mounting directly in done starts stateAge at 0 so the celebration plays immediately
        const fresh = createBotAnimator();
        const first = fresh.step({ now: 5000, state: 'done', motion: 'idle' });
        expect(first.stateAge).toBe(0);
    });
});
