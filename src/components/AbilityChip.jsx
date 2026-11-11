import { useCallback, useRef, useState } from 'react';
import { getAbilityDescription } from '../services/pokemonDataCache';
import { openAbilityDialog } from '../store/useAbilityDialogStore';

export const AbilityChip = ({ ability, onBeforeNavigate }) => {
    const abilityResource = ability?.ability || ability;
    const abilityName = typeof abilityResource === 'string' ? abilityResource : abilityResource?.name || '';
    const [description, setDescription] = useState('');
    const [isTooltipVisible, setTooltipVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const touchTimeout = useRef(null);

    const fetchAbilityDescription = useCallback(async () => {
        if (description || isLoading || !abilityName) return;
        setIsLoading(true);
        try {
            setDescription(await getAbilityDescription(abilityResource));
        } catch {
            setDescription('Could not load description.');
        } finally {
            setIsLoading(false);
        }
    }, [abilityResource, abilityName, description, isLoading]);

    const show = () => {
        fetchAbilityDescription();
        setTooltipVisible(true);
    };
    const hide = () => setTooltipVisible(false);

    const handleTouchStart = () => {
        fetchAbilityDescription();
        touchTimeout.current = setTimeout(() => setTooltipVisible(true), 300);
    };
    const handleTouchEnd = () => {
        clearTimeout(touchTimeout.current);
        setTimeout(() => setTooltipVisible(false), 2000);
    };

    // Hover previews the short description; a click opens the ability's
    // dialog over the page — the reader stays on the Pokémon they were on
    // (it used to navigate away to /abilities/:name). `onBeforeNavigate` now
    // runs only if they follow a link out of that dialog.
    const open = (e) => {
        if (!abilityName) return;
        e.stopPropagation();
        setTooltipVisible(false);
        openAbilityDialog(abilityName, onBeforeNavigate);
    };

    return (
        <button
            type="button"
            aria-haspopup="dialog"
            className="relative capitalize text-fg inline-block bg-surface-raised px-3 py-1 rounded-full text-sm cursor-pointer transition-colors hover:bg-surface-hover hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={open}
            onMouseEnter={show}
            onMouseLeave={hide}
            onFocus={show}
            onBlur={hide}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {abilityName.replace(/-/g, ' ')}
            {isTooltipVisible && (
                <span role="tooltip" className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-surface text-fg text-xs font-normal normal-case text-left rounded-md shadow-lg z-20 border border-border">
                    {isLoading ? 'Loading...' : description}
                </span>
            )}
        </button>
    );
};
