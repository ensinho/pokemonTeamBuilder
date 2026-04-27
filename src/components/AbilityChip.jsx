import { useCallback, useRef, useState } from 'react';

export const AbilityChip = ({ ability }) => {
    const [description, setDescription] = useState('');
    const [isTooltipVisible, setTooltipVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const touchTimeout = useRef(null);

    const fetchAbilityDescription = useCallback(async () => {
        if (description || isLoading) return;
        setIsLoading(true);
        try {
            const res = await fetch(ability.url);
            const data = await res.json();
            const effectEntry = data.effect_entries.find((entry) => entry.language.name === 'en');
            setDescription(effectEntry?.short_effect || 'No description available.');
        } catch {
            setDescription('Could not load description.');
        } finally {
            setIsLoading(false);
        }
    }, [ability.url, description, isLoading]);

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

    return (
        <span
            className="relative capitalize text-fg inline-block bg-surface-raised px-3 py-1 rounded-full text-sm cursor-pointer"
            onMouseEnter={show}
            onMouseLeave={hide}
            onFocus={show}
            onBlur={hide}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            tabIndex={0}
        >
            {ability.name.replace('-', ' ')}
            {isTooltipVisible && (
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-surface text-fg text-xs rounded-md shadow-lg z-20 border border-border">
                    {isLoading ? 'Loading...' : description}
                </span>
            )}
        </span>
    );
};
