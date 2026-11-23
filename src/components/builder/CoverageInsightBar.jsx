import React, { useMemo } from 'react';
import { typeChartFor } from '../../utils/teamAnalysis';
import { useTranslation } from '../../hooks/useTranslation';

// Prominent offensive threats used to break ties when picking the most relevant
// unresisted type to highlight in the insight list.
const UNRESISTED_PRIORITY = [
    'fairy', 'ground', 'ice', 'fighting', 'ghost', 'dragon',
    'fire', 'water', 'electric', 'rock', 'dark', 'steel',
    'flying', 'psychic', 'grass', 'poison', 'bug', 'normal',
];

const capType = (type) => type.charAt(0).toUpperCase() + type.slice(1);

/**
 * Computes a proportional coverage breakdown (resisted / neutral / unresisted /
 * critical weakness) plus up to 4 actionable summary insights from `teamAnalysis`.
 */
function buildCoverageInsight(teamAnalysis, legacyTypes = false) {
    const chart = typeChartFor(legacyTypes);
    const allTypes = Object.keys(chart);
    const total = allTypes.length;

    const weaknesses = teamAnalysis?.weaknesses || {};
    const defensiveCoverage = teamAnalysis?.defensiveCoverage || {};
    const strengthsRaw = teamAnalysis?.strengths;
    const strengths = strengthsRaw instanceof Set
        ? strengthsRaw
        : new Set(Array.isArray(strengthsRaw) ? strengthsRaw : []);

    let criticalCount = 0;
    let resistedCount = 0;
    let neutralCount = 0;
    let unresistedCount = 0;

    const unresistedTypes = [];

    for (const type of allTypes) {
        const isWeak = (weaknesses[type] || 0) > 0;
        const resistCount = defensiveCoverage[type] || 0;
        const isStrongOff = strengths.has(type);

        if (isWeak) {
            criticalCount += 1;
        } else if (resistCount > 0) {
            resistedCount += 1;
        } else if (isStrongOff) {
            neutralCount += 1;
        } else {
            unresistedCount += 1;
        }

        if (resistCount === 0) {
            unresistedTypes.push(type);
        }
    }

    // 1. Top critical weakness
    const weakEntries = Object.entries(weaknesses)
        .filter(([, count]) => count > 0)
        .sort(([aType, aCount], [bType, bCount]) => bCount - aCount || aType.localeCompare(bType));
    const topWeak = weakEntries[0] || null;

    // 2. Top unresisted type (avoid repeating topWeak if another unresisted type exists)
    const unresistedPool = unresistedTypes
        .filter((type) => !topWeak || type !== topWeak[0])
        .sort((a, b) => {
            const aUncovered = strengths.has(a) ? 1 : 0;
            const bUncovered = strengths.has(b) ? 1 : 0;
            if (aUncovered !== bUncovered) return aUncovered - bUncovered;
            return UNRESISTED_PRIORITY.indexOf(a) - UNRESISTED_PRIORITY.indexOf(b);
        });
    const topUnresisted = unresistedPool[0] || (!topWeak ? unresistedTypes[0] : null) || null;

    // 3. Best defensively covered type
    const resistEntries = Object.entries(defensiveCoverage)
        .filter(([type, count]) => count > 0 && !weaknesses[type])
        .sort(([aType, aCount], [bType, bCount]) => bCount - aCount || aType.localeCompare(bType));
    const topResist = resistEntries[0] || Object.entries(defensiveCoverage)
        .filter(([, count]) => count > 0)
        .sort(([aType, aCount], [bType, bCount]) => bCount - aCount || aType.localeCompare(bType))[0] || null;

    // 4. Recommended counter type to add next
    let bestSuggest = null;
    let bestScore = 0;

    for (const candidate of allTypes) {
        const entry = chart[candidate];
        if (!entry) continue;
        let score = 0;

        for (const [wType, wCount] of weakEntries) {
            const mult = entry.damageTaken?.[capType(wType)] ?? 1;
            if (mult === 0) score += wCount * 5;
            else if (mult < 1) score += wCount * 4;
            else if (mult > 1) score -= wCount * 3;
        }

        for (const uType of unresistedTypes) {
            const mult = entry.damageTaken?.[capType(uType)] ?? 1;
            if (mult < 1) score += 1.5;
        }

        for (const tType of allTypes) {
            if (!strengths.has(tType)) {
                const dealt = entry.damageDealt?.[capType(tType)] ?? 1;
                if (dealt > 1) score += 1;
            }
        }

        if (score > bestScore) {
            bestScore = score;
            bestSuggest = candidate;
        }
    }

    const covered = resistedCount + neutralCount;

    return {
        total,
        covered,
        segments: [
            { id: 'resisted', count: resistedCount, tone: 'success' },
            { id: 'neutral', count: neutralCount, tone: 'primary' },
            { id: 'unresisted', count: unresistedCount, tone: 'warning' },
            { id: 'critical', count: criticalCount, tone: 'danger' },
        ].filter((seg) => seg.count > 0),
        topWeak,
        topUnresisted,
        topResist,
        suggestedType: bestSuggest,
    };
}

export function CoverageInsightBar({
    teamAnalysis,
    teamSize = 0,
    legacyTypes = false,
    onFilterType,
    className = '',
}) {
    const { t } = useTranslation();

    const insight = useMemo(
        () => (teamSize > 0 ? buildCoverageInsight(teamAnalysis, legacyTypes) : null),
        [teamAnalysis, teamSize, legacyTypes],
    );

    const typeLabel = (type) => t(`types.${type}`, { defaultValue: type });

    if (teamSize === 0 || !insight) {
        return (
            <div className={`tb-insight tb-insight--empty ${className}`.trim()}>
                <div className="tb-insight__head">
                    <span className="tb-insight__title">{t('markedUi.builder.insightTitle')}</span>
                </div>
                <p className="tb-insight__empty">{t('markedUi.builder.insightEmpty')}</p>
            </div>
        );
    }

    const isStrongCoverage = insight.covered >= Math.round(insight.total * 0.65);

    return (
        <div className={`tb-insight ${className}`.trim()}>
            <div className="tb-insight__head">
                <span className="tb-insight__title">{t('markedUi.builder.insightTitle')}</span>
                <span className={`tb-insight__count ${isStrongCoverage ? 'is-strong' : ''}`}>
                    {t('markedUi.builder.insightCoveredTypes', { covered: insight.covered, total: insight.total })}
                </span>
            </div>

            <div
                className="tb-insight__bar"
                role="img"
                aria-label={`${t('markedUi.builder.insightTitle')}: ${t('markedUi.builder.insightCoveredTypes', { covered: insight.covered, total: insight.total })}`}
            >
                {insight.segments.map((seg) => (
                    <span
                        key={seg.id}
                        className={`tb-insight__seg tb-insight__seg--${seg.tone}`}
                        style={{ flexGrow: seg.count }}
                    />
                ))}
            </div>

            <ul className="tb-insight__rows">
                {insight.topWeak && (
                    <li className="tb-insight__row">
                        <span className="tb-insight__dot tb-insight__dot--danger" aria-hidden="true" />
                        <span className="tb-insight__label">
                            {t('markedUi.builder.insightWeakCritical', { type: typeLabel(insight.topWeak[0]) })}
                        </span>
                        <span className="tb-insight__meta tb-insight__meta--danger">
                            {t('markedUi.builder.insightWeakCount', { count: insight.topWeak[1] })}
                        </span>
                    </li>
                )}

                {insight.topUnresisted && (
                    <li className="tb-insight__row">
                        <span className="tb-insight__dot tb-insight__dot--warning" aria-hidden="true" />
                        <span className="tb-insight__label">
                            {t('markedUi.builder.insightUnresisted', { type: typeLabel(insight.topUnresisted) })}
                        </span>
                        <span className="tb-insight__meta">
                            {t('markedUi.builder.insightNoResist')}
                        </span>
                    </li>
                )}

                {insight.topResist && (
                    <li className="tb-insight__row">
                        <span className="tb-insight__dot tb-insight__dot--success" aria-hidden="true" />
                        <span className="tb-insight__label">
                            {t('markedUi.builder.insightStrong', { type: typeLabel(insight.topResist[0]) })}
                        </span>
                        <span className="tb-insight__meta tb-insight__meta--success">
                            {t('markedUi.builder.insightResistCount', { count: insight.topResist[1] })}
                        </span>
                    </li>
                )}

                {insight.suggestedType && (
                    <li className="tb-insight__row">
                        <span className="tb-insight__dot tb-insight__dot--primary" aria-hidden="true" />
                        <span className="tb-insight__label">
                            {t('markedUi.builder.insightSuggest', { type: typeLabel(insight.suggestedType) })}
                        </span>
                        {onFilterType && (
                            <button
                                type="button"
                                className="tb-insight__cta"
                                onClick={() => onFilterType(insight.suggestedType)}
                            >
                                {t('markedUi.builder.insightFilterCta')}
                            </button>
                        )}
                    </li>
                )}
            </ul>
        </div>
    );
}

export default CoverageInsightBar;
