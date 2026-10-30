import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { rateTeam, RATING_TONE } from '../utils/teamAnalysis';

/**
 * The team's grade, drawn the same way wherever a team is graded — the phone
 * analysis chip, the desktop composer, the saved-team page. All three read
 * `rateTeam`; until 2026-10 each had its own formula and one roster could be
 * "Arriscado", "Strong" and 72 at once.
 *
 * `compact` drops the box for use inside another control (the phone chip).
 */
export function TeamRatingBadge({ score, grade, compact = false, className = '' }) {
    const { t } = useTranslation();
    const label = t(`builder.grade.${grade}`);
    return (
        <span
            className={`team-rating ${compact ? 'team-rating--compact' : ''} ${className}`}
            style={{ '--tone': `var(--color-${RATING_TONE[grade] || 'muted'})` }}
            aria-label={grade === 'building' ? label : t('builder.ratingAria', { score, grade: label })}
        >
            <span className="team-rating__dot" aria-hidden="true" />
            {grade !== 'building' && <span className="team-rating__score" aria-hidden="true">{score}</span>}
            <span className="team-rating__label" aria-hidden="true">{label}</span>
        </span>
    );
}

/**
 * TeamIdentitySummary — three readouts for the team being built: its rating
 * (the shared `rateTeam`), average BST, and offensive lean (physical / special
 * / mixed) inferred from base stats.
 *
 * Renders nothing for an empty team. Pure presentation; no side effects.
 */
export function TeamIdentitySummary({ team, analysis }) {
    const { t } = useTranslation();

    const stats = useMemo(() => {
        if (!team || team.length === 0) return null;

        let bstSum = 0;
        let bstCount = 0;
        let physical = 0;
        let special = 0;
        let mixed = 0;

        for (const p of team) {
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

        let lean = null;
        if (physical || special || mixed) {
            if (physical > special && physical > mixed) lean = 'leanPhysical';
            else if (special > physical && special > mixed) lean = 'leanSpecial';
            else lean = 'leanMixed';
        }

        return {
            avgBst: bstCount ? Math.round(bstSum / bstCount) : null,
            lean,
            physical,
            special,
            mixed,
        };
    }, [team]);

    const rating = useMemo(() => rateTeam(analysis, team?.length || 0), [analysis, team]);

    if (!stats) return null;

    // One raised strip of three readouts (v3) — the team's numbers in the
    // instrument voice, the way the Pokédex reads out a Pokémon.
    return (
        <dl className="stat-group stat-group--3 tb-identity" aria-label={t('builder.identityAria')}>
            <div className="stat stat--sm">
                <dt className="stat__label">
                    {t('builder.rating')}
                    {/* The formula, in words (/methodology). */}
                    <Link to="/methodology" className="tb-identity__how" aria-label={t('builder.ratingHow')} title={t('builder.ratingHow')}>
                        <Info aria-hidden="true" />
                    </Link>
                </dt>
                <dd className="stat__value" style={{ color: `color-mix(in srgb, var(--color-${RATING_TONE[rating.grade]}) 70%, var(--color-fg))` }}>{rating.score}</dd>
                <dd className="tb-identity__hint">{t(`builder.grade.${rating.grade}`)}</dd>
            </div>
            <Stat label={t('builder.bst')} value={stats.avgBst ?? '—'} />
            <Stat
                label={t('builder.lean')}
                value={stats.lean ? t(`builder.${stats.lean}`) : '—'}
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
