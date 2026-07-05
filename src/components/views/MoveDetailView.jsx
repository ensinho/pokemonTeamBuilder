import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import '../../styles/entity-detail-view.css';
import '../../styles/reference-views.css';

import { getMovePageData } from '../../services/pokemonDataCache';
import { useEntityPageData } from '../../hooks/useEntityPageData';
import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { formatVersionGroup, generationNumeral } from '../../utils/gameVersions';
import { backLabelFor } from '../../utils/backNavigation';
import { titleCaseSlug } from '../../utils/smogonSets';
import { EmptyState } from '../EmptyState';
import { PokemonLinkChips } from '../PokemonLinkChips';
import { TypeBadge } from '../TypeBadge';
import { PokeballIcon } from '../icons';

const CATEGORY_CLASS = {
    physical: 'ref-cat--physical',
    special: 'ref-cat--special',
    status: 'ref-cat--status',
};

/**
 * Bulbapedia-style reference page for a single move (/moves/:name): battle
 * data, effect, per-game descriptions, and every Pokémon that learns it.
 */
export function MoveDetailView() {
    const { name } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { t, language } = useTranslation();

    const slug = String(name || '').toLowerCase();
    const { status, data } = useEntityPageData(slug, getMovePageData);

    const displayName = titleCaseSlug(slug);
    useDocumentMeta({
        title: `${displayName} (${t('db.moveTag')})`,
        description: data
            ? [
                `${displayName} — ${data.type ? `${titleCaseSlug(data.type)}-type ` : ''}${data.damage_class || ''} move.`,
                typeof data.power === 'number' ? `${data.power} power.` : '',
                typeof data.accuracy === 'number' ? `${data.accuracy}% accuracy.` : '',
                data.effect,
            ].filter(Boolean).join(' ')
            : `${displayName} — move data, effect, game descriptions, and every Pokémon that learns it.`,
        path: `/moves/${slug}`,
    });

    // Dynamic "go back": return to wherever the move was clicked (a Pokémon
    // page, a tournament team, the meta view, …), falling back to history and
    // finally the moves list on a cold deep link.
    const fromPath = location.state?.from || '';
    const handleBack = () => {
        if (fromPath) navigate(fromPath);
        else if (location.key && location.key !== 'default') navigate(-1);
        else navigate('/moves');
    };
    const backLabel = backLabelFor(fromPath, language === 'pt', t('db.backToMoves'));

    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center" style={{ minHeight: '50vh', color: 'var(--color-primary)' }} role="status" aria-label="Loading">
                <PokeballIcon className="w-14 h-14 animate-spin opacity-70" />
            </div>
        );
    }

    if (status === 'missing') {
        return (
            <EmptyState
                title={t('db.noMatchesTitle')}
                message={t('db.detailNotFoundDesc')}
                action={{ label: backLabel, onClick: handleBack }}
            />
        );
    }

    const stats = [
        { label: t('db.colPower'), value: data.power ?? '—' },
        { label: t('db.colAccuracy'), value: typeof data.accuracy === 'number' ? `${data.accuracy}%` : '—' },
        { label: t('db.colPP'), value: data.pp ?? '—' },
        { label: t('db.priority'), value: data.priority > 0 ? `+${data.priority}` : data.priority },
        { label: t('db.target'), value: data.target ? data.target.replace(/-/g, ' ') : '—' },
    ];

    const hasDescriptions = data.flavorTexts.length > 0;

    return (
        <div className="edv">
            <button type="button" className="edv-back" onClick={handleBack}>
                ← {backLabel}
            </button>

            <div className={`edv-main ${hasDescriptions ? '' : 'edv-main--single'}`}>
                <div className="edv-col">
                    <header className="edv-header">
                        <div className="edv-kicker">
                            <span>{t('db.moveTag')}</span>
                            {data.generation && <span>· {t('db.generationLabel', { num: generationNumeral(data.generation) })}</span>}
                        </div>
                        <h1 className="edv-title">{displayName}</h1>
                        {data.effect && <p className="edv-lead">{data.effect}</p>}
                        <div className="edv-badges">
                            {data.type && <TypeBadge type={data.type} />}
                            {data.damage_class && (
                                <span className={`ref-cat ${CATEGORY_CLASS[data.damage_class] || ''}`}>
                                    {t(`db.${data.damage_class}`)}
                                </span>
                            )}
                        </div>
                    </header>

                    <div className="edv-stats">
                        {stats.map((s) => (
                            <div key={s.label} className="edv-stat">
                                <span className="edv-stat__label">{s.label}</span>
                                <span className="edv-stat__value">{s.value}</span>
                            </div>
                        ))}
                    </div>

                    {data.effectLong && data.effectLong !== data.effect && (
                        <section className="edv-section">
                            <h2 className="edv-section__title">{t('db.effectHeading')}</h2>
                            <p className="edv-effect">{data.effectLong}</p>
                        </section>
                    )}
                </div>

                {hasDescriptions && (
                    <div className="edv-col">
                        <section className="edv-section">
                            <h2 className="edv-section__title">{t('db.gameDescriptions')}</h2>
                            <div className="edv-table-wrap">
                                <table className="edv-table">
                                    <thead>
                                        <tr>
                                            <th>{t('db.colGames')}</th>
                                            <th>{t('db.colDescription')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.flavorTexts.map((group) => (
                                            <tr key={group.text}>
                                                <td className="edv-table__games">
                                                    {group.versions.map((v) => <span key={v}>{formatVersionGroup(v)}</span>)}
                                                </td>
                                                <td className="edv-table__text">{group.text}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                )}
            </div>

            {data.learnedBy.length > 0 && (
                <section className="edv-section">
                    <h2 className="edv-section__title">{t('db.learnedBy')} · {data.learnedBy.length}</h2>
                    <PokemonLinkChips pokemons={data.learnedBy} cap={60} />
                </section>
            )}
        </div>
    );
}
