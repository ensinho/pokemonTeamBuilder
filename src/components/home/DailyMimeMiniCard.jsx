import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';

import '../../styles/plantao-phase3.css';
import { typeColors } from '../../constants/types';
import { useTranslation } from '../../hooks/useTranslation';
import { localDayKey } from '../../utils/dailyCheckin';
import {
    MIME_SYNC_EVENT,
    dailyMimeFor,
    mimeStageState,
    readMimeDayState,
} from '../../utils/dailyMime';
import { localDayNumber } from '../../utils/gamesToday';
import { groundAt } from '../../utils/pixelScene';
import { Mascot } from '../Mascot';
import { PixelScene } from '../mascot/PixelScene';

/**
 * Compact visual indicator & mini-card for today's Mímica on Home (`CozyHomeView`).
 * Shows the live `<PixelScene>` and `<Mascot>` in today's target Pokémon type tone,
 * the active clue pip strip, and 1-tap navigation straight to `/games?view=mime`.
 */
export function DailyMimeMiniCard({ onOpen, className = '' }) {
    const { t } = useTranslation();
    const dayKey = localDayKey();
    const dayNumber = localDayNumber(Date.now());
    const { number, entry } = useMemo(() => dailyMimeFor(dayNumber), [dayNumber]);

    const [state, setState] = useState(() => readMimeDayState(dayKey));
    const [scene, setScene] = useState(null);

    useEffect(() => {
        const refresh = () => setState(readMimeDayState(dayKey));
        const onVisible = () => {
            if (document.visibilityState === 'visible') refresh();
        };
        window.addEventListener(MIME_SYNC_EVENT, refresh);
        window.addEventListener('storage', refresh);
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            window.removeEventListener(MIME_SYNC_EVENT, refresh);
            window.removeEventListener('storage', refresh);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [dayKey]);

    const stage = useMemo(
        () => mimeStageState({ entry, clue: state.clue, solved: state.solved }),
        [entry, state.clue, state.solved]
    );

    const activePips = state.solved ? (state.solvedAtClue || state.clue) : state.clue;
    const groundY = groundAt(scene, 0.52) * 100;
    const toneColor = typeColors[entry.type] || 'var(--mascot-brand)';

    return (
        <button
            type="button"
            className={`daily-mime-mini ${state.solved ? 'is-solved' : ''} ${className}`}
            style={{ '--mime-tone': toneColor }}
            onClick={onOpen}
            aria-label={`${t('mime.eyebrow', { n: number })} — ${state.solved ? t('mime.wonLine', { name: entry.name, n: activePips }) : t('mime.title')}`}
        >
            <span className="daily-mime-mini__stage" aria-hidden="true">
                <PixelScene
                    kind={stage.sceneKind}
                    seed={entry.id + 11}
                    onGround={setScene}
                    className="daily-mime-mini__scene"
                />
                <span
                    className="daily-mime-mini__bot"
                    style={{ top: `${groundY}%` }}
                >
                    <Mascot
                        size="md"
                        framing="body"
                        tone={stage.mascotTone}
                        mood={stage.mascotMood}
                        pose={stage.mascotPose}
                        seasonal={false}
                    />
                </span>
            </span>

            <span className="daily-mime-mini__body">
                <span className="daily-mime-mini__top">
                    <span className="daily-mime-mini__eyebrow">
                        {!state.solved && <span className="live-dot" aria-hidden="true" />}
                        <span>{t('mime.eyebrow', { n: number })}</span>
                    </span>
                    <span className="daily-mime__squares" aria-hidden="true">
                        {[1, 2, 3, 4, 5].map((idx) => (
                            <i
                                key={idx}
                                className={`daily-mime__square ${idx <= activePips ? 'is-used' : ''}`}
                            />
                        ))}
                    </span>
                </span>

                <span className="daily-mime-mini__title">
                    {state.solved
                        ? t('mime.wonLine', { name: entry.name, n: activePips })
                        : t('mime.title')}
                </span>

                <span className="daily-mime-mini__sub">
                    {t('mime.toneText', { type: t(`types.${entry.type}`) })}
                </span>

                <span className="daily-mime-mini__cta">
                    <span>{t(state.solved ? 'mime.miniSeeCta' : 'mime.miniPlayCta')}</span>
                    <ChevronRight aria-hidden="true" />
                </span>
            </span>
        </button>
    );
}

export default DailyMimeMiniCard;
