import React from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight } from 'lucide-react';
import { useModalA11y } from '../../hooks/useModalA11y';
import { getTeamPokemonDisplaySprite } from '../../utils/pokemonSprites';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { CloseIcon } from '../icons';

/**
 * The builder's recent teams (2026-11-12, Enzo: "não precisa os times
 * ficarem lá embaixo com a rolagem quebrada"). They were a section under the
 * Pokédex, reached only by scrolling past a list that scrolls on its own.
 * Now they are a card on the Pokédex's header row, beside the game cover:
 * the leads of the last three teams in a fan, the count, and a dialog with
 * every recent team one tap away.
 */
export function RecentTeamsCard({ teams, onOpen, t }) {
    const leads = teams.slice(0, 3).map((team) => ({ id: team.id, lead: team.pokemons?.[0] })).filter((x) => x.lead);
    return (
        <button
            type="button"
            className="tb-recent-trigger"
            onClick={onOpen}
            aria-haspopup="dialog"
            aria-label={t('builder.recentOpen', { count: teams.length })}
        >
            <span className={`tb-recent-trigger__fan ${leads.length === 0 ? 'is-empty' : ''}`} aria-hidden="true">
                {leads.length > 0
                    ? leads.map(({ id, lead }) => (
                        <img
                            key={id}
                            src={getTeamPokemonDisplaySprite(lead)}
                            onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                            alt=""
                            className="tb-recent-trigger__lead"
                        />
                    ))
                    : <img src={POKEBALL_PLACEHOLDER_URL} alt="" className="tb-recent-trigger__lead" />}
            </span>
            <span className="tb-recent-trigger__text">
                <span className="tb-recent-trigger__eyebrow">{t('builder.recentEyebrow')}</span>
                <span className="tb-recent-trigger__label">
                    {t('builder.recentTeams')}
                    {teams.length > 0 && <span className="count-badge">{teams.length}</span>}
                </span>
            </span>
            <ChevronRight className="tb-recent-trigger__chevron" aria-hidden="true" />
        </button>
    );
}

/** The dialog the card opens: every recent team as a card, and "View all". */
export function RecentTeamsDialog({ onClose, onViewAll, count, t, children }) {
    const panelRef = useModalA11y(onClose);
    return createPortal(
        <div className="modal-scrim" onClick={onClose} role="presentation">
            <div
                ref={panelRef}
                className="modal-panel modal-panel--2xl modal-panel--scroll tb-recent-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="tb-recent-title"
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
            >
                <header className="modal-header">
                    <div className="tb-recent-dialog__heading">
                        <h2 id="tb-recent-title" className="modal-title">{t('builder.recentTeams')}</h2>
                        {count > 0 && <span className="count-badge">{count}</span>}
                    </div>
                    <div className="tb-recent-dialog__tools">
                        <button type="button" onClick={onViewAll} className="btn btn-ghost btn-sm">{t('builder.viewAll')}</button>
                        <button type="button" onClick={onClose} className="modal-close" aria-label={t('common.close')}>
                            <CloseIcon />
                        </button>
                    </div>
                </header>
                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>,
        document.body,
    );
}
