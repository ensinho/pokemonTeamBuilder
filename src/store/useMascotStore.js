import { create } from 'zustand';
import { TONES } from '../utils/mascot/constants';
import { COSTUMES } from '../utils/mascot/assistant';

/**
 * The mascot's shared state (2026-11-06). Small on purpose: it ships on the
 * boot path; the drawing and the motion load later (components/mascot/engine).
 *
 * - `prefs`, this device's choices (`ptb:mascot`, a DEVICE_KEYS entry — it
 *   describes how the app looks here, like the theme): the line colour
 *   (`brand`, `persona`, a type or `shiny`), and whether he reacts and
 *   celebrates on his own. `shinyFound` remembers the easter egg. `costume`
 *   is what he wears (`none`, `persona` — the trainer's persona's outfit —
 *   or one of `COSTUMES`, utils/mascot/assistant.js). `form` is how the
 *   playgrounds draw him: `bot` (the 3D body, 2026-11-11) or `line` (the icon's
 *   drawing).
 * - `reaction`, a one-shot the app asks for (`hop` on a saved team, `oops`
 *   on an error); only the mascot holding the stage plays it — one per screen.
 * - `beat`, a game/forum moment for the companion (2026-11-11): `emitBeat('posted')`
 *   from a store's action; `<MascotCompanion listen>` shows it (`gameBeat`).
 * - `cover`, set while a password field has focus: the mascot near it covers
 *   its eyes (`cover`), or peeks when the password is shown (`peek`).
 */
export const MASCOT_PREFS_KEY = 'ptb:mascot';
export const MASCOT_TONE_CHOICES = ['brand', 'persona', ...TONES, 'shiny'];
export const MASCOT_COSTUME_CHOICES = ['none', 'persona', ...COSTUMES];
export const MASCOT_FORM_CHOICES = ['bot', 'line'];
const DEFAULT_PREFS = Object.freeze({ tone: 'brand', reactions: true, shinyFound: false, costume: 'none', form: 'bot' });

export function normalizeMascotPrefs(raw) {
    const v = raw && typeof raw === 'object' ? raw : {};
    const shinyFound = v.shinyFound === true;
    const tone = MASCOT_TONE_CHOICES.includes(v.tone) && (v.tone !== 'shiny' || shinyFound) ? v.tone : 'brand';
    const costume = MASCOT_COSTUME_CHOICES.includes(v.costume) ? v.costume : 'none';
    const form = MASCOT_FORM_CHOICES.includes(v.form) ? v.form : 'bot';
    return { tone, reactions: v.reactions !== false, shinyFound, costume, form };
}

const readPrefs = () => {
    try { return normalizeMascotPrefs(JSON.parse(localStorage.getItem(MASCOT_PREFS_KEY) || 'null')); } catch { return { ...DEFAULT_PREFS }; }
};
const writePrefs = (prefs) => {
    try { localStorage.setItem(MASCOT_PREFS_KEY, JSON.stringify(prefs)); } catch { /* the choice lasts this visit */ }
};

let reactionSeq = 0;
let beatSeq = 0;

export const useMascotStore = create((set, get) => ({
    prefs: typeof window === 'undefined' ? { ...DEFAULT_PREFS } : readPrefs(),
    reaction: null,
    beat: null,
    cover: null,
    stage: null,

    setPrefs: (patch) => {
        const prefs = normalizeMascotPrefs({ ...get().prefs, ...patch });
        writePrefs(prefs);
        set({ prefs });
    },
    /** The easter egg: three taps on the sparks. Unlocks the shiny tone for good. */
    foundShiny: () => { if (!get().prefs.shinyFound) get().setPrefs({ shinyFound: true }); },

    /** Ask the mascot on stage to play a one-shot. Ignored when reactions are off. */
    react: (name) => {
        if (!get().prefs.reactions || !get().stage) return;
        reactionSeq += 1;
        set({ reaction: { name, id: reactionSeq } });
    },
    /** A moment of the trainer's own (a post, a like) for the companion on screen, if any. */
    emitBeat: (kind) => {
        beatSeq += 1;
        set({ beat: { kind, id: beatSeq } });
    },
    setCover: (cover) => { if (get().cover !== cover) set({ cover }); },

    /** The most recently mounted stage mascot owns the stage; leaving hands it back. */
    claimStage: (id) => set({ stage: id }),
    releaseStage: (id) => { if (get().stage === id) set({ stage: null }); },
}));
