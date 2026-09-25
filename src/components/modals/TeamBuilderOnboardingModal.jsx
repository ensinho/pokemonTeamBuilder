import React, { useState } from 'react';
import { Sparkles, Zap, Check, Plus, RefreshCw, Info, Package, X } from 'lucide-react';
import { useModalA11y } from '../../hooks/useModalA11y';
import { useTranslation } from '../../hooks/useTranslation';
import { getPokemonFrontSpriteUrl, getPokemonArtworkSpriteUrl } from '../../utils/pokemonSprites';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { typeIcons } from '../../constants/types';

// Sample Pokémon for the simulated demo grid. Megas appear in BASE FORM in grid
// and MORPH into Mega form when added to the team roster.
const DEMO_POKEMON = [
    {
        id: 448,
        name: 'Lucario',
        megaId: 10059,
        megaName: 'Mega Lucario',
        megaStone: 'Lucarionite',
        types: ['fighting', 'steel'],
        item: 'Lucarionite',
        ability: 'Adaptability',
        nature: 'Jolly',
        evs: '252 Atk / 252 Spe',
        moves: ['Close Combat', 'Meteor Mash', 'Extreme Speed', 'Swords Dance'],
        hasMega: true,
    },
    {
        id: 6,
        name: 'Charizard',
        megaId: 10035,
        megaName: 'Mega Charizard Y',
        megaStone: 'Charizardite Y',
        types: ['fire', 'flying'],
        item: 'Charizardite Y',
        ability: 'Drought',
        nature: 'Timid',
        evs: '252 SpA / 252 Spe',
        moves: ['Heat Wave', 'Solar Beam', 'Air Slash', 'Protect'],
        hasMega: true,
    },
    {
        id: 445,
        name: 'Garchomp',
        types: ['dragon', 'ground'],
        item: 'Life Orb',
        ability: 'Rough Skin',
        nature: 'Jolly',
        evs: '252 Atk / 252 Spe',
        moves: ['Earthquake', 'Dragon Claw', 'Swords Dance', 'Protect'],
        hasMega: false,
    },
    {
        id: 376,
        name: 'Metagross',
        megaId: 10076,
        megaName: 'Mega Metagross',
        megaStone: 'Metagrossite',
        types: ['steel', 'psychic'],
        item: 'Metagrossite',
        ability: 'Tough Claws',
        nature: 'Jolly',
        evs: '252 Atk / 252 Spe',
        moves: ['Iron Head', 'Zen Headbutt', 'Bullet Punch', 'Protect'],
        hasMega: true,
    },
    {
        id: 727,
        name: 'Incineroar',
        types: ['fire', 'dark'],
        item: 'Sitrus Berry',
        ability: 'Intimidate',
        nature: 'Careful',
        evs: '252 HP / 156 Def / 100 SpD',
        moves: ['Fake Out', 'Flare Blitz', 'Parting Shot', 'Knock Off'],
        hasMega: false,
    },
    {
        id: 987,
        name: 'Flutter Mane',
        types: ['ghost', 'fairy'],
        item: 'Booster Energy',
        ability: 'Protosynthesis',
        nature: 'Timid',
        evs: '252 SpA / 252 Spe',
        moves: ['Moonblast', 'Shadow Ball', 'Dazzling Gleam', 'Protect'],
        hasMega: false,
    },
];

export function TeamBuilderOnboardingModal({ onClose }) {
    const { language } = useTranslation();
    const pt = language === 'pt';
    const [dontShowAgain, setDontShowAgain] = useState(true);

    // Simulated team slots state (starts with Lucario pre-added so user sees the morph right away)
    const [simulatedTeam, setSimulatedTeam] = useState([
        DEMO_POKEMON[0]
    ]);

    const handleAddDemoPokemon = (pokemon) => {
        if (simulatedTeam.length >= 6) return;
        setSimulatedTeam((prev) => [...prev, pokemon]);
    };

    const handleRemoveDemoPokemon = (index) => {
        setSimulatedTeam((prev) => prev.filter((_, i) => i !== index));
    };

    const handleResetDemo = () => {
        setSimulatedTeam([]);
    };

    // Every way out of this dialog honours the checkbox — the footer button, the
    // X, the scrim and Escape all land here. It used to persist the flag only on
    // the footer button, so the common exit (tap the X with "don't show again"
    // already ticked) taught the guide nothing and it reappeared on every single
    // visit to the builder.
    const handleDismiss = () => {
        if (dontShowAgain && typeof window !== 'undefined') {
            window.localStorage.setItem('tb-onboarding-seen', '1');
        }
        onClose();
    };

    const dialogRef = useModalA11y(handleDismiss);

    const activeLastAdded = simulatedTeam[simulatedTeam.length - 1];

    return (
        <div className="modal-scrim" onClick={handleDismiss} role="presentation">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="onboarding-modal-title"
                aria-describedby="onboarding-modal-subtitle"
                tabIndex={-1}
                className="modal-panel modal-panel--2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="modal-header">
                    <div className="min-w-0 flex-1">
                        <h2 id="onboarding-modal-title" className="modal-title">
                            {pt ? 'Como funciona a adição automática de Pokémon & Megas' : 'How automatic Pokémon & Mega additions work'}
                        </h2>
                        <p id="onboarding-modal-subtitle" className="modal-subtitle">
                            {pt ? 'Um simulador ao vivo — adicione Pokémon abaixo e veja o time se montar.' : 'A live simulator — add Pokémon below and watch the team assemble.'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleDismiss}
                        className="modal-close"
                        aria-label={pt ? 'Fechar' : 'Close'}
                    >
                        <X />
                    </button>
                </header>

                <div className="modal-body custom-scrollbar">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

                        {/* Left: the simulated roster. A fill region inside the panel, so
                            nothing in it draws a second outline. */}
                        <section className="flex flex-col gap-3 lg:col-span-5">
                            <div className="rounded-lg bg-surface-raised p-3">
                                <div className="mb-3 flex items-center justify-between gap-2">
                                    <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
                                        {pt ? 'Meu time atual' : 'Current team'}
                                        <span className="count-badge">{simulatedTeam.length}/6</span>
                                    </h3>
                                    {simulatedTeam.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={handleResetDemo}
                                            className="btn btn-ghost btn-sm touch-target"
                                            title={pt ? 'Limpar time' : 'Clear team'}
                                        >
                                            <RefreshCw />
                                            {pt ? 'Limpar' : 'Clear'}
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    {Array.from({ length: 6 }).map((_, idx) => {
                                        const p = simulatedTeam[idx];
                                        if (p) {
                                            // A Mega-capable Pokémon enters the slot already in its Mega form.
                                            const isMegaMorph = p.hasMega;
                                            const spriteUrl = isMegaMorph
                                                ? getPokemonArtworkSpriteUrl(p.megaId)
                                                : getPokemonArtworkSpriteUrl(p.id);
                                            const displayName = isMegaMorph ? p.megaName : p.name;
                                            return (
                                                <button
                                                    type="button"
                                                    key={`${p.id}-${idx}`}
                                                    onClick={() => handleRemoveDemoPokemon(idx)}
                                                    className="group relative flex min-w-0 flex-col items-center justify-center rounded-md bg-surface p-2 text-center transition-colors hover:bg-surface-hover animate-scale-in"
                                                    title={pt ? 'Clique para remover' : 'Click to remove'}
                                                    aria-label={pt ? `Remover ${displayName}` : `Remove ${displayName}`}
                                                >
                                                    <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-surface-raised text-muted opacity-0 transition-opacity group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                                                        <X className="h-2.5 w-2.5" />
                                                    </span>
                                                    <img
                                                        src={spriteUrl}
                                                        onError={(e) => { e.currentTarget.src = getPokemonFrontSpriteUrl(p.id); }}
                                                        alt=""
                                                        className="h-10 w-10 object-contain image-pixelated"
                                                    />
                                                    <span className="mt-1 w-full truncate text-[0.6875rem] font-semibold text-fg">
                                                        {displayName}
                                                    </span>
                                                    <span className="w-full truncate text-[0.625rem] text-muted">
                                                        {p.item}
                                                    </span>
                                                </button>
                                            );
                                        }

                                        // Dashed = empty, the one thing a dashed line is allowed to mean.
                                        return (
                                            <div
                                                key={`empty-${idx}`}
                                                className="flex flex-col items-center justify-center rounded-md border border-dashed border-border-strong p-2 text-center"
                                            >
                                                <img src={POKEBALL_PLACEHOLDER_URL} alt="" className="h-6 w-6 opacity-25" />
                                                <span className="mt-1 text-[0.625rem] text-muted">{pt ? 'Vazio' : 'Empty'}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {activeLastAdded ? (
                                <div className="rounded-lg bg-surface-raised p-3 text-xs animate-scale-in">
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <span className="flex min-w-0 items-center gap-1.5 font-semibold text-fg">
                                            {activeLastAdded.hasMega ? (
                                                <>
                                                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
                                                    <span className="truncate">{pt ? `Mega Stone equipada: ${activeLastAdded.name} → ${activeLastAdded.megaName}` : `Mega Stone equipped: ${activeLastAdded.name} → ${activeLastAdded.megaName}`}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Zap className="h-3.5 w-3.5 shrink-0 text-warning" />
                                                    <span className="truncate">{pt ? 'Build competitiva carregada' : 'Meta build loaded'}</span>
                                                </>
                                            )}
                                        </span>
                                        <span className="inline-flex shrink-0 items-center gap-1 rounded-sm bg-surface px-1.5 py-0.5 text-[0.625rem] font-medium text-muted">
                                            <Package className="h-3 w-3" />
                                            {activeLastAdded.item}
                                        </span>
                                    </div>

                                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[0.6875rem]">
                                        <div className="flex gap-1"><dt className="text-muted">{pt ? 'Habilidade' : 'Ability'}</dt><dd className="font-medium text-fg">{activeLastAdded.ability}</dd></div>
                                        <div className="flex gap-1"><dt className="text-muted">Nature</dt><dd className="font-medium text-fg">{activeLastAdded.nature}</dd></div>
                                        <div className="col-span-2 flex gap-1"><dt className="text-muted">EVs</dt><dd className="font-medium text-fg tabular-nums">{activeLastAdded.evs}</dd></div>
                                        <div className="col-span-2 flex gap-1"><dt className="shrink-0 text-muted">{pt ? 'Golpes' : 'Moves'}</dt><dd className="text-fg">{activeLastAdded.moves.join(', ')}</dd></div>
                                    </dl>
                                </div>
                            ) : (
                                <p className="rounded-lg bg-surface-raised p-3 text-center text-xs text-muted">
                                    {pt ? 'Adicione qualquer Pokémon ao lado para testar.' : 'Add any Pokémon on the right to try it.'}
                                </p>
                            )}
                        </section>

                        {/* Right: the Pokédex, as claude.ai lists installable things —
                            a tile, a name, one meta line, and a square action that turns
                            into a check once it is in. */}
                        <section className="flex flex-col gap-3 lg:col-span-7">
                            <div className="flex items-baseline justify-between gap-2">
                                <h3 className="text-sm font-semibold text-fg">Pokédex</h3>
                                <span className="text-xs text-muted">{pt ? 'Formas base, como na grade real' : 'Base forms, as in the real grid'}</span>
                            </div>

                            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {DEMO_POKEMON.map((mon) => {
                                    const isAdded = simulatedTeam.some((t) => t.id === mon.id);
                                    const isFull = simulatedTeam.length >= 6;
                                    return (
                                        <li
                                            key={mon.id}
                                            className="flex items-center gap-3 rounded-lg bg-surface-raised p-2.5"
                                        >
                                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-surface">
                                                <img
                                                    src={getPokemonArtworkSpriteUrl(mon.id)}
                                                    onError={(e) => { e.currentTarget.src = getPokemonFrontSpriteUrl(mon.id); }}
                                                    alt=""
                                                    className="h-9 w-9 object-contain"
                                                />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="flex items-center gap-1.5">
                                                    <span className="truncate text-sm font-semibold capitalize text-fg">{mon.name}</span>
                                                    {(mon.types || []).map((tp) => (
                                                        <img key={tp} src={typeIcons[tp]} alt={tp} className="h-3.5 w-3.5 shrink-0 object-contain" />
                                                    ))}
                                                </span>
                                                <span className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                                                    {mon.hasMega ? <Sparkles className="h-3 w-3 shrink-0" /> : <Zap className="h-3 w-3 shrink-0" />}
                                                    <span className="truncate">{mon.hasMega ? (pt ? 'Possui Mega' : 'Has a Mega') : 'Top meta pick'}</span>
                                                </span>
                                            </span>
                                            {isAdded ? (
                                                <span
                                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-success/15 text-success"
                                                    aria-label={pt ? `${mon.name} adicionado` : `${mon.name} added`}
                                                    role="img"
                                                >
                                                    <Check className="h-4 w-4" />
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddDemoPokemon(mon)}
                                                    disabled={isFull}
                                                    className="btn btn-outline btn-icon btn-sm touch-target shrink-0"
                                                    aria-label={pt ? `Adicionar ${mon.name}` : `Add ${mon.name}`}
                                                >
                                                    <Plus />
                                                </button>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>

                            <p className="flex items-start gap-2 text-xs leading-relaxed text-muted">
                                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                <span>
                                    {pt
                                        ? 'Na Pokédex os Pokémon aparecem na forma base. Ao adicionar, entram no time já com a Mega Stone equipada e se transformam na forma Mega no slot.'
                                        : 'In the Pokédex, Pokémon appear in their base form. Once added, they join the team with their Mega Stone equipped and turn into their Mega form in the slot.'}
                                </span>
                            </p>
                        </section>
                    </div>
                </div>

                <footer className="modal-footer sm:justify-between">
                    <label className="order-1 flex items-center gap-2 text-sm text-muted cursor-pointer select-none sm:order-none">
                        <input
                            type="checkbox"
                            checked={dontShowAgain}
                            onChange={(e) => setDontShowAgain(e.target.checked)}
                            className="check"
                        />
                        <span>{pt ? 'Não mostrar novamente' : "Don't show this again"}</span>
                    </label>

                    <button type="button" onClick={handleDismiss} className="btn btn-primary">
                        {pt ? 'Começar a montar' : "Start building"}
                    </button>
                </footer>
            </div>
        </div>
    );
}
