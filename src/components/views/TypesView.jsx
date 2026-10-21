import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import '../../styles/entity-detail-view.css';
import '../../styles/reference-views.css';
import '../../styles/types-view.css';

import { typeIcons } from '../../constants/types';
import { loadPokemonIndex } from '../../services/pokemonDataCache';
import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { useSmartBack } from '../../hooks/useEntityNavigate';
import { getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { TYPE_IDS, offensiveMultiplier, typeMatchups } from '../../utils/typeMatchups';
import { pageMeta } from '../../utils/seoPages';
import { titleCaseSlug } from '../../utils/smogonSets';
import { TypeChip } from '../TypeChip';
import { EmptyState } from '../EmptyState';
import { Loader } from '../Loader';

/**
 * The type chart (/types) and one page per type (/types/:type), added
 * 2026-10-21 for search: "tabela de tipos" and "fraqueza do tipo X" are among
 * the most searched Pokémon questions, and the app had the answer only inside
 * the builder. Every type and Pokémon here is a real link, so a crawler can
 * walk from the chart to all 18 types and from each type to its Pokémon.
 */

const MULTIPLIER_LABEL = { 0: '0', 0.5: '½', 2: '2' };

/** A type chip that is a link to that type's page. */
const TypeLink = ({ type, size }) => (
    <Link to={`/types/${type}`} className="types-link">
        <TypeChip type={type} size={size} />
    </Link>
);

const usePokemonIndex = () => {
    const [index, setIndex] = useState(null);
    useEffect(() => {
        let alive = true;
        loadPokemonIndex()
            .then((list) => { if (alive) setIndex(list); })
            .catch(() => { if (alive) setIndex([]); });
        return () => { alive = false; };
    }, []);
    return index;
};

export function TypesView() {
    const { t } = useTranslation();
    useDocumentMeta({ path: '/types' });

    return (
        <div className="edv types-view">
            <header className="edv-header">
                <h1 className="edv-title">{t('typesPage.title')}</h1>
                <p className="edv-lead">{t('typesPage.lede')}</p>
                <nav className="types-grid" aria-label={t('typesPage.allTypes')}>
                    {TYPE_IDS.map((type) => <TypeLink key={type} type={type} />)}
                </nav>
            </header>

            <section className="edv-section">
                <h2 className="edv-section__title">{t('typesPage.matrixHint')}</h2>
                <div className="types-matrix-wrap custom-scrollbar">
                    <table className="types-matrix">
                        <thead>
                            <tr>
                                <th scope="col" className="types-matrix__corner">
                                    <span>{t('typesPage.attacking')} ↓</span>
                                    <span>{t('typesPage.defending')} →</span>
                                </th>
                                {TYPE_IDS.map((type) => (
                                    <th key={type} scope="col" title={t(`types.${type}`)}>
                                        <img src={typeIcons[type]} alt={t(`types.${type}`)} className="types-matrix__icon" />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {TYPE_IDS.map((attacker) => (
                                <tr key={attacker}>
                                    <th scope="row">
                                        <Link to={`/types/${attacker}`} className="types-matrix__row-head">
                                            <img src={typeIcons[attacker]} alt="" aria-hidden="true" className="types-matrix__icon" />
                                            <span>{t(`types.${attacker}`)}</span>
                                        </Link>
                                    </th>
                                    {TYPE_IDS.map((defender) => {
                                        const m = offensiveMultiplier(attacker, defender);
                                        const tone = m > 1 ? 'super' : m === 0 ? 'none' : m < 1 ? 'weak' : 'neutral';
                                        return (
                                            <td
                                                key={defender}
                                                className={`types-matrix__cell types-matrix__cell--${tone}`}
                                                title={`${t(`types.${attacker}`)} → ${t(`types.${defender}`)}: ${m}×`}
                                            >
                                                {MULTIPLIER_LABEL[m] || ''}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

const MatchupRow = ({ label, types, none }) => (
    <div className="types-matchup">
        <dt className="types-matchup__label">{label}</dt>
        <dd className="types-matchup__types">
            {types.length ? types.map((type) => <TypeLink key={type} type={type} size="sm" />) : <span className="types-matchup__none">{none}</span>}
        </dd>
    </div>
);

const SHOWN_AT_FIRST = 60;

export function TypeDetailView() {
    const { type: param } = useParams();
    const { t, language } = useTranslation();
    const type = String(param || '').toLowerCase();
    const isType = TYPE_IDS.includes(type);
    const index = usePokemonIndex();
    const [showAll, setShowAll] = useState(false);
    const { goBack, backLabel } = useSmartBack('/types', language === 'pt', t('typesPage.allTypes'));

    useDocumentMeta({ path: `/types/${type}` });

    const matchups = useMemo(() => (isType ? typeMatchups(type) : null), [isType, type]);
    // Base forms only, like the prerendered page: a Mega's slug is not a page
    // name anyone searches for, and it would double the list.
    const pokemons = useMemo(
        () => (index || []).filter((p) => p.id <= 1025 && p.types.includes(type)),
        [index, type],
    );

    useEffect(() => { setShowAll(false); }, [type]);

    if (!isType) {
        return (
            <EmptyState
                title={t('db.noMatchesTitle')}
                message={t('typesPage.notFound', { type: param })}
                action={{ label: backLabel, onClick: goBack }}
            />
        );
    }

    const typeLabel = t(`types.${type}`);
    const none = t('typesPage.none');
    const shown = showAll ? pokemons : pokemons.slice(0, SHOWN_AT_FIRST);

    return (
        <div className="edv types-view">
            <button type="button" className="edv-back" onClick={goBack}>
                <ChevronLeft className="h-4 w-4" /> {backLabel}
            </button>

            <header className="edv-header">
                <div className="edv-kicker"><TypeChip type={type} size="sm" /></div>
                <h1 className="edv-title">{pageMeta(`/types/${type}`, language).title.replace(/ \| .*$/, '')}</h1>
                <p className="edv-lead">{pageMeta(`/types/${type}`, language).description}</p>
            </header>

            <div className="edv-main">
                <section className="edv-section">
                    <h2 className="edv-section__title">{t('typesPage.defense')}</h2>
                    <dl className="types-matchups">
                        <MatchupRow label={t('typesPage.weakTo')} types={matchups.weakTo} none={none} />
                        <MatchupRow label={t('typesPage.resists')} types={matchups.resists} none={none} />
                        <MatchupRow label={t('typesPage.immuneTo')} types={matchups.immuneTo} none={none} />
                    </dl>
                </section>
                <section className="edv-section">
                    <h2 className="edv-section__title">{t('typesPage.offense')}</h2>
                    <dl className="types-matchups">
                        <MatchupRow label={t('typesPage.superEffective')} types={matchups.superEffective} none={none} />
                        <MatchupRow label={t('typesPage.notVeryEffective')} types={matchups.notVeryEffective} none={none} />
                        <MatchupRow label={t('typesPage.noEffect')} types={matchups.noEffect} none={none} />
                    </dl>
                </section>
            </div>

            <section className="edv-section">
                <h2 className="edv-section__title">
                    {t('typesPage.pokemonTitle', { type: typeLabel })}
                    {index && ` · ${t('typesPage.pokemonCount', { count: pokemons.length })}`}
                </h2>
                {!index ? (
                    <Loader size="sm" block />
                ) : (
                    <div className="ref-mons">
                        {shown.map((p) => (
                            <Link key={p.id} to={`/pokemon/${p.name}`} className="ref-mon types-mon">
                                <img src={getPokemonFrontSpriteUrl(p.id)} alt="" aria-hidden="true" loading="lazy" />
                                <span>{titleCaseSlug(p.name)}</span>
                            </Link>
                        ))}
                        {!showAll && pokemons.length > shown.length && (
                            <button type="button" className="ref-mon-more" onClick={() => setShowAll(true)}>
                                +{pokemons.length - shown.length} {t('db.more')}
                            </button>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
}
