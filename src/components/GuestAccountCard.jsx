import React, { useState } from 'react';
import '../styles/auth-dialog.css';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from '../hooks/useTranslation';
import { promptSignIn } from '../utils/navigation';
import { getPokemonFrontSpriteUrl } from '../utils/pokemonSprites';
import { CloseIcon, PokeballIcon } from './icons';

const DISMISS_KEY = 'ptb-guest-card-dismissed';

/**
 * The guest's trainer card: the same object as the sign-in dialog's hero (the
 * partner Pokémon on its platform, the Poké Ball mark), small enough for the
 * rail. One component in three places — the desktop rail's account slot, the
 * phone's "Mais" sheet and Home. Only Home's can be dismissed: there it sits
 * in the content, while in the rail and the sheet it *is* the account slot.
 */
export function GuestAccountCard({ variant = 'rail', onBeforeOpen }) {
    const { t } = useTranslation();
    const isAnonymous = useAuthStore((s) => s.isAnonymous);
    const greetingPokemonId = useAuthStore((s) => s.greetingPokemonId);
    const dismissible = variant === 'home';
    const [dismissed, setDismissed] = useState(() => {
        if (!dismissible) return false;
        try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch (_) { return false; }
    });

    // `isAnonymous` boots from the cached auth snapshot, so an account holder
    // never sees this flash in before Firebase answers.
    if (!isAnonymous || dismissed) return null;

    const open = (mode) => {
        onBeforeOpen?.();
        promptSignIn(mode);
    };
    const dismiss = () => {
        try { localStorage.setItem(DISMISS_KEY, '1'); } catch (_) { /* ignore */ }
        setDismissed(true);
    };

    return (
        <section className={`guest-card guest-card--${variant}`} aria-labelledby={`guest-card-title-${variant}`}>
            <PokeballIcon className="guest-card__motif" aria-hidden="true" />
            <div className="guest-card__top">
                <span className="guest-card__stage" aria-hidden="true">
                    <img src={getPokemonFrontSpriteUrl(greetingPokemonId || 25)} alt="" loading="lazy" />
                </span>
                <div className="guest-card__copy">
                    <h2 id={`guest-card-title-${variant}`} className="guest-card__title">{t('modals.guestCardTitle')}</h2>
                    <p className="guest-card__text">{t('modals.guestCardText')}</p>
                </div>
                {dismissible && (
                    <button type="button" onClick={dismiss} className="modal-close guest-card__dismiss" aria-label={t('common.close')}>
                        <CloseIcon />
                    </button>
                )}
            </div>
            <div className="guest-card__actions">
                <button type="button" onClick={() => open('signUp')} className="btn btn-primary btn-sm">
                    {t('modals.authTabSignUp')}
                </button>
                <button type="button" onClick={() => open('signIn')} className="btn btn-ghost btn-sm">
                    {t('modals.authTabSignIn')}
                </button>
            </div>
        </section>
    );
}
