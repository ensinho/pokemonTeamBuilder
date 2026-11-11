import React from 'react';
import { useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import '../../styles/entity-detail-view.css';
import '../../styles/reference-views.css';

import { getMovePageData } from '../../services/pokemonDataCache';
import { useEntityPageData } from '../../hooks/useEntityPageData';
import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { generationNumeral } from '../../utils/gameVersions';
import { useSmartBack } from '../../hooks/useEntityNavigate';
import { titleCaseSlug } from '../../utils/smogonSets';
import { EmptyState } from '../EmptyState';
import { EntityHolders } from '../entity/EntityHolders';
import { GameDescriptions } from '../entity/GameDescriptions';
import { TypeChip } from '../TypeChip';
import { Loader } from '../Loader';

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
    const { t, language } = useTranslation();

    const slug = String(name || '').toLowerCase();
    const { status, data } = useEntityPageData(slug, getMovePageData);

    const displayName = titleCaseSlug(slug);
    useDocumentMeta({
        name: displayName,
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

    // Breadcrumb-trail back: returns to wherever the move was clicked (a Pokémon
    // page, a tournament team, the meta view, …) without breaking that page's
    // own back button; falls back to the moves list on a cold deep link.
    const { goBack: handleBack, backLabel } = useSmartBack('/moves', language === 'pt', t('db.backToMoves'));

    if (status === 'loading') {
        return (
            <Loader size="lg" scene="pokedex" block />
        );
    }

    if (status === 'missing') {
        return (
            <EmptyState mascot="lost"
                title={t('db.noMatchesTitle')}
                message={t('db.detailNotFoundDesc')}
                action={{ label: backLabel, onClick: handleBack }}
            />
        );
    }

    const stats = [
        { label: t('db.colPower'), value: data.power ?? '—', figure: true },
        { label: t('db.colAccuracy'), value: typeof data.accuracy === 'number' ? `${data.accuracy}%` : '—', figure: true },
        { label: t('db.colPP'), value: data.pp ?? '—', figure: true },
        { label: t('db.priority'), value: data.priority > 0 ? `+${data.priority}` : data.priority, figure: true },
        { label: t('db.target'), value: data.target ? data.target.replace(/-/g, ' ') : '—' },
    ];

    const hasHolders = data.learnedBy.length > 0;
    const hasLongEffect = Boolean(data.effectLong && data.effectLong !== data.effect);
    const hasLeft = hasLongEffect || data.flavorTexts.length > 0;

    return (
        <div className="edv edv--entity">
            <button type="button" className="edv-back" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4" /> {backLabel}
            </button>

            <header className="edv-header">
                <div className="edv-kicker">
                    <span>{t('db.moveTag')}</span>
                    {data.generation && <span>· {t('db.generationLabel', { num: generationNumeral(data.generation) })}</span>}
                </div>
                <h1 className="edv-title">{displayName}</h1>
                {data.effect && <p className="edv-lead">{data.effect}</p>}
                <div className="edv-badges">
                    {data.type && <TypeChip type={data.type} />}
                    {data.damage_class && (
                        <span className={`ref-cat ${CATEGORY_CLASS[data.damage_class] || ''}`}>
                            {t(`db.${data.damage_class}`)}
                        </span>
                    )}
                </div>
                {/* The move's numbers as one readout: figure over its word. */}
                <dl className="edv-figures">
                    {stats.map((s) => (
                        <div key={s.label} className="edv-figure">
                            <dd className={s.figure ? 'figure' : ''}>{s.value}</dd>
                            <dt>{s.label}</dt>
                        </div>
                    ))}
                </dl>
            </header>

            <div className={`edv-main ${hasHolders && hasLeft ? '' : 'edv-main--single'}`}>
                {hasLeft && (
                    <div className="edv-col">
                        {hasLongEffect && (
                            <section className="edv-section">
                                <h2 className="edv-section__title">{t('db.effectHeading')}</h2>
                                <p className="edv-effect">{data.effectLong}</p>
                            </section>
                        )}
                        <GameDescriptions groups={data.flavorTexts} />
                    </div>
                )}

                {hasHolders && (
                    <section className="edv-section">
                        <h2 className="edv-section__title">
                            {t('db.learnedBy')} <span className="count-badge">{data.learnedBy.length}</span>
                        </h2>
                        <EntityHolders
                            ariaLabel={t('db.learnedBy')}
                            groups={[{ id: 'all', label: t('db.learnedBy'), pokemons: data.learnedBy }]}
                        />
                    </section>
                )}
            </div>
        </div>
    );
}
