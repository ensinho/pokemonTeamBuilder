import React from 'react';
import { X } from 'lucide-react';
import '../styles/game-cover.css';
import { useModalA11y } from '../hooks/useModalA11y';
import { useTranslation } from '../hooks/useTranslation';
import { getGameLogo, getGameAccent, POKEMON_LOGO } from '../assets/gameLogos';

// ---------------------------------------------------------------------------
// Game cover banner — the prominent, clickable logo at the top of the builder.
// Shows the selected game's cover (or the franchise logo for "All games") and
// opens the game picker on click. Purely presentational; the owner supplies
// `onOpen` and renders <GamePickerModal> once.
// ---------------------------------------------------------------------------
export function GameCoverBanner({ games = [], selectedGame, onOpen, className = '' }) {
    const { t, language } = useTranslation();
    const current = selectedGame && selectedGame !== 'all'
        ? games.find((g) => g.key === selectedGame)
        : null;
    const logo = current ? getGameLogo(current.key) : POKEMON_LOGO;
    const accent = current ? getGameAccent(current.generation) : 'var(--color-primary)';

    return (
        <button
            type="button"
            onClick={onOpen}
            className={`game-cover ${className}`}
            style={{ '--cover-accent': accent }}
            aria-haspopup="dialog"
            title={t('builder.changeGame')}
        >
            <span className="game-cover__art">
                <img src={logo} alt="" className="game-cover__logo" />
            </span>
            <span className="game-cover__meta">
                <span className="game-cover__eyebrow">
                    {current ? t('builder.gameFilterLabel') : (language === 'pt' ? 'Pokédex' : 'Pokédex')}
                </span>
                <span className="game-cover__label">
                    {current ? current.label : t('builder.allGames')}
                </span>
                <span className="game-cover__hint">{t('builder.changeGame')}</span>
            </span>
        </button>
    );
}

// ---------------------------------------------------------------------------
// Compact game control for the filter bar — same job as the banner, smaller.
// ---------------------------------------------------------------------------
export function GameFilterChip({ games = [], selectedGame, onOpen, className = '' }) {
    const { t } = useTranslation();
    const current = selectedGame && selectedGame !== 'all'
        ? games.find((g) => g.key === selectedGame)
        : null;
    const logo = current ? getGameLogo(current.key) : POKEMON_LOGO;
    const accent = current ? getGameAccent(current.generation) : 'var(--color-primary)';

    return (
        <button
            type="button"
            onClick={onOpen}
            className={`game-filter-chip ${className}`}
            style={{ '--cover-accent': accent }}
            aria-haspopup="dialog"
        >
            <img src={logo} alt="" className="game-filter-chip__logo" />
            <span className="game-filter-chip__label">
                {current ? current.label : t('builder.allGames')}
            </span>
        </button>
    );
}

// ---------------------------------------------------------------------------
// GameCard — a single selectable cover inside the picker grid.
// ---------------------------------------------------------------------------
function GameCard({ logo, label, sub, accent, active, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`game-card ${active ? 'is-active' : ''}`}
            style={{ '--cover-accent': accent }}
            aria-pressed={active}
        >
            <span className="game-card__art">
                <img src={logo} alt="" className="game-card__logo" loading="lazy" />
            </span>
            <span className="game-card__label">{label}</span>
            {sub && <span className="game-card__sub">{sub}</span>}
            {active && <span className="game-card__check" aria-hidden="true">✓</span>}
        </button>
    );
}

// ---------------------------------------------------------------------------
// GamePickerModal — grid of game covers; selecting one sets the game filter.
// ---------------------------------------------------------------------------
export function GamePickerModal({ isOpen, onClose, games = [], selectedGame, onSelectGame }) {
    const { t } = useTranslation();
    const dialogRef = useModalA11y(isOpen ? onClose : undefined);

    if (!isOpen) return null;

    const current = selectedGame || 'all';
    const choose = (key) => {
        onSelectGame?.(key);
        onClose?.();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={onClose}
            role="presentation"
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="game-picker-title"
                tabIndex={-1}
                className="game-picker w-full max-w-3xl rounded-2xl border border-border bg-surface shadow-2xl focus:outline-none"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="game-picker__head">
                    <div className="min-w-0">
                        <h2 id="game-picker-title" className="game-picker__title">{t('builder.chooseGameTitle')}</h2>
                        <p className="game-picker__subtitle">{t('builder.chooseGameSubtitle')}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="team-builder-icon-button"
                        aria-label={t('common.close')}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="game-picker__grid custom-scrollbar">
                    <GameCard
                        logo={POKEMON_LOGO}
                        label={t('builder.allGames')}
                        sub={t('builder.allGamesSubtitle')}
                        accent="var(--color-primary)"
                        active={current === 'all'}
                        onClick={() => choose('all')}
                    />
                    {games.map((game) => (
                        <GameCard
                            key={game.key}
                            logo={getGameLogo(game.key)}
                            label={game.label}
                            sub={game.count ? `${game.count} Pokémon` : null}
                            accent={getGameAccent(game.generation)}
                            active={current === game.key}
                            onClick={() => choose(game.key)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
