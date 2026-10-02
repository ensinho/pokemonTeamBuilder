import React, { useMemo } from 'react';
import { useTranslation } from '../hooks/useTranslation';

/**
 * TeamIdentitySummary — three at-a-glance badges describing the
 * current team: average BST, type diversity, and offensive role mix
 * (physical / special / mixed) inferred from base stats.
 *
 * Renders nothing for an empty team. Pure presentation; no side effects.
 */
export function TeamIdentitySummary({ team }) {
    const { language } = useTranslation();
    
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

    const getBstHint = (label, lang) => {
        if (lang === 'pt') {
            if (label === 'Strong') return 'Forte';
            if (label === 'Balanced') return 'Equilibrado';
            if (label === 'Light') return 'Leve';
            return label;
        }
        return label;
    };

    const getTypesHint = (label, lang) => {
        if (lang === 'pt') {
            if (label === 'Diverse') return 'Diverso';
            if (label === 'Narrow') return 'Limitado';
            return label;
        }
        return label;
    };

    const getLeanHint = (label, lang) => {
        if (lang === 'pt') {
            if (label === 'Physical') return 'Físico';
            if (label === 'Special') return 'Especial';
            if (label === 'Mixed') return 'Misto';
            return label;
        }
        return label;
    };

    // One raised strip of three readouts (v3) — the team's numbers in the
    // instrument voice, the way the Pokédex reads out a Pokémon. It used to be
    // three pills, each a box with its own fill, centred under the slots.
    return (
        <dl className="stat-group stat-group--3 tb-identity" aria-label="Team identity summary">
            <Stat
                label="BST"
                value={stats.avgBst ?? '—'}
                hint={stats.avgBst !== null ? getBstHint(stats.bstLabel, language) : undefined}
            />
            <Stat
                label={language === 'pt' ? 'Tipos' : 'Types'}
                value={stats.typeCount}
                hint={getTypesHint(stats.typeCount >= 5 ? 'Diverse' : stats.typeCount >= 3 ? 'OK' : 'Narrow', language)}
            />
            <Stat
                label={language === 'pt' ? 'Foco' : 'Lean'}
                value={getLeanHint(stats.leanLabel, language)}
                hint={`${stats.physical}/${stats.special}/${stats.mixed}`}
            />
        </dl>
    );
}

function Stat({ label, value, hint }) {
    return (
        <div className="stat stat--sm">
            <dt className="stat__label">{label}</dt>
            <dd className="stat__value">{value}</dd>
            {hint && <dd className="tb-identity__hint">{hint}</dd>}
        </div>
    );
}
