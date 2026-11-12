import React, { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { create } from 'zustand';
import { useTranslation } from '../hooks/useTranslation';
import { NAV_HUBS } from '../constants/navHubs';
import { MascotCompanion } from './MascotCompanion';
import { useMascotBeat } from '../hooks/useMascotBeat';

/**
 * The meta hub's analyst (2026-11-11): a pose per page — the clipboard for
 * usage, pointing at the best teams, the lens over tournament teams — and a
 * nod when the trainer changes page or a filter (`emitBeat('start')`).
 * No crown or trophy: gold is only for what the trainer earned.
 */
const HUB_MASCOT = {
    meta: { meta: ['concentrado', 'analisando'], bestTeams: ['confiante', 'apontando'], tournaments: ['curioso', 'investigando'] },
};

function HubMascot({ looks, currentPage }) {
    const [beat, emit] = useMascotBeat();
    const last = useRef(currentPage);
    useEffect(() => {
        if (last.current === currentPage) return;
        last.current = currentPage;
        emit('start');
    }, [currentPage, emit]);
    const [mood, pose] = looks[currentPage] || [];
    return <MascotCompanion beat={beat} listen rest={mood} restPose={pose} size="lg" framing="body" className="hub-switch__mascot" />;
}

/**
 * The element a hub page's own toolbar portals into: the empty right half of
 * the switcher's row. Set by HubSwitch's callback ref, cleared when it leaves.
 */
const useHubSlotStore = create((set) => ({
    slot: null,
    setSlot: (slot) => set({ slot }),
}));

/**
 * The switcher at the top of a hub's pages (constants/navHubs.js): one menu
 * entry, then the choice here. Real links, so Cmd-click and Back work.
 *
 * The row is one line (2026-11-12, Enzo): the switcher on the left and the
 * page's search — whatever the page hands <HubSlot> — filling the rest at the
 * same height. A switcher alone on its row with the search stacked under it
 * left half the row empty and spent a band of height on nothing.
 */
export function HubSwitch({ hub, currentPage }) {
    const { t } = useTranslation();
    const setSlot = useHubSlotStore((s) => s.setSlot);
    const slotRef = useCallback((node) => setSlot(node), [setSlot]);
    const pages = NAV_HUBS[hub];
    if (!pages) return null;
    return (
        <div className="hub-bar">
            <nav className={`hub-switch${HUB_MASCOT[hub] ? ' hub-switch--mascot' : ''}`} aria-label={t(`nav.hub.${hub}`)}>
                {HUB_MASCOT[hub] && <HubMascot looks={HUB_MASCOT[hub]} currentPage={currentPage} />}
                <div className="segmented segmented--block hub-switch__track">
                    {pages.map((page) => {
                        const active = page.key === currentPage;
                        return (
                            <Link
                                key={page.key}
                                to={page.path}
                                className={`segmented__item touch-target--y touch-target ${active ? 'is-active' : ''}`}
                                aria-current={active ? 'page' : undefined}
                            >
                                {t(page.labelKey)}
                            </Link>
                        );
                    })}
                </div>
            </nav>
            <div className="hub-bar__slot" ref={slotRef} />
        </div>
    );
}

/**
 * A hub page's toolbar, drawn on the switcher's row. Outside a hub (or before
 * the row exists) it renders in place, so a page never loses its search.
 */
export function HubSlot({ children }) {
    const slot = useHubSlotStore((s) => s.slot);
    return slot ? createPortal(children, slot) : children;
}
