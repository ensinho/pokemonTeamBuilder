import React, { useState } from 'react';
import { Sparkles, Zap, Check, Plus, RefreshCw, Star, Info, Package, X } from 'lucide-react';
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
    const dialogRef = useModalA11y(onClose);
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

    const handleFinish = () => {
        if (dontShowAgain && typeof window !== 'undefined') {
            window.localStorage.setItem('tb-onboarding-seen', '1');
        }
        onClose();
    };

    const activeLastAdded = simulatedTeam[simulatedTeam.length - 1];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-md sm:p-4" onClick={onClose} role="presentation">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="onboarding-modal-title"
                tabIndex={-1}
                className="relative flex max-h-[95vh] w-full max-w-4xl flex-col rounded-3xl border border-border bg-surface shadow-2xl animate-scale-in focus:outline-none overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5 bg-surface-raised">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                                    {pt ? 'Simulador Interativo' : 'Interactive Simulator'}
                                </span>
                                <span className="rounded-full bg-success/20 px-2 py-0.5 text-[9px] font-bold text-success border border-border">
                                    {pt ? 'Teste clicando no Grid abaixo' : 'Click Grid below to Test'}
                                </span>
                            </div>
                            <h2 id="onboarding-modal-title" className="text-base font-extrabold text-fg truncate">
                                {pt ? 'Como funciona a adição automática de Pokémon & Megas' : 'How automatic Pokémon & Mega additions work'}
                            </h2>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl p-2 text-muted hover:bg-surface-raised hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
                        aria-label={pt ? 'Fechar' : 'Close'}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </header>

                {/* Body Content - Simulated Interface Split View */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5 space-y-4">

                    {/* Simulated Interface Container */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

                        {/* LEFT COLUMN: Simulated Team Roster */}
                        <div className="lg:col-span-5 flex flex-col gap-3">
                            <div className="rounded-2xl border border-border bg-surface-raised p-3.5 shadow-md">
                                <div className="flex items-center justify-between gap-2 mb-3">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-fg">
                                            {pt ? 'Meu Time Atual' : 'Current Team'}
                                        </h3>
                                        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-extrabold text-primary">
                                            {simulatedTeam.length}/6
                                        </span>
                                    </div>
                                    {simulatedTeam.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={handleResetDemo}
                                            className="inline-flex items-center gap-1 text-[10px] font-bold text-muted hover:text-danger transition-colors"
                                            title={pt ? 'Limpar time' : 'Clear team'}
                                        >
                                            <RefreshCw className="h-3 w-3" />
                                            {pt ? 'Limpar' : 'Clear'}
                                        </button>
                                    )}
                                </div>

                                {/* 6 Slots Grid */}
                                <div className="grid grid-cols-3 gap-2">
                                    {Array.from({ length: 6 }).map((_, idx) => {
                                        const p = simulatedTeam[idx];
                                        if (p) {
                                            // When added to slot: if it has Mega, morph into Mega Form!
                                            const isMegaMorph = p.hasMega;
                                            const spriteUrl = isMegaMorph
                                                ? getPokemonArtworkSpriteUrl(p.megaId)
                                                : getPokemonArtworkSpriteUrl(p.id);
                                            const displayName = isMegaMorph ? p.megaName : p.name;
                                            return (
                                                <div
                                                    key={`${p.id}-${idx}`}
                                                    onClick={() => handleRemoveDemoPokemon(idx)}
                                                    className="group relative flex flex-col items-center justify-center rounded-xl border border-border bg-surface p-2 text-center transition-all hover:border-danger cursor-pointer shadow-sm animate-scale-in"
                                                    title={pt ? 'Clique para remover' : 'Click to remove'}
                                                >
                                                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <X className="h-2.5 w-2.5" />
                                                    </span>
                                                    <div className="relative h-10 w-10 flex items-center justify-center">
                                                        <img
                                                            src={spriteUrl}
                                                            onError={(e) => { e.currentTarget.src = getPokemonFrontSpriteUrl(p.id); }}
                                                            alt={displayName}
                                                            className="h-10 w-10 object-contain image-pixelated"
                                                        />
                                                    </div>
                                                    <span className="mt-1 w-full truncate text-[10px] font-extrabold text-fg">
                                                        {displayName}
                                                    </span>
                                                    <span className="w-full truncate text-[8px] font-bold text-primary">
                                                        {p.item}
                                                    </span>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div
                                                key={`empty-${idx}`}
                                                className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/40 p-2 text-center"
                                            >
                                                <img src={POKEBALL_PLACEHOLDER_URL} alt="" className="h-6 w-6 opacity-25" />
                                                <span className="mt-1 text-[9px] font-semibold text-muted/60">{pt ? 'Vazio' : 'Empty'}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Active Auto-Equip Details Box */}
                            {activeLastAdded && (
                                <div className="rounded-2xl border border-border bg-surface-raised p-3.5 text-xs animate-scale-in">
                                    <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-border">
                                        <span className="flex items-center gap-1.5 font-extrabold text-primary">
                                            {activeLastAdded.hasMega ? (
                                                <>
                                                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                                                    {pt ? `Mega Stone Auto-Equipada (${activeLastAdded.name} ➔ ${activeLastAdded.megaName}):` : `Auto-Equipped Mega Stone (${activeLastAdded.name} ➔ ${activeLastAdded.megaName}):`}
                                                </>
                                            ) : (
                                                <>
                                                    <Zap className="h-3.5 w-3.5 text-warning" />
                                                    {pt ? 'Build Competitiva Auto-Carregada:' : 'Auto-Loaded Meta Build:'}
                                                </>
                                            )}
                                        </span>
                                        <span className="inline-flex items-center gap-1 rounded bg-primary/15 px-2 py-0.5 text-[9px] font-bold text-primary">
                                            <Package className="h-3 w-3" />
                                            {activeLastAdded.item}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                                        <div><span className="text-muted">{pt ? 'Habilidade:' : 'Ability:'}</span> <strong className="text-fg">{activeLastAdded.ability}</strong></div>
                                        <div><span className="text-muted">{pt ? 'Nature:' : 'Nature:'}</span> <strong className="text-fg">{activeLastAdded.nature}</strong></div>
                                        <div className="col-span-2"><span className="text-muted">EVs:</span> <strong className="text-success">{activeLastAdded.evs}</strong></div>
                                    </div>

                                    <div className="mt-2 text-[10px] font-medium text-fg/80">
                                        <span className="text-muted">{pt ? 'Golpes do Meta:' : 'Meta Moves:'}</span> {activeLastAdded.moves.join(', ')}
                                    </div>
                                </div>
                            )}

                            {!activeLastAdded && (
                                <div className="rounded-2xl border border-border bg-surface-raised p-3.5 text-center text-xs text-muted">
                                    {pt ? 'Clique em qualquer Pokémon do Grid ao lado para testar a adição!' : 'Click any Pokémon in the Grid on the right to test adding!'}
                                </div>
                            )}
                        </div>

                        {/* RIGHT COLUMN: Simulated Pokédex Grid (Pokemons shown in BASE FORM) */}
                        <div className="lg:col-span-7 flex flex-col gap-2.5">
                            <div className="flex items-center justify-between gap-2 px-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-extrabold text-fg">{pt ? 'Pokédex' : 'Pokédex Grid'}</span>
                                    <span className="text-[11px] font-semibold text-muted">({pt ? 'Clique em + Add para testar a adição' : 'Click + Add to test addition'})</span>
                                </div>
                                <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                                    <Info className="h-3 w-3" />
                                    {pt ? 'Simulação ao vivo' : 'Live Simulation'}
                                </span>
                            </div>

                            {/* Simulated Cards Grid - Base forms shown in Pokédex */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                {DEMO_POKEMON.map((mon) => {
                                    const isAdded = simulatedTeam.some((t) => t.id === mon.id);
                                    return (
                                        <div
                                            key={mon.id}
                                            className={`relative flex flex-col justify-between rounded-2xl border p-3 transition-all ${
                                                isAdded
                                                    ? 'border-primary bg-primary-soft/10 ring-1 ring-primary'
                                                    : 'border-border bg-surface hover:border-primary hover:-translate-y-0.5'
                                            }`}
                                        >
                                            {/* Topbar: Types & Star */}
                                            <div className="flex items-center justify-between gap-1 mb-1">
                                                <div className="flex items-center gap-1">
                                                    {(mon.types || []).map((tp) => (
                                                        <img
                                                            key={tp}
                                                            src={typeIcons[tp]}
                                                            alt={tp}
                                                            className="h-3.5 w-3.5 object-contain"
                                                        />
                                                    ))}
                                                </div>
                                                <Star className="h-3.5 w-3.5 text-muted/40" />
                                            </div>

                                            {/* Base Artwork Sprite in Pokédex Grid */}
                                            <div className="my-1 flex h-14 w-full items-center justify-center">
                                                <img
                                                    src={getPokemonArtworkSpriteUrl(mon.id)}
                                                    onError={(e) => { e.currentTarget.src = getPokemonFrontSpriteUrl(mon.id); }}
                                                    alt={mon.name}
                                                    className="h-12 w-12 object-contain"
                                                />
                                            </div>

                                            {/* Name & Badge */}
                                            <div className="text-center my-1">
                                                <p className="text-xs font-bold capitalize text-fg truncate">
                                                    {mon.name}
                                                </p>
                                                <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full mt-0.5 border ${
                                                    mon.hasMega ? 'bg-primary/20 text-primary border-border' : 'bg-warning/20 text-warning border-border'
                                                }`}>
                                                    {mon.hasMega ? (
                                                        <>
                                                            <Sparkles className="h-2.5 w-2.5" />
                                                            {pt ? 'Possui Mega' : 'Has Mega'}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Zap className="h-2.5 w-2.5" />
                                                            Top Meta Pick
                                                        </>
                                                    )}
                                                </span>
                                            </div>

                                            {/* Add Button */}
                                            <button
                                                type="button"
                                                onClick={() => handleAddDemoPokemon(mon)}
                                                disabled={isAdded || simulatedTeam.length >= 6}
                                                className={`mt-2 flex w-full items-center justify-center gap-1 rounded-xl py-1.5 text-xs font-extrabold transition-all ${
                                                    isAdded
                                                        ? 'bg-success/20 text-success border border-border cursor-default'
                                                        : 'bg-primary text-white hover:opacity-90 shadow-sm active:scale-95'
                                                }`}
                                            >
                                                {isAdded ? (
                                                    <>
                                                        <Check className="h-3 w-3" />
                                                        {pt ? 'Adicionado' : 'Added'}
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus className="h-3 w-3" />
                                                        + Add
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                    </div>

                    {/* Explanatory Banner Note */}
                    <div className="rounded-2xl border border-border bg-surface-raised p-3.5 flex items-start gap-3">
                        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <div className="text-xs leading-relaxed text-fg/90">
                            <strong>{pt ? 'Demonstração de Evolução Mega:' : 'Mega Evolution Demonstration:'}</strong> {pt
                                ? 'Note que no Grid da Pokédex os Pokémon aparecem na sua forma base (ex: Lucario, Charizard). Ao clicar em "+ Add", ele entra no seu time já equipado com a Mega Stone (Lucarionite / Charizardite Y) e se transforma automaticamente na sua forma Mega no slot!'
                                : 'Notice that in the Pokédex Grid, Pokémon appear in their base form (Lucario, Charizard). When clicking "+ Add", it enters your team equipped with its Mega Stone (Lucarionite / Charizardite Y) and morphs into its Mega form in the slot!'}
                        </div>
                    </div>

                </div>

                {/* Footer Controls */}
                <footer className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border px-5 py-3 bg-surface-raised">
                    <label className="flex items-center gap-2 text-xs text-muted cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={dontShowAgain}
                            onChange={(e) => setDontShowAgain(e.target.checked)}
                            className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                        />
                        <span>{pt ? 'Não mostrar este guia novamente ao entrar' : "Don't show this guide again on entry"}</span>
                    </label>

                    <button
                        type="button"
                        onClick={handleFinish}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-6 py-2.5 text-xs font-extrabold text-white hover:opacity-90 transition-opacity shadow-md w-full sm:w-auto justify-center"
                    >
                        <Check className="h-4 w-4" />
                        {pt ? 'Entendi! Começar a montar' : "Got it! Let's build"}
                    </button>
                </footer>
            </div>
        </div>
    );
}
