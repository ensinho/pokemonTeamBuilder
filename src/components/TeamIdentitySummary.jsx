import React, { useMemo } from 'react';

/**
 * TeamIdentitySummary — three at-a-glance badges describing the
 * current team: average BST, type diversity, and offensive role mix
 * (physical / special / mixed) inferred from base stats.
 *
 * Renders nothing for an empty team. Pure presentation; no side effects.
 */
export function TeamIdentitySummary({ team }) {
    const stats = useMemo(() => {
        if (!team || team.length === 0) return null;

        let bstSum = 0;
        let bstCount = 0;
        const typeSet = new Set();
        let physical = 0;
        let special = 0;
        let mixed = 0;

        for (const p of team) {
            (p.types || []).forEach((t) => typeSet.add(t));

            // BST = sum of 6 base stats. p.stats may be either array {name,base_stat}
            // or an object map. Tolerate both.
            let atk = 0;
            let spa = 0;
            let bst = 0;
            if (Array.isArray(p.stats)) {
                p.stats.forEach((s) => {
                    bst += s.base_stat || 0;
                    if (s.name === 'attack') atk = s.base_stat || 0;
                    if (s.name === 'special-attack') spa = s.base_stat || 0;
                });
            } else if (p.stats && typeof p.stats === 'object') {
                Object.entries(p.stats).forEach(([k, v]) => {
                    bst += v || 0;
                    if (k === 'attack') atk = v || 0;
                    if (k === 'special-attack' || k === 'specialAttack') spa = v || 0;
                });
            }
            if (bst > 0) {
                bstSum += bst;
                bstCount += 1;
            }
            if (atk || spa) {
                const diff = atk - spa;
                if (diff > 15) physical += 1;
                else if (diff < -15) special += 1;
                else mixed += 1;
            }
        }

        const avgBst = bstCount ? Math.round(bstSum / bstCount) : null;
        let bstLabel = '—';
        if (avgBst !== null) {
            if (avgBst >= 580) bstLabel = 'Elite';
            else if (avgBst >= 500) bstLabel = 'Strong';
            else if (avgBst >= 420) bstLabel = 'Balanced';
            else bstLabel = 'Light';
        }

        let leanLabel = '—';
        if (physical || special || mixed) {
            if (physical > special && physical > mixed) leanLabel = 'Physical';
            else if (special > physical && special > mixed) leanLabel = 'Special';
            else leanLabel = 'Mixed';
        }

        return {
            avgBst,
            bstLabel,
            typeCount: typeSet.size,
            leanLabel,
            physical,
            special,
            mixed,
        };
    }, [team]);

    if (!stats) return null;

    return (
        <div className="grid grid-cols-3 gap-2 mt-4" aria-label="Team identity summary">
            <Badge label="Avg BST" value={stats.avgBst ?? '—'} hint={stats.bstLabel} />
            <Badge label="Types" value={stats.typeCount} hint={stats.typeCount >= 5 ? 'Diverse' : stats.typeCount >= 3 ? 'OK' : 'Narrow'} />
            <Badge label="Lean" value={stats.leanLabel} hint={`${stats.physical}/${stats.special}/${stats.mixed}`} />
        </div>
    );
}

function Badge({ label, value, hint }) {
    return (
        <div className="rounded-lg p-2 text-center bg-surface-raised">
            <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">{label}</p>
            <p className="text-base font-bold text-fg leading-tight">{value}</p>
            {hint && <p className="text-[10px] text-muted">{hint}</p>}
        </div>
    );
}
