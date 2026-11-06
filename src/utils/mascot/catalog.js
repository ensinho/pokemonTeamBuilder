/**
 * The mascot's vocabulary (2026-11-06): named moods (the face), poses (paws
 * and props), the seasons and the hours. Components ask for a name —
 * `<Mascot mood="preocupado" pose="segurandoPlaca">` — and never assemble a
 * face by hand, so a mood means the same thing on every screen.
 *
 * The names are the proposal's (pt-BR), because they are the design's
 * vocabulary, not copy: nothing here is shown to the user.
 */
import { PERSONAS } from '../trainerProfile.js';

/** Faces: eyes, mouth, ears, blush and the effects that belong to the face. */
export const MOODS = {
    feliz: {},
    animado: { eyes: 'excited', mouth: 'big' },
    confiante: { eyes: 'half', mouth: 'smirk' },
    pensando: { eyes: 'calm', mouth: 'flat', tilt: -6 },
    confuso: { eyes: 'swirl', mouth: 'wavy', sparks: 'none', fx: ['question'], tilt: -10 },
    surpreso: { eyes: 'wide', mouth: 'o', sparks: 'triple', earL: -8, earR: -8, crest: 1 },
    empolgado: { eyes: 'starGold', mouth: 'big', sparks: 'triple' },
    radiante: { eyes: 'happy', mouth: 'big', blush: 'strong', sparks: 'triple' },
    preocupado: { eyes: 'moon', mouth: 'wavy', earL: 14, earR: 14, fxHead: ['sweat'] },
    triste: { eyes: 'teary', mouth: 'frown', earL: 22, earR: 22, sparks: 'none', tilt: 0 },
    bravo: { eyes: 'angry', mouth: 'grit', crest: 1.2, earL: -18, earR: -18, fxHead: ['anger'] },
    sonolento: { eyes: 'sleepy', mouth: 'smallO', sparks: 'none', fx: ['zzz'], tilt: 14, earL: 10, earR: 10 },
    apaixonado: { eyes: 'heart', mouth: 'smile', blush: 'strong' },
    brilhando: { eyes: 'star', mouth: 'grin', fx: ['sparkles'] },
    aliviado: { eyes: 'calm', mouth: 'smile' },
    envergonhado: { eyes: 'calm', mouth: 'tiny', blush: 'strong', earL: 12, earR: 12 },
    travesso: { eyes: 'half', mouth: 'smirk', tilt: 14 },
    piscadinha: { eyes: { l: 'happy', r: 'excited' }, mouth: 'tongue' },
    gatinho: { eyes: 'happy', mouth: 'cat' },
    tonto: { eyes: 'swirl', mouth: 'wavy', fx: ['dizzy'], sparks: 'none' },
    nocaute: { eyes: 'x', mouth: 'o', sparks: 'none', tilt: -14, fx: ['smoke'] },
    determinado: { eyes: 'determined', mouth: 'grit', crest: 0.8 },
    desconfiado: { eyes: { l: 'half', r: 'flat' }, mouth: 'flat', tilt: -4 },
    bocejo: { eyes: 'sleepy', mouth: 'yawn', sparks: 'none' },
    assustado: { eyes: 'wide', mouth: 'shout', earL: -20, earR: -20, crest: 1.4, fxHead: ['sweat'], sparks: 'triple' },
    orgulhoso: { eyes: 'half', mouth: 'smile', tilt: -12, fx: [['sparkles', true]] },
    rindo: { eyes: 'happy', mouth: 'big', fxHead: ['tears'], blush: 'strong' },
    concentrado: { eyes: 'flat', mouth: 'tongue', tilt: 4 },
    // the 404's face: moon eyes, a question mark (the two 404 drawings, unified without pupils)
    perdido: { eyes: 'moon', mouth: 'wavy', fx: ['question'], earL: 14, earR: 14, sparks: 'none' },
    // the capture loader's face: wide eyes on the rocking ball — will it hold? (surprised, without the jolt)
    expectante: { eyes: 'wide', mouth: 'o', earL: -8, earR: -8, sparks: 'none' },
    // the search loader's face: open eyes after the lens
    curioso: { eyes: 'open', mouth: 'smallO', tilt: -6 },
    // the battle loader's face: Gengar's own grin under sharp eyes — the challenge accepted
    desafiador: { eyes: 'angry', mouth: 'grin', crest: 1, earL: -10, earR: -10 },
};

/** Bodies: paws and what they hold. Faces come from the mood, unless a pose needs its own. */
export const POSES = {
    parado: {},
    acenando: { paws: 'wave', fx: ['heartPop'], tilt: 10 },
    pulando: { y: -60, sy: 1.06, sx: 0.95, paws: 'up', fx: ['motion'] },
    investigando: { prop: 'magnifier', tilt: -4, gaze: 'follow' },
    analisando: { prop: 'clipboard', paws: 'hold' },
    trabalhando: { prop: 'laptop', paws: 'type', tilt: 4 },
    comemorando: { paws: 'up', sparks: 'triple' },
    campeao: { hat: 'crown', prop: 'trophy', paws: 'hold', fx: [['sparkles', true]] },
    dormindo: { behind: 'pillow', tilt: 24, y: 30 },
    espiando: { prop: 'ledge', paws: 'edge', y: 150, tilt: 2 },
    cobrindoOlhos: { paws: 'cover' },
    espiandoSenha: { paws: 'peek' },
    apontando: { paws: 'point', tilt: -6 },
    segurandoPlaca: { prop: 'sign', paws: 'hold', signText: '0', signSize: 96 },
    shadowBall: { prop: 'orb', paws: 'charge', crest: 1, propS: 1.6, propY: 40, y: -70 }, // held low under the grin; the body rises so the glow stays in the frame
    lancandoPokebola: { prop: 'pokeballThrow', paws: 'raise', tilt: -8 },
    lendoPokedex: { prop: 'book', paws: 'hold', gaze: 'read' },
    dandoDeOmbros: { paws: 'shrug', tilt: -10 },
    pataNoQueixo: { paws: 'chin', tilt: -8 },
    matutando: { paws: 'chin', tilt: -8, fx: ['dots'] }, // paw on the chin and a thought bubble: working something out
    capturando: { prop: 'bigball', paws: 'edge', pawY: -150, y: 30 },
    olhandoNuvem: { prop: 'cloud', faceY: -14, tilt: 0 },
    segurandoPresente: { prop: 'gift', paws: 'hold' },
    segurandoInsignia: { prop: 'badge', paws: 'raise' },
    segurandoChama: { prop: 'flame', paws: 'hold' },
    segurandoEscudo: { prop: 'shield', paws: 'hold' },
    tomadaSolta: { prop: 'plug' },
    esperando: { prop: 'clock', paws: 'hold' },
};

export const resolvePose = ({ mood, pose } = {}) => ({ ...(POSES[pose] || {}), ...(MOODS[mood] || {}) });

/* ---------- size ---------- */
/**
 * The size ladder from the anatomy sheet: the stroke thickens and the small
 * parts go as the drawing shrinks, so 24 px still reads as the mascot.
 */
export function sizeTraits(px) {
    if (px <= 20) return { strokeK: 2.8, blush: 'none', fangs: false, sparks: 'none' };
    if (px <= 28) return { strokeK: 2.1, blush: 'none', fangs: false };
    if (px <= 40) return { strokeK: 1.6, fangs: false };
    if (px <= 56) return { strokeK: 1.3 };
    if (px <= 80) return { strokeK: 1.12 };
    return {};
}

/* ---------- seasons and hours ---------- */
const DAY = 86400000;
/** Easter Sunday (Meeus/Jones/Butcher), local date. */
export function easter(year) {
    const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
}
const dayOnly = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/**
 * The hat a date asks for, or null. Halloween week is the ghost's own season;
 * Carnaval runs from the Saturday to Ash Wednesday (Easter − 46 days).
 */
export function seasonalHat(date = new Date()) {
    const d = dayOnly(date), m = d.getMonth(), day = d.getDate();
    if (m === 9 && day >= 24) return 'witch';
    if (m === 11 && day >= 20 && day <= 26) return 'santa';
    if (m === 5) return 'straw';
    const ash = new Date(easter(d.getFullYear()).getTime() - 46 * DAY);
    const from = new Date(ash.getTime() - 4 * DAY);
    if (d >= from && d <= ash) return 'mask';
    return null;
}

/** 22:00–05:59 local: the Home's night, when the mascot dozes off sooner. */
export const isNight = (date = new Date()) => { const h = date.getHours(); return h >= 22 || h < 6; };

/** The persona's type tone (Dragon for the strategist, Electric for the traveler…). */
export const personaTone = (personaId) => PERSONAS[personaId]?.tone || null;
