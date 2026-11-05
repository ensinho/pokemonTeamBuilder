import { toast } from '../store/useToastStore';
import { useLanguageStore } from '../store/useLanguageStore';
import { translate } from '../utils/translate';
import { SUPPORT_URL } from '../constants/support';
import { getPokemonFrontSpriteUrl } from '../utils/pokemonSprites';
import { readSupportNudge, recordFinish, writeSupportNudge } from '../utils/supportNudge';
import { track } from './analytics';

const storage = () => {
    try {
        return window.localStorage;
    } catch {
        return null;
    }
};

// Gengar, the site's mascot, brings the cup.
const GENGAR_ID = 94;

/**
 * Called once when a Champion battle, a PokéPuzzle or a quiz ends (utils/supportNudge.js
 * decides whether this finish asks). A toast, not a dialog: it never stands
 * between the player and the result, and it leaves on its own.
 */
export function nudgeSupport(source) {
    const store = storage();
    const { state, show } = recordFinish(readSupportNudge(store));
    writeSupportNudge(store, state);
    if (!show) return;

    const language = useLanguageStore.getState().language;
    const t = (key) => translate(language, `supportNudge.${key}`);
    track('support_nudge_view', { source });
    toast.info(t('title'), {
        key: 'support-nudge',
        description: t('description'),
        spriteUrl: getPokemonFrontSpriteUrl(GENGAR_ID),
        duration: 9000,
        actions: [{
            label: t('cta'),
            onClick: () => {
                writeSupportNudge(store, { ...readSupportNudge(store), supported: true });
                track('support_nudge_click', { source });
                window.open(SUPPORT_URL, '_blank', 'noopener,noreferrer');
            },
        }],
    });
}
