import { useMemo } from 'react';
import { useUsageFormat, useUsageIndex } from './useUsageStats';
import { mostUsedBuild } from '../utils/mostUsedBuild';

/**
 * `{ data, format }` for a Pokémon's most used build in the default format
 * (utils/mostUsedBuild.js), or null when it is outside the sample.
 */
export function useMostUsedBuild(pokemonId) {
    const { defaultFormatId } = useUsageIndex();
    const { byId, format } = useUsageFormat(defaultFormatId);
    return useMemo(() => {
        const data = mostUsedBuild(byId?.[pokemonId]);
        return data ? { data, format: format?.label || defaultFormatId } : null;
    }, [byId, pokemonId, format, defaultFormatId]);
}
