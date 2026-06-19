import React, { useMemo } from 'react';
import { PokeballIcon, SwordsIcon, CloseIcon } from '../icons';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { getTeamPokemonDisplaySprite } from '../../utils/pokemonSprites';
import { Download } from 'lucide-react';
import { useModalA11y } from '../../hooks/useModalA11y';

export function UserProfileModal({ isOpen, profile, onClose, messages = [], handleImportTeam, language = 'en' }) {
    const dialogRef = useModalA11y(isOpen ? onClose : null);

    const userSharedTeams = useMemo(() => {
        if (!isOpen || !profile) return [];
        const teamsMap = new Map();
        messages.forEach(msg => {
            if (msg.createdBy === profile.userId && msg.sharedTeam) {
                teamsMap.set(msg.sharedTeam.name, msg.sharedTeam);
            }
        });
        return Array.from(teamsMap.values());
    }, [isOpen, profile, messages]);

    if (!isOpen || !profile) return null;

    const { name, avatar, isShiny } = profile;

    const isMsgAdmin = profile.userId === 'system' || profile.userEmail === 'enzopo625@gmail.com' || name === 'Professor Oak';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="user-profile-modal-title"
                tabIndex={-1}
                className="relative w-full max-w-md bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-scale-in outline-none"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    aria-label="Close"
                    className="absolute top-3 right-3 text-muted hover:text-fg p-1.5 rounded-lg hover:bg-surface-raised transition-colors z-10"
                >
                    <CloseIcon className="w-5 h-5" />
                </button>

                {/* Trainer Card Header */}
                <div className="relative h-24 bg-gradient-to-r from-primary/30 to-primary/10 border-b border-border flex items-end px-6 pb-3">
                    <div className="absolute top-2 left-3 text-[9px] font-mono text-muted uppercase tracking-widest">
                        Gengar Trainer ID: #{profile.userId.slice(0, 8)}
                    </div>
                </div>

                {/* Profile Avatar Offset */}
                <div className="px-6 pb-6 relative">
                    <div className="flex items-end justify-between -mt-10 mb-4">
                        <div className="w-20 h-20 rounded-full bg-surface-raised border-2 border-primary flex items-center justify-center overflow-hidden shadow-lg relative">
                            {avatar ? (
                                <img
                                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${isShiny ? 'shiny/' : ''}${avatar}.png`}
                                    alt={name}
                                    className="w-20 h-20 object-contain sprite-fade"
                                    onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                />
                            ) : (
                                <PokeballIcon className="w-10 h-10 text-muted opacity-30" />
                            )}
                        </div>
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary-soft text-primary border border-primary-border">
                            {isMsgAdmin ? 'LIGA DE ELITE' : 'TREINADOR'}
                        </span>
                    </div>

                    {/* Trainer Info */}
                    <div className="space-y-1">
                        <h3 id="user-profile-modal-title" className="text-lg font-bold text-fg flex items-center gap-1.5">
                            @{name}
                        </h3>
                        <p className="text-xs text-muted">
                            {language === 'pt' ? 'Membro ativo da comunidade Gengar Team Builder.' : 'Active member of the Gengar Team Builder community.'}
                        </p>
                    </div>

                    {/* Shared Teams Section */}
                    <div className="mt-6 space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1 border-b border-border pb-1">
                            <SwordsIcon className="w-3.5 h-3.5 text-primary" />
                            {language === 'pt' ? 'Times Compartilhados Recentes' : 'Recent Shared Teams'}
                        </h4>

                        {userSharedTeams.length === 0 ? (
                            <p className="text-xs text-muted italic py-2 text-center">
                                {language === 'pt' ? 'Nenhum time compartilhado neste chat ainda.' : 'No teams shared in this chat yet.'}
                            </p>
                        ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                {userSharedTeams.map((team, idx) => (
                                    <div key={idx} className="bg-surface-raised border border-border rounded-lg p-2.5 flex flex-col gap-2 transition-colors hover:border-primary-border">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs font-bold text-fg truncate">🎒 {team.name}</span>
                                            <button
                                                onClick={() => {
                                                    handleImportTeam(team);
                                                    onClose();
                                                }}
                                                className="btn btn-primary py-0.5 px-2 h-6 text-[10px] font-bold flex items-center gap-0.5"
                                            >
                                                <Download className="w-3 h-3 text-white" />
                                                {language === 'pt' ? 'Importar' : 'Import'}
                                            </button>
                                        </div>
                                        <div className="flex gap-1.5">
                                            {Array.from({ length: 6 }).map((_, slotIdx) => {
                                                const pk = team.pokemons?.[slotIdx];
                                                const spriteUrl = pk ? getTeamPokemonDisplaySprite(pk) : null;
                                                return (
                                                    <div key={slotIdx} className="w-8 h-8 rounded border border-border bg-surface flex items-center justify-center overflow-hidden shrink-0">
                                                        {spriteUrl ? (
                                                            <img
                                                                src={spriteUrl}
                                                                alt={pk.name}
                                                                className="w-7 h-7 object-contain"
                                                                onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                                            />
                                                        ) : (
                                                            <PokeballIcon className="w-4 h-4 text-muted opacity-10" />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
