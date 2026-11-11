import React, { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import '../styles/entity-detail-view.css';

import { getAbilityPageData } from '../services/pokemonDataCache';
import { useEntityPageData } from '../hooks/useEntityPageData';
import { useEntityNavigate } from '../hooks/useEntityNavigate';
import { useModalA11y } from '../hooks/useModalA11y';
import { useTranslation } from '../hooks/useTranslation';
import { useAbilityDialogStore } from '../store/useAbilityDialogStore';
import { generationNumeral } from '../utils/gameVersions';
import { titleCaseSlug, toApiSlug } from '../utils/smogonSets';
import { EntityHolders } from './entity/EntityHolders';
import { CloseIcon } from './icons';
import { Loader } from './Loader';

/**
 * An ability, read without leaving the Pokémon it was clicked on: what it
 * does, the long version, and who has it (paged). The full reference page —
 * every game's wording — is one link away in the footer.
 *
 * Opened with `openAbilityDialog(name)`; AppLayout mounts it while a name is
 * set. It can open over another dialog (the Pokédex modal), so it sits one
 * layer up and takes Escape for itself.
 */
export function AbilityDialog() {
    const { t } = useTranslation();
    const name = useAbilityDialogStore((s) => s.name);
    const close = useAbilityDialogStore((s) => s.close);
    const slug = toApiSlug(name);
    const { status, data } = useEntityPageData(slug, getAbilityPageData);
    const { linkState } = useEntityNavigate();
    const dialogRef = useModalA11y(close);

    // Every open dialog listens for Escape on the document, so one press
    // would close this and the dialog under it. Caught on the way down, it
    // closes only the one on top.
    useEffect(() => {
        const onKey = (event) => {
            if (event.key !== 'Escape') return;
            event.stopPropagation();
            useAbilityDialogStore.getState().close();
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, []);

    const [regular, hidden] = useMemo(() => {
        const holders = data?.pokemon || [];
        return [holders.filter((p) => !p.isHidden), holders.filter((p) => p.isHidden)];
    }, [data]);

    // Following a link out: this closes, and so does whatever opened it.
    const leave = () => {
        const { onLeave } = useAbilityDialogStore.getState();
        onLeave?.();
        close();
    };

    const displayName = titleCaseSlug(slug);
    const hasLongEffect = Boolean(data?.effectLong && data.effectLong !== data.effect);

    return (
        <div className="modal-scrim z-[60]" onClick={close} role="presentation">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="ability-dialog-title"
                tabIndex={-1}
                className="modal-panel modal-panel--lg ability-dialog"
                onClick={(event) => event.stopPropagation()}
            >
                <header className="modal-header">
                    <div className="min-w-0 flex-1">
                        <div className="edv-kicker">
                            <span>{t('db.abilityTag')}</span>
                            {data?.generation && <span>· {t('db.generationLabel', { num: generationNumeral(data.generation) })}</span>}
                        </div>
                        <h2 id="ability-dialog-title" className="edv-title">{displayName}</h2>
                    </div>
                    <button type="button" className="modal-close" onClick={close} aria-label={t('common.close')}>
                        <CloseIcon />
                    </button>
                </header>

                <div className="modal-body custom-scrollbar ability-dialog__body">
                    {status === 'loading' && <Loader size="md" scene="pokedex" block />}

                    {status === 'missing' && (
                        <p className="ability-dialog__lead">{t('db.detailNotFoundDesc')}</p>
                    )}

                    {status === 'ready' && (
                        <>
                            {data.effect && <p className="ability-dialog__lead">{data.effect}</p>}

                            {hasLongEffect && (
                                <section className="ability-dialog__block">
                                    <h3>{t('db.effectHeading')}</h3>
                                    <p>{data.effectLong}</p>
                                </section>
                            )}

                            {regular.length + hidden.length > 0 && (
                                <section className="ability-dialog__block">
                                    <h3>
                                        {t('db.usedBy')} <span className="count-badge">{regular.length + hidden.length}</span>
                                    </h3>
                                    <EntityHolders
                                        ariaLabel={t('db.usedBy')}
                                        pageSize={12}
                                        onNavigate={leave}
                                        groups={[
                                            { id: 'regular', label: t('db.holdersRegular'), pokemons: regular },
                                            { id: 'hidden', label: t('db.holdersHidden'), pokemons: hidden },
                                        ]}
                                    />
                                </section>
                            )}
                        </>
                    )}
                </div>

                <footer className="modal-footer modal-footer--ruled">
                    <Link to={`/abilities/${slug}`} state={linkState} onClick={leave} className="btn btn-secondary">
                        {t('db.openFullPage')} <ArrowUpRight aria-hidden="true" />
                    </Link>
                    <button type="button" className="btn btn-primary" onClick={close}>
                        {t('common.close')}
                    </button>
                </footer>
            </div>
        </div>
    );
}

export default AbilityDialog;
