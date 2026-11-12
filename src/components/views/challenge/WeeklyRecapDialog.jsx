import { useState } from 'react';
import { createPortal } from 'react-dom';

import { useModalA11y } from '../../../hooks/useModalA11y';
import { useTranslation } from '../../../hooks/useTranslation';
import { CHAMPION_IDS, CHAMPION_NAMES } from '../../../utils/challengeChampions';
import { recapStart, weekRange } from '../../../utils/weeklyRecap';
import { CloseIcon } from '../../icons';
import { MascotTip } from '../../Mascot';
import { ChampionFace, PodiumStep, RankRow } from './ChallengeRanking';
import { openWeekCard } from './openWeekCard';

/*
 * Last week's Champion season, looked back on (2026-11-12, Enzo): the podium
 * — second · first · third, the winner on the board's one gold block — the
 * rest of the top ten, and the mascot saying who to congratulate, the trainer
 * first when they were up there. It opens by itself once, on the first visit
 * after the week closed; the ranking's "last week" line reopens it.
 *
 * Rows are the live Week board's (RankRow / PodiumStep): a row opens the
 * trainer's card, as it does there.
 */

/** How the mascot takes the trainer's week: the face follows the place. */
const MASCOT = {
    champion: { mood: 'radiante', pose: 'campeao' },
    podium: { mood: 'orgulhoso', pose: 'segurandoInsignia' },
    ranked: { mood: 'determinado' },
    absent: { mood: 'animado', pose: 'acenando' },
};

const formatRange = (weekKey, language) => {
    const range = weekRange(weekKey);
    if (!range) return null;
    const fmt = new Intl.DateTimeFormat(language === 'pt' ? 'pt-BR' : 'en-US', { day: 'numeric', month: 'short', timeZone: 'UTC' });
    return `${fmt.format(new Date(`${range.start}T00:00:00Z`))} – ${fmt.format(new Date(`${range.end}T00:00:00Z`))}`;
};

function RecapMessage({ recap, t }) {
    const [first, second, third] = recap.podium;
    const { outcome, mine } = recap;
    if (outcome === 'champion') {
        return <><strong>{t('challenge.recap.champion.title')}</strong>{t('challenge.recap.champion.body', { score: mine.score, days: mine.days })}</>;
    }
    if (outcome === 'podium') {
        return <><strong>{t('challenge.recap.podium.title', { place: mine.place })}</strong>{t('challenge.recap.podium.body', { winner: first.name })}</>;
    }
    if (outcome === 'ranked') {
        return <><strong>{t('challenge.recap.ranked.title', { place: mine.place, score: mine.score })}</strong>{t('challenge.recap.ranked.body', { winner: first.name })}</>;
    }
    const others = [second, third].filter(Boolean).map((row) => row.name);
    return (
        <>
            <strong>{t('challenge.recap.absent.title', { winner: first.name })}</strong>
            {others.length
                ? t('challenge.recap.absent.body', { score: first.score, names: others.join(` ${t('challenge.recap.and')} `) })
                : t('challenge.recap.absent.solo', { score: first.score })}
        </>
    );
}

/**
 * @param {object} props
 * @param {string} props.weekKey
 * @param {Record<string, ?object>} props.recaps  seasonRecap() per champion
 * @param {string} props.championId  the room's champion
 * @param {() => void} props.onClose
 */
export function WeeklyRecapDialog({ weekKey, recaps, championId, onClose }) {
    const { t, language } = useTranslation();
    const dialogRef = useModalA11y(onClose);
    const available = CHAMPION_IDS.filter((id) => recaps?.[id]);
    const [shownId, setShownId] = useState(() => recapStart(recaps, championId, CHAMPION_IDS));
    const recap = recaps?.[shownId];
    const range = formatRange(weekKey, language);
    const week = Number(String(weekKey).split('-W')[1]) || null;

    return createPortal(
        <div className="modal-scrim">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="weekly-recap-title"
                tabIndex={-1}
                className="modal-panel modal-panel--sm weekly-recap"
            >
                <div className="modal-header">
                    <div className="min-w-0 flex-1">
                        <p className="weekly-recap__eyebrow">
                            {week ? t('challenge.recap.week', { n: week }) : null}
                            {range ? ` · ${range}` : null}
                        </p>
                        <h2 id="weekly-recap-title" className="modal-title">{t('challenge.recap.title')}</h2>
                    </div>
                    <button type="button" onClick={onClose} aria-label={t('common.close')} className="modal-close">
                        <CloseIcon />
                    </button>
                </div>

                <div className="modal-body weekly-recap__body">
                    {available.length > 1 && (
                        <div className="segmented segmented--sm segmented--block" role="group" aria-label={t('challenge.recap.championLabel')}>
                            {available.map((id) => (
                                <button key={id} type="button" className="segmented__item" aria-pressed={shownId === id} onClick={() => setShownId(id)}>
                                    <ChampionFace championId={id} size="xs" />
                                    {CHAMPION_NAMES[id]}
                                </button>
                            ))}
                        </div>
                    )}

                    {recap && (
                        <>
                            <ol className="challenge-podium weekly-recap__podium" aria-label={t('challenge.recap.podiumLabel')}>
                                {[1, 0, 2].map((index) => (recap.podium[index] ? (
                                    <PodiumStep
                                        key={`${shownId}-${index}`}
                                        entry={recap.podium[index]}
                                        place={index + 1}
                                        onOpen={() => openWeekCard(recap.podium[index])}
                                    />
                                ) : <li key={`${shownId}-${index}`} aria-hidden="true" />))}
                            </ol>

                            <MascotTip size="sm" className="weekly-recap__note" {...MASCOT[recap.outcome]}>
                                <RecapMessage recap={recap} t={t} />
                            </MascotTip>

                            {recap.rest.length > 0 && (
                                <ol className="challenge-rank__list weekly-recap__list m-0 list-none p-0">
                                    {recap.rest.map((entry) => (
                                        <RankRow key={`${shownId}-${entry.place}`} entry={entry} place={entry.place} onOpen={() => openWeekCard(entry)} />
                                    ))}
                                </ol>
                            )}
                        </>
                    )}
                </div>

                <div className="modal-footer">
                    <button type="button" className="btn btn-primary btn-block" onClick={onClose}>
                        {t('challenge.recap.cta')}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}

export default WeeklyRecapDialog;
