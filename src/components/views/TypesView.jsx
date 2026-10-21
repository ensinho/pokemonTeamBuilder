import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { COMBO_TIERS, TYPE_IDS, comboDefense, hasExactTyping, offensiveMultiplier, toggleComboType, typeMatchups } from '../../utils/typeMatchups';
import { pageMeta } from '../../utils/seoPages';
import { titleCaseSlug } from '../../utils/smogonSets';
import { TypeChip } from '../TypeChip';
import { EmptyState } from '../EmptyState';
import { Loader } from '../Loader';
import { AnimatedSprite } from '../AnimatedSprite';

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

const COMBO_LABEL = { 4: 'x4', 2: 'x2', 0.5: 'half', 0.25: 'quarter', 0: 'immune' };
const EXAMPLES_SHOWN = 8;

/** The 18 × 18 chart, with the hovered row and column lit so a cell can be read. */
function TypeMatrix() {
    const { t } = useTranslation();
    const [col, setCol] = useState(-1);
    // One handler on the table, not 324: the column is the cell's index.
    const onOver = useCallback((e) => {
        const cell = e.target.closest('td, th');
        const next = cell ? cell.cellIndex - 1 : -1;
        setCol((prev) => (prev === next ? prev : next));
    }, []);

    return (
        <div className="types-matrix-wrap custom-scrollbar">
            <table className="types-matrix" onMouseOver={onOver} onMouseLeave={() => setCol(-1)}>
                <thead>
                    <tr>
                        <th scope="col" className="types-matrix__corner">
                            <span>{t('typesPage.attacking')} ↓</span>
                            <span>{t('typesPage.defending')} →</span>
                        </th>
                        {TYPE_IDS.map((type, i) => (
                            <th key={type} scope="col" title={t(`types.${type}`)} className={i === col ? 'is-lit' : undefined}>
                                <Link to={`/types/${type}`} className="types-matrix__col-head">
                                    <img src={typeIcons[type]} alt={t(`types.${type}`)} className="types-matrix__icon" />
                                </Link>
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
                            {TYPE_IDS.map((defender, i) => {
                                const m = offensiveMultiplier(attacker, defender);
                                const tone = m > 1 ? 'super' : m === 0 ? 'none' : m < 1 ? 'weak' : 'neutral';
                                return (
                                    <td
                                        key={defender}
                                        className={`types-matrix__cell types-matrix__cell--${tone}${i === col ? ' is-lit' : ''}`}
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
    );
}

/** "Fire/Flying takes 4× from Rock…" — the question people search for, answered in place. */
function TypeCombiner({ index }) {
    const { t } = useTranslation();
    const [selected, setSelected] = useState(['fire', 'flying']);
    const tiers = useMemo(() => comboDefense(selected), [selected]);
    const examples = useMemo(
        () => (index || []).filter((p) => p.id <= 1025 && hasExactTyping(p.types, selected)),
        [index, selected],
    );

    return (
        <section className="edv-section types-combo" aria-labelledby="types-combo-title">
            <h2 id="types-combo-title" className="types-combo__title">{t('typesPage.combo.title')}</h2>
            <p className="types-combo__hint">{t('typesPage.combo.hint')}</p>

            <div className="types-combo__picker">
                {TYPE_IDS.map((type) => (
                    <button
                        key={type}
                        type="button"
                        className="types-combo__type"
                        aria-pressed={selected.includes(type)}
                        aria-label={t(`types.${type}`)}
                        title={t(`types.${type}`)}
                        onClick={() => setSelected((prev) => toggleComboType(prev, type))}
                    >
                        <img src={typeIcons[type]} alt="" aria-hidden="true" />
                    </button>
                ))}
            </div>

            {selected.length > 0 && (
                <>
                    <div className="types-combo__selected">
                        {selected.map((type) => <TypeLink key={type} type={type} />)}
                    </div>
                    <dl className="types-matchups">
                        {COMBO_TIERS.filter((m) => tiers[m].length).map((m) => (
                            <MatchupRow key={m} label={t(`typesPage.combo.${COMBO_LABEL[m]}`)} types={tiers[m]} />
                        ))}
                    </dl>
                    {index && (
                        <div className="types-combo__examples">
                            <h3 className="types-combo__subtitle">{t('typesPage.combo.examples')}</h3>
                            {examples.length ? (
                                <div className="ref-mons">
                                    {examples.slice(0, EXAMPLES_SHOWN).map((p) => (
                                        <Link key={p.id} to={`/pokemon/${p.name}`} className="ref-mon types-mon">
                                            <img src={getPokemonFrontSpriteUrl(p.id)} alt="" aria-hidden="true" loading="lazy" />
                                            <span>{titleCaseSlug(p.name)}</span>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <p className="types-matchup__none">{t('typesPage.combo.noExamples')}</p>
                            )}
                        </div>
                    )}
                </>
            )}
        </section>
    );
}

export function TypesView() {
    const { t } = useTranslation();
    const index = usePokemonIndex();
    useDocumentMeta({ path: '/types' });

    return (
        <div className="edv types-view">
            <header className="edv-header types-hero">
                <div className="types-hero__copy">
                    <h1 className="edv-title">{t('typesPage.title')}</h1>
                    <p className="edv-lead">{t('typesPage.lede')}</p>
                </div>
                <nav className="types-grid" aria-label={t('typesPage.allTypes')}>
                    {TYPE_IDS.map((type) => <TypeLink key={type} type={type} />)}
                </nav>
            </header>

            <div className="types-layout">
                <section className="edv-section types-chart">
                    <div className="types-chart__head">
                        <h2 className="edv-section__title">{t('typesPage.matrixHint')}</h2>
                        <ul className="types-legend">
                            <li><span className="types-legend__swatch types-matrix__cell--super">2</span>{t('typesPage.legend.super')}</li>
                            <li><span className="types-legend__swatch types-matrix__cell--weak">½</span>{t('typesPage.legend.weak')}</li>
                            <li><span className="types-legend__swatch types-matrix__cell--none">0</span>{t('typesPage.legend.none')}</li>
                        </ul>
                    </div>
                    <TypeMatrix />
                </section>
                <TypeCombiner index={index} />
            </div>
        </div>
    );
}

const MatchupRow = ({ label, types, none = '' }) => (
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
    const bst = (p) => Object.values(p.baseStats || {}).reduce((a, b) => a + b, 0);
    const strongest = useMemo(() => [...pokemons].sort((a, b) => bst(b) - bst(a)).slice(0, 3), [pokemons]);

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

            <header className="edv-header types-hero">
                <div className="types-hero__copy">
                    <div className="edv-kicker"><TypeChip type={type} size="sm" /></div>
                    <h1 className="edv-title">{pageMeta(`/types/${type}`, language).title.replace(/ \| .*$/, '')}</h1>
                    <p className="edv-lead">{pageMeta(`/types/${type}`, language).description}</p>
                </div>
                {strongest.length > 0 && (
                    <figure className="types-strongest">
                        <div className="types-strongest__row">
                            {strongest.map((p) => (
                                <Link key={p.id} to={`/pokemon/${p.name}`} className="types-strongest__mon">
                                    <span className="types-strongest__stage">
                                        <AnimatedSprite id={p.id} className="types-strongest__sprite" />
                                    </span>
                                    <span className="types-strongest__name">{titleCaseSlug(p.name)}</span>
                                    <span className="types-strongest__bst">{bst(p)}</span>
                                </Link>
                            ))}
                        </div>
                        <figcaption className="types-strongest__caption">
                            {t('typesPage.strongest', { type: typeLabel })} · {t('typesPage.strongestHint')}
                        </figcaption>
                    </figure>
                )}
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
