import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import '../../styles/entity-detail-view.css';
import '../../styles/reference-views.css';

import { getAbilityPageData } from '../../services/pokemonDataCache';
import { useEntityPageData } from '../../hooks/useEntityPageData';
import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { generationNumeral } from '../../utils/gameVersions';
import { useSmartBack } from '../../hooks/useEntityNavigate';
import { titleCaseSlug } from '../../utils/smogonSets';
import { EmptyState } from '../EmptyState';
import { EntityHolders } from '../entity/EntityHolders';
import { GameDescriptions } from '../entity/GameDescriptions';
import { Loader } from '../Loader';

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
        name: displayName,
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

    const hasHolders = regular.length + hidden.length > 0;
    const hasLongEffect = Boolean(data.effectLong && data.effectLong !== data.effect);

    return (
        <div className="edv edv--entity">
            <button type="button" className="edv-back" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4" /> {backLabel}
            </button>

            <header className="edv-header">
                <div className="edv-kicker">
                    <span>{t('db.abilityTag')}</span>
                    {data.generation && <span>· {t('db.generationLabel', { num: generationNumeral(data.generation) })}</span>}
                </div>
                <h1 className="edv-title">{displayName}</h1>
                {data.effect && <p className="edv-lead">{data.effect}</p>}
            </header>

            <div className={`edv-main ${hasHolders && (hasLongEffect || data.flavorTexts.length > 0) ? '' : 'edv-main--single'}`}>
                {(hasLongEffect || data.flavorTexts.length > 0) && (
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
                            {t('db.usedBy')} <span className="count-badge">{regular.length + hidden.length}</span>
                        </h2>
                        <EntityHolders
                            ariaLabel={t('db.usedBy')}
                            groups={[
                                { id: 'regular', label: t('db.holdersRegular'), pokemons: regular },
                                { id: 'hidden', label: t('db.holdersHidden'), pokemons: hidden },
                            ]}
                        />
                    </section>
                )}
            </div>
        </div>
    );
}
