import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronRight, MessageCircle, Share2 } from 'lucide-react';

import '../../styles/plantao-phase3.css';
import { typeColors } from '../../constants/types';
import { useTranslation } from '../../hooks/useTranslation';
import { loadPokemonIndex } from '../../services/pokemonDataCache';
import { useAuthStore } from '../../store/useAuthStore';
import { useForumStore } from '../../store/useForumStore';
import { toast } from '../../store/useToastStore';
import { localDayKey } from '../../utils/dailyCheckin';
import { DIARY_FALLBACK_TOPIC, diaryTopicId, todayDiaryKey } from '../../utils/forumDiary';
import { localDayNumber } from '../../utils/gamesToday';
import { navigateTo } from '../../utils/navigation';
import { groundAt } from '../../utils/pixelScene';
import { getPokemonArtworkSpriteUrl } from '../../utils/pokemonSprites';
import {
    MIME_CLUE_COUNT,
    applyMimeGuess,
    applyMimeNextClue,
    dailyMimeFor,
    formatMimeShareLine,
    heightScaleMetrics,
    mimeClueSquares,
    mimeStageState,
    pickMimeCandidates,
    readMimeDayState,
    writeMimeDayState,
} from '../../utils/dailyMime';
import { Mascot } from '../Mascot';
import { PixelScene } from '../mascot/PixelScene';

const SYNC_EVENT = 'ptb:daily-mime';

/**
 * A Mímica no Diário (Fase 3 "Fantasminha de Plantão").
 *
 * Mounted in `DiaryBanner.jsx` for today's Diário room AND on `/games` as a
 * clean companion card. Uses real `<PixelScene>` (`morning` → `night` on
 * clue 4), real `<Mascot tone={primaryType} mood={...} pose={...} />`, a 1.6 m
 * trainer height scale visual (clue 2+), and the official artwork CSS
 * silhouette strictly on clue 5.
 */
export function DailyMimeCard({ inDiary = false, compact = false, className = '' }) {
    const { t, language } = useTranslation();
    const dayKey = localDayKey();
    const dayNumber = localDayNumber(Date.now());
    const { number, entry } = useMemo(() => dailyMimeFor(dayNumber), [dayNumber]);

    const [pokemonIndex, setPokemonIndex] = useState(null);
    const [state, setState] = useState(() => readMimeDayState(dayKey));
    const [scene, setScene] = useState(null);
    // Strictly false on mount: reload never replays win celebration!
    const [justWon, setJustWon] = useState(false);
    const [wrongFlash, setWrongFlash] = useState(false);
    const [animKey, setAnimKey] = useState(0);
    const [lastWrongName, setLastWrongName] = useState('');
    const [posting, setPosting] = useState(false);
    const [selectedClueIdx, setSelectedClueIdx] = useState(null);

    useEffect(() => {
        let alive = true;
        loadPokemonIndex()
            .then((list) => { if (alive) setPokemonIndex(list); })
            .catch(() => {});
        return () => { alive = false; };
    }, []);

    useEffect(() => {
        const sync = () => setState(readMimeDayState(dayKey));
        window.addEventListener(SYNC_EVENT, sync);
        return () => window.removeEventListener(SYNC_EVENT, sync);
    }, [dayKey]);

    const commitState = useCallback((next) => {
        const clean = writeMimeDayState(next);
        setState(clean);
        window.dispatchEvent(new CustomEvent(SYNC_EVENT));
        return clean;
    }, []);

    const candidates = useMemo(
        () => pickMimeCandidates(entry, pokemonIndex, dayNumber),
        [entry, pokemonIndex, dayNumber]
    );

    const scale = useMemo(() => heightScaleMetrics(entry.height), [entry.height]);
    const stage = useMemo(
        () => mimeStageState({ entry, clue: state.clue, solved: state.solved, wrongFlash }),
        [entry, state.clue, state.solved, wrongFlash]
    );

    const heightText = language === 'pt'
        ? scale.heightLabel.replace('.', ',')
        : scale.heightLabel;

    const sizeClueText = useMemo(() => {
        if (scale.band === 'tiny') return t('mime.sizeTiny', { h: heightText });
        if (scale.band === 'waist') return t('mime.sizeWaist', { h: heightText });
        if (scale.band === 'eye') return t('mime.sizeEye', { h: heightText });
        return t('mime.sizeGiant', { h: heightText });
    }, [scale.band, heightText, t]);

    const clueList = useMemo(() => [
        {
            key: 'tone',
            label: t('mime.clues.tone'),
            text: t('mime.toneText', { type: t(`types.${entry.type}`) }),
        },
        {
            key: 'size',
            label: t('mime.clues.size'),
            text: sizeClueText,
        },
        {
            key: 'gesture',
            label: t('mime.clues.gesture'),
            text: t(`mime.gestures.${entry.gesture}`),
        },
        {
            key: 'region',
            label: t('mime.clues.region'),
            text: t('mime.regionText', {
                region: t(`mime.regions.${entry.region}`),
                habitat: t(`mime.habitats.${entry.habitat}`),
            }),
        },
        {
            key: 'silhouette',
            label: t('mime.clues.silhouette'),
            text: t('mime.silhouetteText'),
        },
    ], [entry, sizeClueText, t]);

    const handleNextClue = useCallback(() => {
        if (state.solved || state.clue >= MIME_CLUE_COUNT) return;
        setLastWrongName('');
        setSelectedClueIdx(null);
        commitState(applyMimeNextClue(state));
    }, [state, commitState]);

    const handleGuess = useCallback((candidate) => {
        const { nextState, outcome } = applyMimeGuess(state, candidate.id, entry.id);
        if (outcome === 'noop') return;
        commitState(nextState);
        if (outcome === 'won') {
            setWrongFlash(false);
            setLastWrongName('');
            setSelectedClueIdx(null);
            setJustWon(true);
            setAnimKey((k) => k + 1);
            return;
        }
        setLastWrongName(candidate.name);
        setSelectedClueIdx(null);
        setWrongFlash(true);
        setAnimKey((k) => k + 1);
        window.setTimeout(() => setWrongFlash(false), 850);
    }, [state, entry.id, commitState]);

    const diaryUrl = `/feed?topic=${diaryTopicId(todayDiaryKey())}`;

    const handleShareToDiary = useCallback(async () => {
        if (posting || !state.solved) return;
        const shareLine = formatMimeShareLine({
            number,
            clue: state.solvedAtClue || state.clue,
            t,
        });
        const forum = useForumStore.getState();
        if (!useAuthStore.getState().userId) {
            await forum.sendMessage(diaryTopicId(todayDiaryKey()), shareLine);
            return;
        }
        setPosting(true);
        try {
            const diaryId = await forum.ensureDiary();
            let ok = diaryId
                ? await forum.sendMessage(diaryId, shareLine, null, null, {}, { notifyError: false })
                : false;
            if (!ok) {
                ok = await forum.sendMessage(DIARY_FALLBACK_TOPIC, shareLine, null, null, { diaryFallback: true });
            }
            if (!ok) return;
            commitState({ ...state, shared: true });
            toast.success(t('games.postedToDiary'), {
                actions: inDiary ? [] : [{ label: t('games.seeDiary'), onClick: () => navigateTo(diaryUrl) }],
            });
        } finally {
            setPosting(false);
        }
    }, [posting, state, number, t, commitState, inDiary, diaryUrl]);

    const statusLine = useMemo(() => {
        if (state.solved) {
            return t('mime.wonLine', { name: entry.name, n: state.solvedAtClue || state.clue });
        }
        if (lastWrongName) {
            return state.clue >= MIME_CLUE_COUNT
                ? t('mime.wrongLastClue', { name: lastWrongName })
                : t('mime.wrongGuess', { name: lastWrongName });
        }
        if (state.clue >= MIME_CLUE_COUNT) return t('mime.lastCluePrompt');
        if (state.clue > 1) return t('mime.clueOpened', { n: state.clue });
        return t('mime.prompt');
    }, [state.solved, state.solvedAtClue, state.clue, entry.name, lastWrongName, t]);

    const groundY = groundAt(scene, 0.54) * 100;
    const squares = state.solved ? mimeClueSquares(state.solvedAtClue || state.clue) : null;
    const maxOpenClue = state.solved ? MIME_CLUE_COUNT : state.clue;
    const activeClueIdx = selectedClueIdx !== null && selectedClueIdx < maxOpenClue
        ? selectedClueIdx
        : Math.max(0, Math.min(state.clue, MIME_CLUE_COUNT) - 1);
    const activeClue = clueList[activeClueIdx] || clueList[0];

    const actionsNode = (
        <div className="daily-mime__actions">
            {!state.solved && state.clue < MIME_CLUE_COUNT && (
                <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleNextClue}
                >
                    {t('mime.nextClue', { n: state.clue + 1 })}
                    <ChevronRight aria-hidden="true" />
                </button>
            )}

            {state.solved && !state.shared && (
                <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={posting}
                    onClick={handleShareToDiary}
                >
                    <Share2 aria-hidden="true" />
                    {t('games.postToDiary')}
                </button>
            )}

            {state.solved && state.shared && !inDiary && (
                <Link to={diaryUrl} className="btn btn-ghost btn-sm">
                    <MessageCircle aria-hidden="true" />
                    {t('games.seeDiary')}
                </Link>
            )}
        </div>
    );

    const isCompactSolved = compact && state.solved;
    const isInitialPrompt = !state.solved && !lastWrongName && state.clue === 1;

    const statusNode = (
        <p
            className={`daily-mime__status ${isInitialPrompt ? 'daily-mime__status--prompt' : ''}`}
            aria-live="polite"
        >
            {state.solved ? <strong>{statusLine}</strong> : <span>{statusLine}</span>}
            {squares && (
                <span
                    className="daily-mime__squares"
                    aria-label={t('mime.squaresAria', { n: state.solvedAtClue || state.clue })}
                >
                    {squares.map((used, idx) => (
                        <i
                            key={idx}
                            className={`daily-mime__square ${used ? 'is-used' : ''}`}
                            aria-hidden="true"
                        />
                    ))}
                </span>
            )}
        </p>
    );

    return (
        <article
            className={`daily-mime ${inDiary ? 'is-in-diary' : ''} ${compact ? 'daily-mime--compact' : ''} ${isCompactSolved ? 'is-solved-compact' : ''} ${className}`}
            style={{ '--mime-tone': typeColors[entry.type] || 'var(--mascot-brand)' }}
            aria-label={t('mime.eyebrow', { n: number })}
        >
            <div className="daily-mime__stage">
                <PixelScene
                    kind={stage.sceneKind}
                    seed={entry.id + 11}
                    onGround={setScene}
                    className="daily-mime__scene"
                />

                <span
                    className="daily-mime__bot-anchor"
                    style={{ top: `${groundY}%` }}
                >
                    <Mascot
                        size={compact ? 'lg' : 'xl'}
                        framing="body"
                        tone={stage.mascotTone}
                        mood={stage.mascotMood}
                        pose={stage.mascotPose}
                        state={state.solved ? 'done' : undefined}
                        stateKey={animKey}
                        interactive
                        seasonal={false}
                        play={justWon ? 'celebrate' : wrongFlash ? 'shake' : undefined}
                        playKey={animKey}
                        label={t('mime.stageLabel')}
                    />
                </span>

                {stage.showRuler && !isCompactSolved && (
                    <div className="daily-mime__ruler" aria-hidden="true">
                        <figure className="daily-mime__figure">
                            <span className="daily-mime__bar-wrap">
                                <svg
                                    viewBox="0 0 9 28"
                                    className="daily-mime__trainer-svg"
                                    style={{ '--bar-h': `${scale.trainerPct}%` }}
                                >
                                    <g fill="currentColor">
                                        <rect x="2" y="0" width="5" height="2" />
                                        <rect x="1" y="2" width="7" height="1" />
                                        <rect x="2" y="3" width="5" height="4" />
                                        <rect x="1" y="8" width="7" height="9" />
                                        <rect x="0" y="9" width="1" height="6" />
                                        <rect x="8" y="9" width="1" height="6" />
                                        <rect x="2" y="17" width="2" height="10" />
                                        <rect x="5" y="17" width="2" height="10" />
                                    </g>
                                </svg>
                            </span>
                            <figcaption className="daily-mime__figcap">{t('mime.trainerScale')}</figcaption>
                        </figure>
                        <figure className="daily-mime__figure">
                            <span className="daily-mime__bar-wrap">
                                <span
                                    className="daily-mime__mon-pillar"
                                    style={{ '--bar-h': `${scale.pokemonPct}%` }}
                                />
                            </span>
                            <figcaption className="daily-mime__figcap">
                                {t('mime.pokemonScale', { h: heightText })}
                            </figcaption>
                        </figure>
                    </div>
                )}

                {stage.showRegion && !isCompactSolved && (
                    <p className="daily-mime__place">
                        {t(`mime.regions.${entry.region}`)} · {t(`mime.habitats.${entry.habitat}`)}
                    </p>
                )}

                {(stage.showSilhouette || stage.revealArtwork) && (
                    <div className="daily-mime__art-frame">
                        <img
                            src={getPokemonArtworkSpriteUrl(entry.id)}
                            alt={stage.revealArtwork ? entry.name : t('mime.silhouetteLabel')}
                            width={80}
                            height={80}
                            decoding="async"
                            draggable="false"
                            className={`daily-mime__artwork ${stage.showSilhouette ? 'is-silhouette' : ''}`}
                        />
                    </div>
                )}
            </div>

            <div className="daily-mime__side">
                <div className="daily-mime__top">
                    <p className="daily-mime__eyebrow">
                        {compact && !state.solved && <span className="live-dot" aria-hidden="true" />}
                        <span>{t('mime.eyebrow', { n: number })}</span>
                    </p>
                    {!inDiary && (
                        <Link to={diaryUrl} className="daily-mime__diary-link">
                            <MessageCircle aria-hidden="true" />
                            <span>{t('mime.openDiaryRoom')}</span>
                        </Link>
                    )}
                </div>

                {isCompactSolved ? (
                    <div className="daily-mime__solved-body">
                        <span className="daily-mime__guess is-right daily-mime__solved-answer">
                            <Check aria-hidden="true" />
                            <span>{entry.name}</span>
                        </span>
                        <div className="daily-mime__footer">
                            {statusNode}
                            {actionsNode}
                        </div>
                    </div>
                ) : (
                    <>
                        <h3 className="daily-mime__title">{t('mime.title')}</h3>

                        {compact ? (
                            <div className="daily-mime__compact-clues">
                                <div className="daily-mime__clue-pills" role="tablist" aria-label={t('games.hints')}>
                                    {clueList.map((item, idx) => {
                                        const open = state.solved || idx < state.clue;
                                        const isActive = idx === activeClueIdx;
                                        return (
                                            <button
                                                key={item.key}
                                                type="button"
                                                role="tab"
                                                aria-selected={isActive}
                                                disabled={!open}
                                                className={`daily-mime__clue-pill ${open ? 'is-open' : ''} ${isActive ? 'is-active' : ''}`}
                                                onClick={() => setSelectedClueIdx(idx)}
                                            >
                                                <span className="daily-mime__clue-pill-num" aria-hidden="true">{idx + 1}</span>
                                                <span className="daily-mime__clue-pill-label">{item.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="daily-mime__active-clue">
                                    <strong className="daily-mime__clue-label">{activeClue.label}</strong>
                                    <span className="daily-mime__clue-text">{activeClue.text}</span>
                                </p>
                            </div>
                        ) : (
                            <ol className="daily-mime__clues">
                                {clueList.map((item, idx) => {
                                    const open = state.solved || idx < state.clue;
                                    return (
                                        <li key={item.key} className={`daily-mime__clue ${open ? 'is-open' : ''}`}>
                                            <span className="daily-mime__clue-num" aria-hidden="true">{idx + 1}</span>
                                            <span className="daily-mime__clue-body">
                                                <strong className="daily-mime__clue-label">{item.label}</strong>
                                                <span className="daily-mime__clue-text">
                                                    {open ? item.text : t('mime.lockedClue')}
                                                </span>
                                            </span>
                                        </li>
                                    );
                                })}
                            </ol>
                        )}

                        <div className="daily-mime__guesses" role="group" aria-label={t('mime.guessesAria')}>
                            {candidates.map((cand) => {
                                const isWrong = state.wrongIds.includes(cand.id);
                                const isRight = state.solved && cand.id === entry.id;
                                return (
                                    <button
                                        key={cand.id}
                                        type="button"
                                        disabled={state.solved || isWrong}
                                        className={`daily-mime__guess ${isWrong ? 'is-wrong' : ''} ${isRight ? 'is-right' : ''}`}
                                        onClick={() => handleGuess(cand)}
                                    >
                                        {cand.name}
                                    </button>
                                );
                            })}
                        </div>

                        {compact ? (
                            <div className="daily-mime__footer">
                                {statusNode}
                                {actionsNode}
                            </div>
                        ) : (
                            <>
                                {statusNode}
                                {actionsNode}
                            </>
                        )}
                    </>
                )}
            </div>
        </article>
    );
}

export default DailyMimeCard;
