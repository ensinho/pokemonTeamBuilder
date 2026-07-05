import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import '../../styles/entity-detail-view.css';
import '../../styles/reference-views.css';

import { getAbilityPageData } from '../../services/pokemonDataCache';
import { useEntityPageData } from '../../hooks/useEntityPageData';
import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { formatVersionGroup, generationNumeral } from '../../utils/gameVersions';
import { useSmartBack } from '../../hooks/useEntityNavigate';
import { titleCaseSlug } from '../../utils/smogonSets';
import { EmptyState } from '../EmptyState';
import { PokemonLinkChips } from '../PokemonLinkChips';
import { PokeballIcon } from '../icons';

/**
 * Bulbapedia-style reference page for a single ability (/abilities/:name):
 * effect, per-game descriptions, and every Pokémon that can have it —
 * split into regular and hidden-ability holders.
 */
export function AbilityDetailView() {
    const { name } = useParams();
    const { t, language } = useTranslation();

    const slug = String(name || '').toLowerCase();
    const { status, data } = useEntityPageData(slug, getAbilityPageData);

    const displayName = titleCaseSlug(slug);
    useDocumentMeta({
        title: `${displayName} (${t('db.abilityTag')})`,
        description: data?.effect
            ? `${displayName} — ${data.effect} See every Pokémon that can have ${displayName}.`
            : `${displayName} — ability effect, game descriptions, and every Pokémon that can have it.`,
        path: `/abilities/${slug}`,
    });

    // Breadcrumb-trail back: returns to wherever the ability was clicked (a
    // Pokémon page, a tournament team, the meta view, …) without breaking that
    // page's own back button; falls back to the abilities list on a deep link.
    const { goBack: handleBack, backLabel } = useSmartBack('/abilities', language === 'pt', t('db.backToAbilities'));

    const [regular, hidden] = useMemo(() => {
        const holders = data?.pokemon || [];
        return [holders.filter((p) => !p.isHidden), holders.filter((p) => p.isHidden)];
    }, [data]);

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
                            <span>{t('db.abilityTag')}</span>
                            {data.generation && <span>· {t('db.generationLabel', { num: generationNumeral(data.generation) })}</span>}
                        </div>
                        <h1 className="edv-title">{displayName}</h1>
                        {data.effect && <p className="edv-lead">{data.effect}</p>}
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

            {regular.length > 0 && (
                <section className="edv-section">
                    <h2 className="edv-section__title">{t('db.usedBy')} · {regular.length}</h2>
                    <PokemonLinkChips pokemons={regular} cap={60} />
                </section>
            )}

            {hidden.length > 0 && (
                <section className="edv-section">
                    <h2 className="edv-section__title">{t('db.hiddenAbilityHolders')} · {hidden.length}</h2>
                    <PokemonLinkChips pokemons={hidden} cap={60} />
                </section>
            )}
        </div>
    );
}
