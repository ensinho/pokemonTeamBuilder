import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Download, Link2, Plus, RotateCcw, Search, X } from 'lucide-react';

import { BottomSheet } from '../BottomSheet';
import { Loader } from '../Loader';
import { NextGameCard } from '../NextGameCard';
import { DiaryShareButton } from '../DiaryShareButton';
import { TierOpinion } from '../tierList/TierOpinion';
import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { loadPokemonIndex } from '../../services/pokemonDataCache';
import { track } from '../../services/analytics';
import { toast } from '../../store/useToastStore';
import { confirmAction } from '../../store/useConfirmStore';
import { markGameDone, useGamesToday } from '../../hooks/useGamesToday';
import { useDiaryShare } from '../../hooks/useDiaryShare';
import { localDayNumber } from '../../utils/gamesToday';
import { buildTierListShare } from '../../utils/gameShare';
import { typeColors } from '../../constants/typeChart';
import { getPokemonFrontSpriteUrl, getPokemonArtworkSpriteUrl } from '../../utils/pokemonSprites';
import { localizePath } from '../../utils/localePath';
import { deployBase } from '../../services/localeHistory';
import {
    BALL_BASE,
    BALL_INK,
    TEMPLATES_BY_ID,
    TIER_BALLS,
    TIER_KEYS,
    TIER_LIST_STORAGE_KEY,
    TIER_TEMPLATES,
    addToPool,
    boardFromShare,
    createBoard,
    dailyTierTemplate,
    decodeTierList,
    encodeTierList,
    isBoardComplete,
    keepFittingCells,
    locate,
    meetsCellRule,
    mergeTierStores,
    monLabel,
    normalizeStore,
    placeItem,
    placedCount,
    removeItem,
    searchMons,
    setCell,
    sameTierBoards,
    setTitle,
    stampChangedBoards,
    unrankAll,
} from '../../utils/tierList';
import { loadAccountTierLists, saveAccountTierLists } from '../../services/tierListSync';
import { useAuthStore } from '../../store/useAuthStore';
import '../../styles/tier-list.css';

/*
 * The tier list maker (2026-11-15, Enzo: "Charts, tipo o tierlistmaker…").
 * The rules are utils/tierList.js; this view renders a board and turns taps
 * and drags into its operations.
 *
 * - Phone first: a tap lifts a Pokémon, a tap on a rank (or on a Pokémon in
 *   it) puts it there — two taps, no precision. A mouse drags; a finger drags
 *   after a short hold, so a swipe over the pool still scrolls the page.
 * - A chart's cell opens a sheet of the Pokémon that fit it.
 * - One board per theme, kept on the device (TIER_LIST_STORAGE_KEY) and in
 *   the account (services/tierListSync.js, 2026-11-17): read when the page
 *   opens and merged board by board on when each last changed; every change
 *   goes back a moment later. A list made in one browser is there in another.
 * - "Exportar imagem" draws the board (components/tierList/drawTierList.js)
 *   and shares it where a phone can, downloads it elsewhere.
 * - The games pass (2026-11-15): one theme is the day's (`dailyTierTemplate`,
 *   first in the rail, the Live dot while the day's list is still to make);
 *   "Postar no Diário" sends the list to the forum's room of the day
 *   (utils/gameShare.js — ids only, the list's name stays here); and the
 *   moment the last Pokémon is ranked the pool's place says so and offers
 *   the three ways to show it. Finishing or sharing a list is the tier
 *   list's part of the day (`markGameDone('tierList')`).
 */

const HOLD_MS = 260;
const DRAG_SLOP = 8;

const readStore = () => {
    try {
        return normalizeStore(JSON.parse(localStorage.getItem(TIER_LIST_STORAGE_KEY) || 'null'));
    } catch {
        return normalizeStore(null);
    }
};

const writeStore = (store) => {
    try {
        localStorage.setItem(TIER_LIST_STORAGE_KEY, JSON.stringify(store));
    } catch { /* storage full or blocked: the board still works for this visit */ }
};

let indexPromise = null;
const loadMons = () => {
    if (!indexPromise) {
        indexPromise = loadPokemonIndex()
            .then((list) => list.filter((mon) => !mon.isForm))
            .catch((error) => { indexPromise = null; throw error; });
    }
    return indexPromise;
};

/** A ball glyph, drawn in CSS from the rank's canon colours. */
function TierBall({ tier }) {
    const ball = TIER_BALLS[tier];
    return <span className={`tier-ball is-${ball.ball}`} style={{ '--ball-top': ball.top, '--ball-band': ball.band, '--ball-base': BALL_BASE, '--ball-ink': BALL_INK }} aria-hidden="true" />;
}

function MonChip({ id, mon, held, onTap, onPointerDown, dragging }) {
    return (
        <button
            type="button"
            className={`tier-mon ${held ? 'is-held' : ''} ${dragging ? 'is-dragging' : ''}`}
            data-tier-item={id}
            style={{ '--mon-type': typeColors[mon?.types?.[0]] || 'var(--color-muted)' }}
            aria-pressed={held}
            aria-label={mon ? mon.label : `#${id}`}
            title={mon?.label}
            onClick={onTap}
            onPointerDown={onPointerDown}
            onContextMenu={(event) => event.preventDefault()}
        >
            <img src={getPokemonFrontSpriteUrl(id)} alt="" width={96} height={96} loading="lazy" decoding="async" draggable="false" />
        </button>
    );
}

/**
 * A list someone shared (`?r=`, utils/tierList.js decodeTierList): read-only,
 * the same ranks and cells as the editor, and the way to make one's own.
 */
function SharedList({ shared, monsById, cellLabel, onMakeMine, onStartFresh }) {
    const { t } = useTranslation();
    const template = TEMPLATES_BY_ID[shared.templateId];
    const name = t(`tierList.templates.${shared.templateId}.name`);
    const still = (id) => (
        <span
            key={id}
            className="tier-mon is-still"
            style={{ '--mon-type': typeColors[monsById.get(id)?.types?.[0]] || 'var(--color-muted)' }}
            title={monsById.get(id)?.label}
        >
            <img src={getPokemonFrontSpriteUrl(id)} alt={monsById.get(id)?.label || `#${id}`} width={96} height={96} loading="lazy" decoding="async" draggable="false" />
        </span>
    );
    return (
        <section className="tier-shared" aria-labelledby="tier-shared-title">
            <div className="tier-shared__head">
                <span className="tier-shared__kicker">{t('tierList.sharedKicker')}</span>
                <h2 id="tier-shared-title" className="tier-shared__title">{name}</h2>
                <p className="tier-shared__count">
                    {shared.kind === 'chart'
                        ? t('tierList.chosen', { n: shared.count, total: shared.total })
                        : t('tierList.sharedRanked', { n: shared.count })}
                </p>
            </div>
            {shared.kind === 'chart' ? (
                <ul className={`tier-chart ${template.cells.length <= 9 ? 'is-nine' : ''}`}>
                    {template.cells.map((cell) => {
                        const id = shared.cells[cell.key];
                        const mon = id ? monsById.get(id) : null;
                        return (
                            <li key={cell.key}>
                                <div className={`tier-cell is-still ${id ? 'is-filled' : ''}`} style={{ '--cell-tone': typeColors[cell.key] || 'var(--color-primary)' }}>
                                    <span className="tier-cell__label">{cellLabel(cell.key)}</span>
                                    <span className="tier-cell__art">
                                        {id
                                            ? <img src={getPokemonFrontSpriteUrl(id)} alt="" width={96} height={96} loading="lazy" decoding="async" draggable="false" />
                                            : <span className="tier-cell__unknown" aria-hidden="true">?</span>}
                                    </span>
                                    <span className="tier-cell__name">{mon ? mon.label : t('tierList.empty')}</span>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <ol className="tier-rows">
                    {TIER_KEYS.map((tier) => (
                        <li
                            key={tier}
                            className="tier-row"
                            style={{ '--ball-top': TIER_BALLS[tier].ball === 'ultra' ? TIER_BALLS[tier].band : TIER_BALLS[tier].top }}
                        >
                            <span className="tier-row__label">
                                <TierBall tier={tier} />
                                <span className="tier-row__letter">{tier}</span>
                            </span>
                            <div className="tier-row__lane">{shared.tiers[tier].map(still)}</div>
                        </li>
                    ))}
                </ol>
            )}
            <div className="tier-actions">
                <button type="button" className="btn btn-primary btn-lg" onClick={onMakeMine}>
                    <span>{t('tierList.makeMine')}</span>
                </button>
                <button type="button" className="btn btn-ghost" onClick={onStartFresh}>
                    <span>{t('tierList.startFresh')}</span>
                </button>
            </div>
        </section>
    );
}

export function TierListView() {
    const { t, language } = useTranslation();
    useDocumentMeta({ title: t('seo.tierList.title'), description: t('seo.tierList.description'), path: '/tier-list' });
    const [searchParams, setSearchParams] = useSearchParams();
    const sharedCode = searchParams.get('r');
    const gamesDone = useGamesToday();
    // The theme of the day: the same for everyone on this calendar day.
    const todayTheme = useMemo(() => dailyTierTemplate(localDayNumber(Date.now())), []);
    const themes = useMemo(
        () => [todayTheme, ...TIER_TEMPLATES.filter((item) => item.id !== todayTheme.id)],
        [todayTheme],
    );

    const [store, setStore] = useState(readStore);
    const templateId = store.current;
    const template = TEMPLATES_BY_ID[templateId];
    const board = store.boards[templateId] || createBoard(templateId);

    const [mons, setMons] = useState(null);
    const [loadError, setLoadError] = useState(false);
    const [held, setHeld] = useState(null);
    const [query, setQuery] = useState('');
    const [adding, setAdding] = useState(false);
    const [cellOpen, setCellOpen] = useState(null);
    const [cellQuery, setCellQuery] = useState('');
    const [exporting, setExporting] = useState(false);
    const [drag, setDrag] = useState(null);
    const [over, setOver] = useState(null);
    const dragRef = useRef({ suppressClick: false });

    useEffect(() => {
        let alive = true;
        loadMons().then((list) => { if (alive) setMons(list); }).catch(() => { if (alive) setLoadError(true); });
        return () => { alive = false; };
    }, []);

    // `?daily=1` (the Jogos page, the Diário's door) opens the theme of the
    // day, `?t=` a named one; the parameter leaves once it has been read.
    useEffect(() => {
        const wanted = searchParams.get('daily') ? todayTheme.id : searchParams.get('t');
        if (!wanted) return;
        if (TEMPLATES_BY_ID[wanted]) setStore((prev) => (prev.current === wanted ? prev : { ...prev, current: wanted }));
        setSearchParams((params) => {
            const next = new URLSearchParams(params);
            next.delete('daily');
            next.delete('t');
            return next;
        }, { replace: true });
    }, [searchParams, setSearchParams, todayTheme]);

    // Saved a moment after the last change, not on every drag frame — each
    // board that changed since the last save stamped with the time, which is
    // what decides between this device's copy and the account's.
    const savedRef = useRef(store);
    useEffect(() => {
        const timer = setTimeout(() => {
            const stamped = stampChangedBoards(savedRef.current, store, Date.now());
            savedRef.current = stamped;
            writeStore(stamped);
            if (stamped !== store) setStore(stamped);
        }, 250);
        return () => clearTimeout(timer);
    }, [store]);

    // The account's copy: read once per account, merged in (a board another
    // browser changed later wins), then this device's changes go back to it.
    const userId = useAuthStore((s) => s.userId);
    const [pulledFor, setPulledFor] = useState(null);
    const pushedRef = useRef(null);
    useEffect(() => {
        if (!userId) return undefined;
        let alive = true;
        loadAccountTierLists(userId).then((remote) => {
            if (!alive) return;
            if (remote) {
                // What came from the account is not an edit made here: no new stamp.
                savedRef.current = mergeTierStores(savedRef.current, remote);
                setStore((prev) => {
                    const merged = mergeTierStores(prev, remote);
                    return sameTierBoards(merged, prev) ? prev : merged;
                });
            }
            pushedRef.current = remote;
            setPulledFor(userId);
        });
        return () => { alive = false; };
    }, [userId]);
    useEffect(() => {
        if (!userId || pulledFor !== userId || !Object.keys(store.boards).length) return undefined;
        if (pushedRef.current && sameTierBoards(pushedRef.current, store)) return undefined;
        const timer = setTimeout(() => {
            saveAccountTierLists(userId, store).then((ok) => { if (ok) pushedRef.current = store; });
        }, 1500);
        return () => clearTimeout(timer);
    }, [store, userId, pulledFor]);

    const monsById = useMemo(() => new Map((mons || []).map((mon) => [mon.id, { ...mon, label: monLabel(mon.name) }])), [mons]);

    // A shared list, once the index can check a chart's cells against their rules.
    const shared = useMemo(() => {
        const decoded = decodeTierList(sharedCode);
        if (!decoded || !mons) return null;
        return keepFittingCells(decoded, (id) => monsById.get(id));
    }, [sharedCode, mons, monsById]);
    const sharedIsBad = Boolean(sharedCode) && Boolean(mons) && !shared;

    const leaveShared = useCallback(() => {
        setSearchParams((params) => {
            const next = new URLSearchParams(params);
            next.delete('r');
            return next;
        }, { replace: true });
    }, [setSearchParams]);

    useEffect(() => {
        if (sharedIsBad) {
            toast.error(t('tierList.badLink'));
            leaveShared();
        }
    }, [sharedIsBad, leaveShared, t]);

    const update = useCallback((change) => {
        setStore((prev) => {
            const current = prev.boards[prev.current] || createBoard(prev.current);
            const next = change(current);
            return next === current ? prev : { ...prev, boards: { ...prev.boards, [prev.current]: next } };
        });
    }, []);

    const chooseTemplate = (id) => {
        if (id === templateId) return;
        setHeld(null);
        setQuery('');
        setStore((prev) => ({ ...prev, current: id }));
    };

    // ── Tap to place ───────────────────────────────────────────────────
    const place = (target, index) => {
        if (held == null) return;
        update((b) => placeItem(b, held, target, index));
        setHeld(null);
    };
    const tapMon = (id, where, index) => (event) => {
        event.stopPropagation();
        if (dragRef.current.suppressClick) {
            dragRef.current.suppressClick = false;
            return;
        }
        if (held == null || held === id) {
            setHeld(held === id ? null : id);
            return;
        }
        // Another Pokémon is lifted: it goes right before this one.
        place(where, index);
    };

    // ── Drag ───────────────────────────────────────────────────────────
    const dropAt = (x, y) => {
        const el = document.elementFromPoint(x, y);
        const zone = el?.closest?.('[data-tier-drop]');
        if (!zone) return null;
        const target = zone.getAttribute('data-tier-drop');
        const items = [...zone.querySelectorAll('[data-tier-item]')];
        let index = items.length;
        for (let i = 0; i < items.length; i += 1) {
            const box = items[i].getBoundingClientRect();
            const sameLine = y >= box.top && y <= box.bottom;
            if ((sameLine && x < box.left + box.width / 2) || y < box.top) { index = i; break; }
        }
        return { target, index };
    };

    const startPointer = (id) => (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        const touch = event.pointerType === 'touch';
        const start = { x: event.clientX, y: event.clientY };
        const state = dragRef.current;
        state.id = id;
        state.active = false;
        const begin = (x, y) => {
            state.active = true;
            setHeld(null);
            setDrag({ id, x, y });
        };
        if (touch) state.timer = setTimeout(() => begin(start.x, start.y), HOLD_MS);
        const move = (e) => {
            const dx = e.clientX - start.x;
            const dy = e.clientY - start.y;
            if (!state.active) {
                if (Math.hypot(dx, dy) < DRAG_SLOP) return;
                if (touch) { cleanup(); return; } // a swipe: the page scrolls
                begin(e.clientX, e.clientY);
            }
            setDrag({ id, x: e.clientX, y: e.clientY });
            setOver(dropAt(e.clientX, e.clientY)?.target || null);
        };
        const noScroll = (e) => { if (state.active) e.preventDefault(); };
        const up = (e) => {
            if (state.active) {
                const drop = dropAt(e.clientX, e.clientY);
                if (drop) update((b) => placeItem(b, id, drop.target, drop.index));
                state.suppressClick = true;
                setTimeout(() => { state.suppressClick = false; }, 0);
            }
            cleanup();
        };
        const cleanup = () => {
            clearTimeout(state.timer);
            state.active = false;
            setDrag(null);
            setOver(null);
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            window.removeEventListener('pointercancel', cleanup);
            document.removeEventListener('touchmove', noScroll);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', cleanup);
        document.addEventListener('touchmove', noScroll, { passive: false });
    };

    // ── Search (adds to the pool) ──────────────────────────────────────
    const results = useMemo(() => searchMons(mons || [], query, 8), [mons, query]);
    const addMon = (id) => {
        update((b) => addToPool(b, id));
        setQuery('');
    };

    // ── Chart cells ────────────────────────────────────────────────────
    const cellLabel = useCallback((key) => {
        if (key.startsWith('gen')) return t('tierList.gen', { n: key.slice(3) });
        return t(`types.${key}`);
    }, [t]);
    const openCell = template?.cells?.find((cell) => cell.key === cellOpen) || null;
    const cellChoices = useMemo(() => {
        if (!openCell || !mons) return [];
        const fit = mons.filter((mon) => meetsCellRule(openCell.rule, mon));
        return cellQuery ? searchMons(fit, cellQuery, 60) : fit;
    }, [openCell, mons, cellQuery]);
    const pickCell = (id) => {
        update((b) => setCell(b, cellOpen, id));
        setCellOpen(null);
        setCellQuery('');
    };

    // ── Board actions ──────────────────────────────────────────────────
    const restart = async () => {
        if (!placedCount(board)) return;
        const ok = await confirmAction({
            title: t('tierList.restartTitle'),
            message: t('tierList.restartBody'),
            confirmText: t('tierList.restart'),
        });
        if (!ok) return;
        update((b) => (b.kind === 'chart' ? { ...createBoard(b.templateId), title: b.title } : unrankAll(b)));
        setHeld(null);
    };

    const templateName = t(`tierList.templates.${templateId}.name`);
    const shownTitle = board.title || templateName;

    // The list was finished just now, by this trainer's own last placement —
    // never a board that loaded finished, never a theme switched to, never a
    // list copied whole from a link. That moment is the tier list's part of
    // the day, and the pool's place offers the ways to show it.
    const complete = isBoardComplete(board);
    const completeRef = useRef({ id: templateId, complete, skip: false });
    const [justCompleted, setJustCompleted] = useState(false);
    useEffect(() => {
        const prev = completeRef.current;
        completeRef.current = { id: templateId, complete, skip: false };
        if (prev.id !== templateId || !complete) {
            setJustCompleted(false);
            return;
        }
        if (!prev.complete && !prev.skip) {
            setJustCompleted(true);
            markGameDone('tierList', { theme: templateId });
            track('tierlist_complete', { template: templateId });
        }
    }, [templateId, complete]);

    const makeMine = async () => {
        if (!shared) return;
        const mine = store.boards[shared.templateId];
        if (mine && placedCount(mine) > 0) {
            const ok = await confirmAction({
                title: t('tierList.replaceTitle'),
                message: t('tierList.replaceBody'),
                confirmText: t('tierList.makeMine'),
            });
            if (!ok) return;
        }
        setStore((prev) => ({
            current: shared.templateId,
            boards: { ...prev.boards, [shared.templateId]: { ...boardFromShare(shared), title: prev.boards[shared.templateId]?.title || '' } },
        }));
        setHeld(null);
        // A copied list arrives finished: nothing to celebrate, it is not ranked yet.
        completeRef.current = { ...completeRef.current, skip: true };
        track('tierlist_remix', { template: shared.templateId });
        leaveShared();
    };

    const startFresh = () => {
        if (shared) setStore((prev) => ({ ...prev, current: shared.templateId }));
        leaveShared();
    };

    const shareLink = async () => {
        const code = encodeTierList(board);
        if (!code) return;
        const url = `${window.location.origin}${localizePath('/tier-list', language, deployBase())}?r=${code}`;
        track('tierlist_share', { template: templateId, placed: placedCount(board) });
        markGameDone('tierList', { theme: templateId });
        const coarse = window.matchMedia?.('(pointer: coarse)').matches;
        if (coarse && navigator.share) {
            try {
                await navigator.share({ title: shownTitle, text: t('tierList.shareText'), url });
                return;
            } catch (error) {
                if (error?.name === 'AbortError') return;
            }
        }
        try {
            await navigator.clipboard.writeText(url);
            toast.success(t('tierList.linkCopied'));
        } catch {
            toast.error(t('tierList.linkFailed'));
        }
    };

    const exportImage = async () => {
        if (exporting) return;
        setExporting(true);
        try {
            const { renderTierListBlob } = await import('../tierList/drawTierList');
            const blob = await renderTierListBlob({
                board,
                monsById,
                cellLabels: Object.fromEntries((template.cells || []).map((cell) => [cell.key, cellLabel(cell.key)])),
                logoUrl: `${import.meta.env.BASE_URL}logo-mark.webp`,
                pageUrl: 'https://pokemonbuilder.app/tier-list',
                labels: { kicker: t('tierList.imageKicker'), title: shownTitle, footer: 'POKEMONBUILDER' },
            });
            if (!blob) throw new Error('no image');
            track('tierlist_export', { template: templateId, placed: placedCount(board) });
            markGameDone('tierList', { theme: templateId });
            const file = new File([blob], `tier-list-${templateId}.png`, { type: 'image/png' });
            const coarse = window.matchMedia?.('(pointer: coarse)').matches;
            if (coarse && navigator.canShare?.({ files: [file] })) {
                try {
                    await navigator.share({ files: [file], title: shownTitle, text: t('tierList.shareText') });
                    return;
                } catch (error) {
                    if (error?.name === 'AbortError') return;
                }
            }
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = file.name;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 2000);
            toast.success(t('tierList.exported'));
        } catch {
            toast.error(t('tierList.exportFailed'));
        } finally {
            setExporting(false);
        }
    };

    // Into the Diário do dia, where the day's results meet. The message
    // carries the list's link code and no text: the card names the theme.
    // The button rests as "Ver no Diário" until the list changes (its code is the key).
    const diary = useDiaryShare(encodeTierList(board));
    const postToForum = async () => {
        const share = buildTierListShare(board);
        if (!share) return;
        if (!(await diary.post({ sharedTierList: share }))) return;
        markGameDone('tierList', { theme: templateId });
        track('tierlist_forum', { template: templateId, placed: placedCount(board) });
    };

    // Escape drops what is lifted.
    useEffect(() => {
        if (held == null) return undefined;
        const onKey = (event) => { if (event.key === 'Escape') setHeld(null); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [held]);

    const renderMons = (ids, where) => ids.map((id, index) => (
        <MonChip
            key={id}
            id={id}
            mon={monsById.get(id)}
            held={held === id}
            dragging={drag?.id === id}
            onTap={tapMon(id, where, index)}
            onPointerDown={startPointer(id)}
        />
    ));

    const isChart = board.kind === 'chart';
    const placed = placedCount(board);

    if (shared) {
        return (
            <div className="tier-page">
                <SharedList shared={shared} monsById={monsById} cellLabel={cellLabel} onMakeMine={makeMine} onStartFresh={startFresh} />
                <NextGameCard game="challenge" from="tierList" />
            </div>
        );
    }

    return (
        <div className={`tier-page ${held != null ? 'is-holding' : ''}`}>
            {/* The shell's header carries the title (and, on a desktop, this line). */}
            <p className="tier-page__sub">{t('tierList.subtitle')}</p>

            <div className="tier-themes" role="listbox" aria-label={t('tierList.themes')}>
                {themes.map((item) => {
                    const isToday = item.id === todayTheme.id;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            role="option"
                            aria-selected={item.id === templateId}
                            className={`tier-theme ${item.id === templateId ? 'is-on' : ''} ${isToday ? 'is-today' : ''}`}
                            onClick={() => chooseTemplate(item.id)}
                        >
                            <span className="tier-theme__art type-platform" style={{ '--card-type': 'var(--color-primary)' }}>
                                <img src={getPokemonArtworkSpriteUrl(item.art)} alt="" width={56} height={56} loading="lazy" decoding="async" draggable="false" />
                            </span>
                            <span className="tier-theme__name">{t(`tierList.templates.${item.id}.name`)}</span>
                            {isToday ? (
                                // The day's theme: Live while today's list is still to make.
                                <span className="tier-theme__today">
                                    {!gamesDone.tierList && <span className="live-dot" aria-hidden="true" />}
                                    {t('tierList.todayTheme')}
                                </span>
                            ) : (
                                <span className="tier-theme__kind">{t(item.kind === 'chart' ? 'tierList.kindChart' : 'tierList.kindTier')}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="tier-page__body">
                <section className="tier-board" aria-label={shownTitle}>
                    <div className="tier-board__head">
                        <input
                            className="input-clean tier-board__name"
                            value={board.title}
                            placeholder={templateName}
                            maxLength={48}
                            aria-label={t('tierList.nameLabel')}
                            onChange={(event) => update((b) => setTitle(b, event.target.value))}
                        />
                        <span className="tier-board__count" aria-live="polite">
                            {t(isChart ? 'tierList.chosen' : 'tierList.ranked', { n: placed, total: isChart ? Object.keys(board.cells).length : placed + board.pool.length })}
                        </span>
                    </div>

                    {isChart ? (
                        <ul className={`tier-chart ${template.cells.length <= 9 ? 'is-nine' : ''}`}>
                            {template.cells.map((cell) => {
                                const id = board.cells[cell.key];
                                const mon = id ? monsById.get(id) : null;
                                return (
                                    <li key={cell.key}>
                                        <button
                                            type="button"
                                            className={`tier-cell ${id ? 'is-filled' : ''}`}
                                            style={{ '--cell-tone': typeColors[cell.key] || 'var(--color-primary)' }}
                                            onClick={() => setCellOpen(cell.key)}
                                            aria-label={`${cellLabel(cell.key)}: ${mon ? mon.label : t('tierList.empty')}`}
                                        >
                                            <span className="tier-cell__label">{cellLabel(cell.key)}</span>
                                            <span className="tier-cell__art">
                                                {id
                                                    ? <img src={getPokemonFrontSpriteUrl(id)} alt="" width={96} height={96} loading="lazy" decoding="async" draggable="false" />
                                                    : <span className="tier-cell__unknown" aria-hidden="true">?</span>}
                                            </span>
                                            <span className="tier-cell__name">{mon ? mon.label : t('tierList.pick')}</span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <ol className="tier-rows">
                            {TIER_KEYS.map((tier) => (
                                <li
                                    key={tier}
                                    className={`tier-row ${over === tier ? 'is-over' : ''}`}
                                    style={{ '--ball-top': TIER_BALLS[tier].ball === 'ultra' ? TIER_BALLS[tier].band : TIER_BALLS[tier].top }}
                                >
                                    <span className="tier-row__label">
                                        <TierBall tier={tier} />
                                        <span className="tier-row__letter">{tier}</span>
                                    </span>
                                    <div
                                        className="tier-row__lane"
                                        data-tier-drop={tier}
                                        role="button"
                                        tabIndex={held != null ? 0 : -1}
                                        aria-label={t('tierList.placeIn', { tier })}
                                        onClick={() => place(tier)}
                                        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); place(tier); } }}
                                    >
                                        {renderMons(board.tiers[tier], tier)}
                                    </div>
                                </li>
                            ))}
                        </ol>
                    )}
                </section>

                {!isChart && (
                    <aside className={`tier-pool ${over === 'pool' ? 'is-over' : ''}`} aria-label={t('tierList.pool')}>
                        <div className="tier-pool__head">
                            <h2 className="tier-pool__title">{t('tierList.pool')} <span className="tier-pool__count">{board.pool.length}</span></h2>
                            <p className="tier-pool__hint">{t(held != null ? 'tierList.hintHolding' : 'tierList.hint')}</p>
                            {/* A phone keeps the tray to one row: the search opens from here. */}
                            <button
                                type="button"
                                className="btn btn-ghost btn-icon btn-sm tier-pool__add"
                                aria-label={t('tierList.addPlaceholder')}
                                aria-expanded={adding}
                                onClick={() => setAdding((on) => !on)}
                            >
                                <Plus className="w-4 h-4" aria-hidden="true" />
                            </button>
                        </div>
                        <div className={`tier-pool__search ${adding || templateId === 'free' ? 'is-open' : ''}`}>
                            <Search className="tier-pool__search-icon" aria-hidden="true" />
                            <input
                                className="input-clean"
                                type="search"
                                value={query}
                                placeholder={t('tierList.addPlaceholder')}
                                aria-label={t('tierList.addPlaceholder')}
                                onChange={(event) => setQuery(event.target.value)}
                            />
                        </div>
                        {results.length > 0 && (
                            <ul className="tier-pool__results">
                                {results.map((mon) => (
                                    <li key={mon.id}>
                                        <button type="button" className="tier-result" onClick={() => addMon(mon.id)}>
                                            <img src={getPokemonFrontSpriteUrl(mon.id)} alt="" width={40} height={40} loading="lazy" decoding="async" />
                                            <span>{monLabel(mon.name)}</span>
                                            <span className="tier-result__dex">#{mon.id}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <div
                            className="tier-pool__lane"
                            data-tier-drop="pool"
                            onClick={() => place('pool')}
                        >
                            {board.pool.length
                                ? renderMons(board.pool, 'pool')
                                : <p className="tier-pool__empty">{t(templateId === 'free' && placed === 0 ? 'tierList.freeEmpty' : justCompleted ? 'tierList.poolJustDone' : 'tierList.poolDone')}</p>}
                        </div>
                        {held != null && locate(board, held) === 'pool' && templateId === 'free' && (
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { update((b) => removeItem(b, held)); setHeld(null); }}>
                                <X className="w-4 h-4" aria-hidden="true" /> {t('tierList.remove')}
                            </button>
                        )}
                    </aside>
                )}
            </div>

            {/* Three ways to show the list, one to start over. The image is the
                page's one primary; the forum comes right after it — the list
                lands in the Diário do dia, where the others' are. */}
            <div className={`tier-actions ${justCompleted ? 'is-complete' : ''}`}>
                {justCompleted && (
                    <p className="tier-actions__done" role="status">
                        <Check className="w-4 h-4" aria-hidden="true" />
                        <span>{t(isChart ? 'tierList.doneChart' : 'tierList.doneTier')}</span>
                    </p>
                )}
                <button type="button" className="btn btn-primary btn-lg" onClick={exportImage} disabled={exporting || !mons}>
                    {exporting ? <Loader size="xs" /> : <Download className="w-5 h-5" aria-hidden="true" />}
                    <span>{t('tierList.export')}</span>
                </button>
                <DiaryShareButton share={diary} onPost={postToForum} disabled={!placed} />
                <button type="button" className="btn btn-secondary" onClick={shareLink} disabled={!placed}>
                    <Link2 className="w-4 h-4" aria-hidden="true" />
                    <span>{t('tierList.shareLink')}</span>
                </button>
                <button type="button" className="btn btn-ghost" onClick={restart} disabled={!placed}>
                    <RotateCcw className="w-4 h-4" aria-hidden="true" />
                    <span>{t('tierList.restart')}</span>
                </button>
            </div>

            {/* His opinion on a complete themed list (2026-11-17). */}
            {complete && !isChart && board.templateId !== 'free' && mons && <TierOpinion board={board} monsById={monsById} />}

            <NextGameCard game="challenge" from="tierList" />

            {!mons && !loadError && <Loader size="md" scene="pokedex" block label={t('tierList.loading')} />}
            {loadError && <p className="tier-page__error">{t('tierList.loadFailed')}</p>}

            {/* What is lifted, and where it goes (2026-11-15, Enzo: "clique no Pokémon,
                depois clique na seção"). A phone shows it in a bar above the dock — the
                ranks light up, the pool may be scrolled away. */}
            {held != null && !drag && (
                <div className="tier-held" role="status">
                    <span className="tier-held__mon" style={{ '--mon-type': typeColors[monsById.get(held)?.types?.[0]] || 'var(--color-muted)' }}>
                        <img src={getPokemonFrontSpriteUrl(held)} alt="" width={96} height={96} />
                    </span>
                    <span className="tier-held__text">
                        <b>{monsById.get(held)?.label || `#${held}`}</b>
                        <span>{t('tierList.heldHint')}</span>
                    </span>
                    {locate(board, held) !== 'pool' && (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => place('pool', 0)}>{t('tierList.heldToPool')}</button>
                    )}
                    <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => setHeld(null)} aria-label={t('tierList.heldCancel')}>
                        <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                </div>
            )}

            {drag && (
                <div className="tier-ghost" // Centred on the pointer: half its 4rem size back.
                    style={{ translate: `calc(${drag.x}px - 2rem) calc(${drag.y}px - 2rem)` }} aria-hidden="true">
                    <img src={getPokemonFrontSpriteUrl(drag.id)} alt="" width={96} height={96} />
                </div>
            )}

            {cellOpen && (
                <BottomSheet onClose={() => { setCellOpen(null); setCellQuery(''); }} title={t('tierList.pickFor', { cell: cellLabel(cellOpen) })}>
                    <div className="tier-picker">
                        <div className="tier-pool__search is-open">
                            <Search className="tier-pool__search-icon" aria-hidden="true" />
                            <input
                                className="input-clean"
                                type="search"
                                value={cellQuery}
                                placeholder={t('tierList.searchPlaceholder')}
                                aria-label={t('tierList.searchPlaceholder')}
                                onChange={(event) => setCellQuery(event.target.value)}
                            />
                        </div>
                        {board.cells[cellOpen] && (
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => pickCell(null)}>
                                <X className="w-4 h-4" aria-hidden="true" /> {t('tierList.clearCell')}
                            </button>
                        )}
                        <ul className="tier-picker__grid">
                            {cellChoices.map((mon) => (
                                <li key={mon.id}>
                                    <button
                                        type="button"
                                        className={`tier-pick ${board.cells[cellOpen] === mon.id ? 'is-on' : ''}`}
                                        onClick={() => pickCell(mon.id)}
                                        aria-label={monLabel(mon.name)}
                                    >
                                        <img src={getPokemonFrontSpriteUrl(mon.id)} alt="" width={72} height={72} loading="lazy" decoding="async" />
                                        <span>{monLabel(mon.name)}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </BottomSheet>
            )}
        </div>
    );
}

export default TierListView;
