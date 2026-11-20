import { create } from 'zustand';
import { POKES_KEY, normalizePokes, pokedToday, withPoke } from '../../utils/meadow';
import { dayKeyAt } from '../../utils/challengeDay';
import { notifySocial } from '../../services/socialNotify';
import { track } from '../../services/analytics';
import { toast } from '../../store/useToastStore';
import { t } from '../../utils/translate';

const readPokes = (day) => {
    try {
        return normalizePokes(JSON.parse(localStorage.getItem(POKES_KEY) || 'null'), day);
    } catch {
        return normalizePokes(null, day);
    }
};

/**
 * Shared daily poke state across Meadow and the Friends list so poking any
 * friend from either surface immediately reflects everywhere and respects
 * the once-per-friend-per-day cooldown.
 */
export const usePokesStore = create((set, get) => ({
    pokes: readPokes(dayKeyAt(Date.now())),

    pokeFriend: (uid, name) => {
        if (!uid) return false;
        const day = dayKeyAt(Date.now());
        const current = normalizePokes(get().pokes, day);
        if (pokedToday(current, uid)) return false;

        const next = withPoke(current, uid);
        set({ pokes: next });
        try {
            localStorage.setItem(POKES_KEY, JSON.stringify(next));
        } catch {
            /* the server still keeps it to one a day */
        }
        notifySocial({ kind: 'poke', to: uid });
        track('poke_send');
        toast.success(t('meadow.poked', { name: name || t('friends.unknownTrainer') }));
        return true;
    },
}));

export function usePokes() {
    const rawPokes = usePokesStore((state) => state.pokes);
    const pokeFriend = usePokesStore((state) => state.pokeFriend);
    const day = dayKeyAt(Date.now());
    const pokes = normalizePokes(rawPokes, day);

    return {
        pokes,
        isPoked: (uid) => pokedToday(pokes, uid),
        pokeFriend,
    };
}
