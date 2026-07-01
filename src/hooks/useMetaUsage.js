import { useMemo } from 'react';
import { useUsageIndex, useUsageFormat } from './useUsageStats';

// The current-meta usage ranking (default regulation, e.g. Champions VGC Reg M-B)
// exposed in a `popular`-compatible shape so the Team Builder suggestions and the
// Home VGC card can rank by REAL Smogon ladder usage instead of the thin 120-team
// tournament sample. Built on the shared usage hooks — no extra fetch.
export function useMetaUsage() {
    const { defaultFormatId, month, status: idxStatus } = useUsageIndex();
    const { byId, format, status: fmtStatus } = useUsageFormat(defaultFormatId);

    const ranked = useMemo(() => {
        if (!byId) return [];
        return Object.entries(byId)
            .map(([id, e]) => ({ id: Number(id), name: e.name, count: Math.round(e.usage || 0) }))
            .sort((a, b) => b.count - a.count);
    }, [byId]);

    // id → usage% weight, for the suggestion engine's meta signals.
    const usageMap = useMemo(() => new Map(ranked.map((r) => [r.id, r.count])), [ranked]);

    return {
        ranked,
        byId: byId || {},
        usageMap,
        format,
        month,
        status: idxStatus === 'loading' || fmtStatus === 'loading' ? 'loading' : 'ready',
    };
}
