import React from 'react';
import { useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import '../../styles/entity-detail-view.css';
import '../../styles/reference-views.css';

import { getItemPageData } from '../../services/pokemonDataCache';
import { useEntityPageData } from '../../hooks/useEntityPageData';
import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { formatVersionGroup } from '../../utils/gameVersions';
import { useSmartBack } from '../../hooks/useEntityNavigate';
import { titleCaseSlug } from '../../utils/smogonSets';
import { EmptyState } from '../EmptyState';
import { PokemonLinkChips } from '../PokemonLinkChips';
import { PokeballIcon } from '../icons';

const prettify = (name = '') => String(name).replace(/-/g, ' ');

/**
 * Bulbapedia-style reference page for a single item (/items/:name): effect,
 * category / cost / Fling power, per-game descriptions, and the wild Pokémon
 * that can hold it. Mirrors the move & ability detail pages.
 */
export function ItemDetailView() {
    const { name } = useParams();
    const { t, language } = useTranslation();

    const slug = String(name || '').toLowerCase();
    const { status, data } = useEntityPageData(slug, getItemPageData);

    const displayName = titleCaseSlug(slug);
    useDocumentMeta({
        title: `${displayName} (${t('db.itemTag')})`,
        description: data?.effect
            ? `${displayName} — ${data.effect}`
            : `${displayName} — item effect, game descriptions, and which Pokémon hold it.`,
        path: `/items/${slug}`,
    });

    // Breadcrumb-trail back: returns to wherever the item was clicked (a
    // Pokémon page, the meta view, a tournament team, …) without breaking that
    // page's own back button; falls back to the items list on a deep link.
    const { goBack: handleBack, backLabel } = useSmartBack('/items', language === 'pt', t('db.backToItems'));

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

    const hasDescriptions = data.flavorTexts.length > 0;

    return (
        <div className="edv">
            <button type="button" className="edv-back" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4" /> {backLabel}
            </button>

            <div className={`edv-main ${hasDescriptions ? '' : 'edv-main--single'}`}>
                <div className="edv-col">
                    <header className="edv-header">
                        <div className="edv-kicker">
                            <span>{t('db.itemTag')}</span>
                            {data.category && <span className="capitalize">· {prettify(data.category)}</span>}
                        </div>
                        <h1 className="edv-title flex items-center gap-2">
                            {data.sprite && <img src={data.sprite} alt="" aria-hidden="true" className="w-9 h-9 image-pixelated shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                            {displayName}
                        </h1>
                        {data.effect && <p className="edv-lead">{data.effect}</p>}
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                            <span className="rounded-md border border-border bg-surface-raised px-2 py-0.5 text-fg">
                                <span className="text-muted">{t('db.colCost')}:</span> {data.cost > 0 ? data.cost : '—'}
                            </span>
                            {data.flingPower != null && (
                                <span className="rounded-md border border-border bg-surface-raised px-2 py-0.5 text-fg">
                                    <span className="text-muted">{t('db.flingPower')}:</span> {data.flingPower}
                                </span>
                            )}
                        </div>
                    </header>

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

            {data.heldBy.length > 0 && (
                <section className="edv-section">
                    <h2 className="edv-section__title">{t('db.heldByWild')} · {data.heldBy.length}</h2>
                    <PokemonLinkChips pokemons={data.heldBy} cap={60} />
                </section>
            )}
        </div>
    );
}
