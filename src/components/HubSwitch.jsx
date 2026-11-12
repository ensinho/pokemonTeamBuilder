import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
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
 * The switcher at the top of a hub's pages (constants/navHubs.js): one menu
 * entry, then the choice here. Real links, so Cmd-click and Back work.
 */
export function HubSwitch({ hub, currentPage }) {
    const { t } = useTranslation();
    const pages = NAV_HUBS[hub];
    if (!pages) return null;
    return (
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
    );
}
