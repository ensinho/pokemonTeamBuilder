import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { typeColors, typeIcons } from '../constants/types';
import { getPokemonFrontSpriteUrl, getPokemonArtworkSpriteUrl } from '../utils/pokemonSprites';
import { Sprite } from './Sprite';
import { useTranslation } from '../hooks/useTranslation';

// A bare, icon-only type mark (no border/background — just the icon, per design).
// The type name still ships as the accessible label / tooltip.
function ThreatTypeChip({ type }) {
    const { t } = useTranslation();
    const lower = String(type).toLowerCase();
    const color = typeColors[lower] || '#777';
    const icon = typeIcons[lower];
    const label = t(`types.${lower}`, { defaultValue: type });
    return icon ? (
        <img src={icon} alt={label} title={label} className="h-4 w-4 shrink-0 object-contain" />
    ) : (
        <span className="text-[10px] font-bold leading-none" style={{ color }} title={label}>{label.slice(0, 1)}</span>
    );
}

/**
 * Meta Threats — the meta Pokémon (by real usage + tournament win-rate) that most
 * pressure the current team. Intentionally understated: a quiet card that informs
 * without shouting. Renders nothing structural until the team has ≥1 member.
 *
 * `bare` drops the outer panel + header/subtitle so the list can live inside a
 * container that already supplies them (e.g. the mobile BottomSheet).
 *
 * @param {{ threats: Array, hasTeam: boolean, onOpenDetail?: (mon) => void, bare?: boolean }} props
 */
export function TeamThreats({ threats = [], hasTeam = false, onOpenDetail, bare = false }) {
    const { t } = useTranslation();

    const list = (
        <div className={bare ? 'space-y-1.5' : 'mt-3 space-y-1.5'}>
                {!hasTeam ? (
                    <p className="team-builder-empty-note !p-0 text-xs">{t('builder.threatsEmpty')}</p>
                ) : threats.length === 0 ? (
                    <p className="team-builder-empty-note !p-0 text-xs">{t('builder.threatsNone')}</p>
                ) : (
                    threats.map((thr) => {
                        const open = onOpenDetail ? () => onOpenDetail({ id: thr.id, name: thr.name, types: thr.types }) : undefined;
                        return (
                            <div
                                key={thr.id}
                                role={open ? 'button' : undefined}
                                tabIndex={open ? 0 : undefined}
                                onClick={open}
                                onKeyDown={open ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } } : undefined}
                                className={`flex items-center gap-2.5 rounded-xl border border-border bg-surface/60 px-2 py-1.5${open ? ' cursor-pointer transition-colors hover:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary' : ''}`}
                            >
                                <Sprite
                                    src={getPokemonFrontSpriteUrl(thr.id)}
                                    artworkSrc={getPokemonArtworkSpriteUrl(thr.id)}
                                    alt={thr.name || `#${thr.id}`}
                                    className="h-9 w-9 shrink-0 image-pixelated"
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[12px] font-bold capitalize text-fg">{thr.name || `#${thr.id}`}</p>
                                    <div className="mt-0.5 flex flex-wrap items-center gap-1">
                                        {(thr.types || []).map((tp) => <ThreatTypeChip key={tp} type={tp} />)}
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-1.5">
                                    {Number.isFinite(thr.winRate) && (
                                        <span className="rounded-md bg-surface-raised px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted">
                                            {t('builder.threatWinRate', { rate: thr.winRate })}
                                        </span>
                                    )}
                                    <span className="rounded-md bg-surface-raised px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted">
                                        {t('builder.threatWeak', { count: thr.weakCount, total: thr.teamSize })}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
        </div>
    );

    if (bare) return list;

    return (
        <section className="team-builder-panel p-4">
            <div className="flex items-center justify-start gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                <h3 className="team-builder-panel__title team-builder-panel__title--compact">{t('builder.threatsTitle')}</h3>
            </div>
            <p className="mt-1 text-[11px] text-muted">{t('builder.threatsSubtitle')}</p>
            {list}
        </section>
    );
}
