import { create } from 'zustand';
import { TONES } from '../utils/mascot/constants';

/**
 * The mascot's shared state (2026-11-06). Small on purpose: it ships on the
 * boot path; the drawing and the motion load later (components/mascot/engine).
 *
 * - `prefs`, this device's choices (`ptb:mascot`, a DEVICE_KEYS entry — it
 *   describes how the app looks here, like the theme): the line colour
 *   (`brand`, `persona`, a type or `shiny`), and whether he reacts and
 *   celebrates on his own. `shinyFound` remembers the easter egg.
 * - `reaction`, a one-shot the app asks for (`hop` on a saved team, `oops`
 *   on an error); only the mascot holding the stage plays it — one per screen.
 * - `cover`, set while a password field has focus: the mascot near it covers
 *   its eyes (`cover`), or peeks when the password is shown (`peek`).
 */
export const MASCOT_PREFS_KEY = 'ptb:mascot';
export const MASCOT_TONE_CHOICES = ['brand', 'persona', ...TONES, 'shiny'];
const DEFAULT_PREFS = Object.freeze({ tone: 'brand', reactions: true, shinyFound: false });

export function normalizeMascotPrefs(raw) {
    const v = raw && typeof raw === 'object' ? raw : {};
    const shinyFound = v.shinyFound === true;
    const tone = MASCOT_TONE_CHOICES.includes(v.tone) && (v.tone !== 'shiny' || shinyFound) ? v.tone : 'brand';
    return { tone, reactions: v.reactions !== false, shinyFound };
}

const readPrefs = () => {
    try { return normalizeMascotPrefs(JSON.parse(localStorage.getItem(MASCOT_PREFS_KEY) || 'null')); } catch { return { ...DEFAULT_PREFS }; }
};
const writePrefs = (prefs) => {
    try { localStorage.setItem(MASCOT_PREFS_KEY, JSON.stringify(prefs)); } catch { /* the choice lasts this visit */ }
};

let reactionSeq = 0;

export const useMascotStore = create((set, get) => ({
    prefs: typeof window === 'undefined' ? { ...DEFAULT_PREFS } : readPrefs(),
    reaction: null,
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
    setCover: (cover) => { if (get().cover !== cover) set({ cover }); },

    /** The most recently mounted stage mascot owns the stage; leaving hands it back. */
    claimStage: (id) => set({ stage: id }),
    releaseStage: (id) => { if (get().stage === id) set({ stage: null }); },
}));
