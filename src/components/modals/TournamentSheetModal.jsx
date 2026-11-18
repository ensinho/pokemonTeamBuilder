import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Check, Copy, Sparkles, X } from 'lucide-react';

import { useModalA11y } from '../../hooks/useModalA11y';
import { useTranslation } from '../../hooks/useTranslation';
import { useEntityNavigate } from '../../hooks/useEntityNavigate';
import { useReferenceStore } from '../../store/useReferenceStore';
import { useMegaStones } from '../../hooks/useMegaStones';
import { useMoveTypes } from '../../hooks/useMoveTypes';
import { toast } from '../../store/useToastStore';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { typeColors, typeIcons } from '../../constants/types';
import { getPokemonFrontSpriteUrl, resolveMegaPokemonEntry } from '../../utils/pokemonSprites';
import { itemSpriteUrl } from '../../utils/itemSuggestions';
import { toApiSlug } from '../../utils/smogonSets';
import { buildTeamMembers } from '../../utils/teamImport';
import { buildShowdownExportText } from '../../utils/showdownExport';
import { STAT_KEYS, STAT_SHOWDOWN_LABEL, normalizeSpread } from '../../utils/statKeys';
import { looksLikeStatPoints } from '../../utils/statPoints';
import { pretty } from '../../utils/metaFormat';
import { toneInk, toneWash } from '../../utils/toneInk';
import { ShowdownIcon } from '../icons';
import '../../styles/meta-view.css';

const isTopPlacement = (placement = '') => /^(champion|winner|1st|1º|campe)/i.test(String(placement).trim());

const placeBadgeClass = (rank, placement) => {
    if (rank === 1 || isTopPlacement(placement)) return 'meta-place-pill badge--gold';
    if (rank === 2 || rank === 3) return 'meta-place-pill meta-place-pill--top';
    return 'meta-place-pill';
};

const writeClipboard = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand('copy');
            ta.remove();
            return ok !== false;
        } catch {
            return false;
        }
    }
};

const formatMonSpread = (evs) => {
    if (!evs) return '';
    const norm = normalizeSpread(evs, 0);
    return STAT_KEYS
        .filter((k) => norm[k] > 0)
        .map((k) => `${norm[k]} ${STAT_SHOWDOWN_LABEL[k]}`)
        .join(' / ');
};

const SheetMemberCard = memo(function SheetMemberCard({
    mon,
    pokemonIndex,
    byStone,
    typesById,
    typeForMove,
    teamEvScale,
    t,
}) {
    const resolved = resolveMegaPokemonEntry(mon, pokemonIndex, byStone);
    const types = typesById.get(resolved.spriteId) || typesById.get(mon.id) || [];
    const primaryTone = types[0] ? typeColors[types[0]] : null;
    const itemSlug = mon.item ? toApiSlug(mon.item) : '';
    const rawTera = mon.tera || mon.teraType || '';
    const teraLow = String(rawTera).toLowerCase();
    const teraTone = teraLow ? typeColors[teraLow] : null;
    const teraKey = `types.${teraLow}`;
    const teraName = teraLow && t(teraKey) !== teraKey ? t(teraKey) : pretty(rawTera);
    const spreadText = formatMonSpread(mon.evs);
    const isSp = teamEvScale === 'sp' || looksLikeStatPoints(mon.evs);
    const moves = Array.isArray(mon.moves) ? mon.moves.slice(0, 4) : [];

    return (
        <article className="t-sheet__mon">
            <div className="t-sheet__mon-head">
                <span
                    className="t-sheet__sprite-wrap type-platform"
                    style={primaryTone ? { '--card-type': primaryTone } : undefined}
                >
                    <img
                        src={getPokemonFrontSpriteUrl(resolved.spriteId)}
                        alt={pretty(resolved.name || mon.name)}
                        loading="lazy"
                        decoding="async"
                        className="t-sheet__sprite image-pixelated"
                        onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                    />
                </span>
                <div className="t-sheet__mon-meta">
                    <div className="t-sheet__mon-name-row">
                        <span className="t-sheet__mon-name">{pretty(resolved.name || mon.name)}</span>
                        {types.length > 0 && (
                            <span className="meta-row__types" aria-hidden="true">
                                {types.slice(0, 2).map((tp) => (
                                    typeIcons[tp]
                                        ? <img key={tp} src={typeIcons[tp]} alt="" className="meta-row__type-icon" />
                                        : null
                                ))}
                            </span>
                        )}
                    </div>
                    <div className="t-sheet__item-row">
                        {itemSlug && (
                            <span className="t-sheet__item-icon">
                                <img
                                    src={itemSpriteUrl(itemSlug)}
                                    alt=""
                                    className="h-4 w-4 image-pixelated"
                                    onError={(e) => {
                                        if (e.currentTarget.parentElement) e.currentTarget.parentElement.style.display = 'none';
                                    }}
                                />
                            </span>
                        )}
                        <span className="truncate capitalize">
                            {mon.item ? pretty(mon.item) : t('meta.sheet.noItem')}
                        </span>
                    </div>
                    <div className="t-sheet__traits">
                        {mon.ability && (
                            <span className="t-sheet__trait" title={t('meta.sheet.ability')}>
                                {pretty(mon.ability)}
                            </span>
                        )}
                        {mon.nature && (
                            <span className="t-sheet__trait" title={t('meta.sheet.nature')}>
                                {pretty(mon.nature)}
                            </span>
                        )}
                        {rawTera && teamEvScale !== 'sp' && (
                            <span
                                className="t-sheet__trait"
                                style={teraTone ? { color: toneInk(teraTone), backgroundColor: toneWash(teraTone, 14) } : undefined}
                            >
                                <Sparkles className="h-3 w-3 shrink-0" aria-hidden="true" />
                                {t('meta.sheet.tera')} {teraName}
                            </span>
                        )}
                    </div>
                    {spreadText && (
                        <p className="t-sheet__spread">
                            {isSp ? t('meta.sheet.spreadSp') : t('meta.sheet.spreadEv')}: {spreadText}
                        </p>
                    )}
                </div>
            </div>

            {moves.length > 0 && (
                <div className="t-sheet__moves">
                    {moves.map((mv, idx) => {
                        const moveName = typeof mv === 'string' ? mv : mv?.name || '';
                        const mt = typeForMove(moveName);
                        const moveTone = mt ? typeColors[mt] : null;
                        return (
                            <span
                                key={`${moveName}-${idx}`}
                                className="t-sheet__move"
                                style={moveTone ? { color: toneInk(moveTone), backgroundColor: toneWash(moveTone, 14) } : undefined}
                                title={pretty(moveName)}
                            >
                                {mt && typeIcons[mt] && (
                                    <img src={typeIcons[mt]} alt="" className="h-3 w-3 shrink-0" aria-hidden="true" />
                                )}
                                <span className="t-sheet__move-name">{pretty(moveName)}</span>
                            </span>
                        );
                    })}
                </div>
            )}
        </article>
    );
});

/**
 * M3 Expressive Top-Cut Team Sheet Modal (<640px draggable bottom sheet via
 * `.modal-scrim > .modal-panel` + `useModalA11y(onClose)`).
 * Strict 0-1-2 containment: `.modal-panel` owns the sole 1px border; every
 * inner card, trait, move pill, and button separates via tonal fill.
 */
export function TournamentSheetModal({
    team,
    rank = null,
    sharePct = null,
    shareCount = null,
    onClose,
}) {
    const panelRef = useModalA11y(onClose);
    const { t, language } = useTranslation();
    const pt = language === 'pt';
    const navigate = useNavigate();
    const { linkState } = useEntityNavigate();

    const pokemonIndex = useReferenceStore((s) => s.pokemonIndex);
    const fetchPokemonIndex = useReferenceStore((s) => s.fetchPokemonIndex);
    useEffect(() => { fetchPokemonIndex(); }, [fetchPokemonIndex]);

    const byStone = useMegaStones();
    const { typeForMove } = useMoveTypes();

    const [copied, setCopied] = useState(false);
    const [importing, setImporting] = useState(false);

    const indexById = useMemo(
        () => new Map(pokemonIndex.map((p) => [p.id, p])),
        [pokemonIndex],
    );
    const typesById = useMemo(() => {
        const map = new Map();
        for (const p of pokemonIndex) if (!map.has(p.id) && p.types?.length) map.set(p.id, p.types);
        return map;
    }, [pokemonIndex]);

    const handleCopyPaste = useCallback(async () => {
        if (!team) return;
        const built = await buildTeamMembers(
            team,
            { pokemonIndex },
            { mode: 'edit', speciesClause: false },
        );
        const paste = buildShowdownExportText(built.members, {
            entryById: (id) => indexById.get(id),
        });
        if (!paste) {
            toast.error(t('meta.sheet.copyFailed'));
            return;
        }
        const ok = await writeClipboard(paste);
        if (ok) {
            setCopied(true);
            toast.success(t('meta.sheet.copiedPaste'));
            window.setTimeout(() => setCopied(false), 2000);
        } else {
            toast.error(t('meta.sheet.copyFailed'));
        }
    }, [team, pokemonIndex, indexById, t]);

    const handleOpenInBuilder = useCallback(async () => {
        if (!team || importing) return;
        setImporting(true);
        try {
            const { useActiveTeamStore } = await import('../../store/useActiveTeamStore');
            const loaded = await useActiveTeamStore.getState().importTeam({
                name: team.title || team.player || team.tournament || 'Tournament Team',
                pokemons: team.pokemons || [],
                evScale: team.evScale,
            });
            if (loaded) {
                onClose();
                navigate('/builder');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } finally {
            setImporting(false);
        }
    }, [team, importing, onClose, navigate]);

    if (!team) return null;

    const roster = Array.isArray(team.pokemons) ? team.pokemons.slice(0, 6) : [];
    const placement = team.placement || '';
    const badgeText = [rank ? `#${rank}` : null, placement || null].filter(Boolean).join(' · ');
    const unitLabel = shareCount > 1 ? (pt ? 'times' : 'teams') : (pt ? 'time' : 'team');
    const subParts = [
        team.player ? t('meta.sheet.byPlayer', { player: team.player }) : null,
        team.tournament || null,
        team.date || null,
    ].filter(Boolean);

    return (
        <div
            className="modal-scrim"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="tournament-sheet-title"
                tabIndex={-1}
                className="modal-panel modal-panel--2xl t-sheet"
            >
                <header className="modal-header">
                    <div className="t-sheet__head-main">
                        <div className="t-sheet__kicker">
                            {badgeText && (
                                <span className={placeBadgeClass(rank, placement)}>
                                    {badgeText}
                                </span>
                            )}
                            {team.format && (
                                <span className="t-sheet__meta-tag">{team.format}</span>
                            )}
                            {team.record && (
                                <span className="t-sheet__meta-tag">{team.record}</span>
                            )}
                            {sharePct != null && shareCount != null && (
                                <span className="t-sheet__meta-tag">
                                    {sharePct}% · {shareCount} {unitLabel}
                                </span>
                            )}
                        </div>
                        <h2 id="tournament-sheet-title" className="modal-title t-sheet__title">
                            {team.title || team.tournament || (pt ? 'Time de torneio' : 'Tournament team')}
                        </h2>
                        {subParts.length > 0 && (
                            <p className="t-sheet__sub">{subParts.join(' · ')}</p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="modal-close touch-target"
                        aria-label={t('meta.sheet.close')}
                    >
                        <X aria-hidden="true" />
                    </button>
                </header>

                <div className="modal-body custom-scrollbar">
                    <div className="t-sheet__grid">
                        {roster.map((mon, i) => (
                            <SheetMemberCard
                                key={mon.instanceId || `${mon.id}-${i}`}
                                mon={mon}
                                pokemonIndex={pokemonIndex}
                                byStone={byStone}
                                typesById={typesById}
                                typeForMove={typeForMove}
                                teamEvScale={team.evScale}
                                t={t}
                            />
                        ))}
                    </div>
                </div>

                <footer className="modal-footer">
                    {team.id && (
                        <Link
                            to={`/tournaments/team/${team.id}`}
                            state={linkState}
                            onClick={onClose}
                            className="btn btn-ghost btn-sm t-sheet__page-link"
                        >
                            <span>{t('meta.sheet.fullPage')}</span>
                            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                    )}
                    <button
                        type="button"
                        onClick={handleCopyPaste}
                        className="btn t-sheet__btn-copy"
                    >
                        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                        <span>{copied ? t('meta.sheet.copiedPaste') : t('meta.sheet.copyPaste')}</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleOpenInBuilder}
                        disabled={importing}
                        className="btn btn-primary"
                    >
                        <ShowdownIcon />
                        <span>{importing ? t('meta.sheet.importing') : t('meta.sheet.openInBuilder')}</span>
                    </button>
                </footer>
            </div>
        </div>
    );
}
