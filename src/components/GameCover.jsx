import React from 'react';
import { createPortal } from 'react-dom';
import { Map as MapIcon, X } from 'lucide-react';
import '../styles/game-cover.css';
import { useModalA11y } from '../hooks/useModalA11y';
import { useTranslation } from '../hooks/useTranslation';
import { getGameLogo, getGameAccent, POKEMON_LOGO } from '../assets/gameLogos';
import { NO_REGULATION } from '../constants/regulations';

// Usage-index regulation groups → the game key whose cover art represents them.
// `group` comes from public/data/usage-index.json (built by build-usage-stats).
const REGULATION_GAME_KEYS = {
    'Pokémon Champions': 'champions',
    'Scarlet & Violet': 'scarlet-violet',
};

// ---------------------------------------------------------------------------
// Game cover banner — the prominent, clickable logo at the top of the builder.
// Shows the selected game's cover (or the franchise logo for "All games") and
// opens the game picker on click. Purely presentational; the owner supplies
// `onOpen` and renders <GamePickerModal> once.
// ---------------------------------------------------------------------------
export function GameCoverBanner({ games = [], selectedGame, onOpen, note = null, className = '' }) {
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
                {note
                    ? <span className="game-cover__note">{note}</span>
                    : <span className="game-cover__hint">{t('builder.changeGame')}</span>}
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
function GameCard({ logo, art = null, label, sub, accent, active, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`game-card ${active ? 'is-active' : ''}`}
            style={{ '--cover-accent': accent }}
            aria-pressed={active}
        >
            {/* `art` covers the one option that isn't a game and so has no cover
                logo (playthrough mode); everything else passes a `logo`. */}
            <span className="game-card__art">
                {art || <img src={logo} alt="" className="game-card__logo" loading="lazy" />}
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
export function GamePickerModal({
    isOpen,
    onClose,
    games = [],
    selectedGame,
    onSelectGame,
    // Competitive regulations (from the usage index) that pair the builder's
    // suggestions + usage data to a chosen meta. Optional — the section only
    // renders when regulations are supplied.
    regulations = [],
    // The Smogon ladder (`kind: 'tier'`), rendered as chips below the regulation
    // cards. Optional and separate from `regulations` so the card grid stays the
    // three VGC covers it was designed for.
    tiers = [],
    // `{ [tierId]: number }` — how many Pokémon the tier actually ALLOWS. The
    // catalog's own `species` count is how many have usage data (~140), which is
    // a different and much smaller number than the roster the chip hands you, so
    // showing that one here would misdescribe the filter. Omitted → no count.
    tierCounts = null,
    selectedRegulation,
    onSelectRegulation,
}) {
    const { t, language } = useTranslation();
    const pt = language === 'pt';
    const dialogRef = useModalA11y(isOpen ? onClose : undefined);

    if (!isOpen) return null;

    const current = selectedGame || 'all';
    const choose = (key) => {
        onSelectGame?.(key);
        onClose?.();
    };
    // Regulation picks tune the competitive data only — they don't filter the
    // Pokédex, so keep the modal open so the user can also pick a game.
    const chooseRegulation = (id) => onSelectRegulation?.(id);
    const hasRegulations = (regulations.length > 0 || tiers.length > 0) && typeof onSelectRegulation === 'function';
    // Tiers bucketed by their catalog group, in first-seen order.
    const tierGroups = [];
    if (typeof onSelectRegulation === 'function') {
        for (const tier of tiers) {
            const name = tier.group || '';
            let group = tierGroups.find((g) => g.name === name);
            if (!group) { group = { name, items: [] }; tierGroups.push(group); }
            group.items.push(tier);
        }
    }
    // A regulation belongs to a game family ("Pokémon Champions", "Scarlet &
    // Violet"): show that family's cover rather than one logo for all of them.
    const regulationLogo = (group) => getGameLogo(REGULATION_GAME_KEYS[group] || 'champions');

    // Portaled to <body> for the same reason <BottomSheet> is: the picker is
    // opened *from* a sheet on mobile, and a picker left inside the page tree
    // renders before the sheet's portal node and so paints underneath it.
    return createPortal(
        <div
            className="modal-scrim"
            onClick={onClose}
            role="presentation"
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="game-picker-title"
                tabIndex={-1}
                className="game-picker w-full max-w-3xl rounded-2xl bg-surface shadow-elevation-3 focus:outline-none"
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

                <div className="game-picker__body custom-scrollbar">
                    {hasRegulations && (
                        <section className="game-picker__section">
                            <div className="game-picker__section-head">
                                <h3 className="game-picker__section-title">
                                    {pt ? 'Regulamento competitivo' : 'Competitive regulation'}
                                </h3>
                                <p className="game-picker__section-sub">
                                    {t('builder.regulationSectionSub')}
                                </p>
                            </div>
                            <div className="game-picker__grid game-picker__grid--flush">
                                <GameCard
                                    art={<MapIcon className="game-card__icon" aria-hidden="true" />}
                                    label={t('builder.playthroughTitle')}
                                    sub={t('builder.playthroughSub')}
                                    accent="var(--color-primary)"
                                    active={selectedRegulation === NO_REGULATION}
                                    onClick={() => chooseRegulation(NO_REGULATION)}
                                />
                                {regulations.map((reg) => (
                                    <GameCard
                                        key={reg.id}
                                        logo={regulationLogo(reg.group)}
                                        label={reg.label}
                                        sub={reg.group}
                                        accent={getGameAccent('generation-ix')}
                                        active={selectedRegulation === reg.id}
                                        onClick={() => chooseRegulation(reg.id)}
                                    />
                                ))}
                            </div>

                            {/* The Smogon ladder. Same section as the regulations —
                                it answers the same question, "which meta am I
                                building for" — but as chips, because thirty-odd
                                two-letter tiers as cover cards would be thirty
                                identical plates. Grouped in catalog order so
                                SV Singles stays above the past generations. */}
                            {tierGroups.length > 0 && (
                                <div className="tier-groups" style={{ marginTop: 'var(--space-4)' }}>
                                    <div className="game-picker__section-head">
                                        <h3 className="game-picker__section-title">
                                            {pt ? 'Tiers do Smogon' : 'Smogon tiers'}
                                        </h3>
                                        <p className="game-picker__section-sub">
                                            {pt
                                                ? 'Filtra a lista pelos Pokémon legais na tier e ranqueia por uso real'
                                                : 'Filters the list to the Pokémon legal in the tier and ranks them by real usage'}
                                        </p>
                                    </div>
                                    {tierGroups.map((group) => (
                                        <div key={group.name}>
                                            <span className="tier-group__label">{group.name}</span>
                                            <div className="tier-chips">
                                                {group.items.map((tier) => (
                                                    <button
                                                        key={tier.id}
                                                        type="button"
                                                        onClick={() => chooseRegulation(tier.id)}
                                                        aria-pressed={selectedRegulation === tier.id}
                                                        className={`tier-chip ${selectedRegulation === tier.id ? 'is-active' : ''}`}
                                                    >
                                                        {tier.label}
                                                        {Number.isFinite(tierCounts?.[tier.id]) && (
                                                            <span className="tier-chip__count">{tierCounts[tier.id]}</span>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    <section className="game-picker__section">
                        {hasRegulations && (
                            <div className="game-picker__section-head">
                                <h3 className="game-picker__section-title">
                                    {pt ? 'Pokédex do jogo' : 'Game Pokédex'}
                                </h3>
                                <p className="game-picker__section-sub">
                                    {pt
                                        ? 'Filtra a Pokédex pelos Pokémon obteníveis no jogo'
                                        : 'Filters the Pokédex to a game’s obtainable Pokémon'}
                                </p>
                            </div>
                        )}
                        <div className="game-picker__grid game-picker__grid--flush">
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
                    </section>
                </div>
            </div>
        </div>,
        document.body
    );
}
