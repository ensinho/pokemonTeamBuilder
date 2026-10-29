import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft } from 'lucide-react';

import { useModalA11y } from '../../../hooks/useModalA11y';
import { useTrainerCosmetics } from '../../../hooks/useTrainerCosmetics';
import { useTranslation } from '../../../hooks/useTranslation';
import { useAuthStore } from '../../../store/useAuthStore';
import { AvatarSprite } from '../../AvatarSprite';
import { CloseIcon, PokeballIcon } from '../../icons';
import { FramedAvatar } from '../../rewards/FramedAvatar';
import { TrainerTitle } from '../../rewards/TrainerTitle';

const BOARDS = ['daily', 'free'];
const TEAM_SIZE = 6;

/**
 * The face a row shows: what the server stamped when they won
 * (`entry.profile`, api/_lib/challenge/ranking.js), and for your own row your
 * avatar and frame as they are now — rows never carry a uid, so `me` is the
 * only trainer whose live cosmetics the screen can ask for.
 */
function useRowFace(entry) {
    const ownUid = useAuthStore((s) => s.userId);
    const publicAvatar = useAuthStore((s) => s.publicAvatar);
    const stamped = entry.profile || {};
    const uid = entry.me ? ownUid : null;
    const cosmetics = useTrainerCosmetics(uid, { frameId: stamped.frameId, titleId: stamped.titleId });
    const own = entry.me && !entry.profile ? publicAvatar() : null;
    return {
        uid,
        frameId: stamped.frameId || null,
        titleId: cosmetics.titleId,
        level: cosmetics.level ?? stamped.level ?? null,
        pokemonId: own ? own.pokemonId : stamped.avatarPokemonId,
        isShiny: own ? own.isShiny : stamped.avatarIsShiny,
        trainerSprite: own ? own.trainerSprite : stamped.trainerSprite,
    };
}

function RankAvatar({ face, name, size }) {
    return (
        <FramedAvatar uid={face.uid} stampedFrameId={face.frameId} className={`challenge-rank__avatar shrink-0 is-${size}`}>
            <AvatarSprite
                trainerSprite={face.trainerSprite}
                pokemonId={face.pokemonId}
                isShiny={face.isShiny}
                alt={name}
                fallback={<PokeballIcon className="text-muted" />}
            />
        </FramedAvatar>
    );
}

function RankRow({ entry, place, onOpen }) {
    const { t } = useTranslation();
    const face = useRowFace(entry);
    return (
        <li>
            <button
                type="button"
                className={`challenge-rank__row rounded-lg bg-surface-raised ${entry.me ? 'is-me' : ''}`}
                onClick={onOpen}
                aria-label={t('challenge.ranking.rowLabel', { place, name: entry.name, score: entry.score })}
            >
                <span className={`challenge-rank__place font-display text-sm tabular-nums ${place === 1 ? 'is-first font-semibold' : 'text-muted'}`}>{place}</span>
                <RankAvatar face={face} name="" size="sm" />
                <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
                        <span className="truncate">{entry.name}</span>
                        {entry.me && <span className="shrink-0 rounded-full bg-primary-soft px-1.5 text-2xs text-primary">{t('challenge.ranking.youTag')}</span>}
                    </span>
                    <span className="truncate text-2xs text-muted">
                        {t('challenge.ranking.turns', { n: entry.turns })} · {t('challenge.ranking.left', { n: entry.remaining ?? 0 })}
                    </span>
                </span>
                <span className="flex flex-col items-end font-display text-base font-semibold leading-none tabular-nums">
                    {entry.score}
                    <small className="mt-1 text-2xs font-normal text-muted">{t('challenge.ranking.points')}</small>
                </span>
            </button>
        </li>
    );
}

/** Tiles of one size: an attempt's four figures, or your record's three. */
function Figures({ items, label }) {
    return (
        <dl className="challenge-rank__figures m-0 shrink-0" style={{ '--cols': items.length === 3 ? 3 : 2 }} aria-label={label}>
            {items.map(([term, value]) => (
                <div key={term} className="flex min-w-0 flex-col gap-0.5 rounded-lg bg-surface-raised">
                    <dt className="truncate text-2xs text-muted">{term}</dt>
                    <dd className="m-0 font-display text-md font-semibold tabular-nums">{value}</dd>
                </div>
            ))}
        </dl>
    );
}

/** One attempt, opened from its row: who it was, and how the battle went. */
function RankDetail({ entry, place, board, onBack }) {
    const { t, language } = useTranslation();
    const face = useRowFace(entry);
    const at = entry.at ? new Date(entry.at) : null;
    const time = at && !Number.isNaN(at.getTime())
        ? at.toLocaleTimeString(language === 'pt' ? 'pt-BR' : 'en-US', { hour: '2-digit', minute: '2-digit' })
        : '—';
    const figures = [
        ['score', entry.score],
        ['turnsLabel', entry.turns],
        ['standing', `${entry.remaining ?? 0}/${TEAM_SIZE}`],
        ['finishedAt', time],
    ];
    return (
        <div className="challenge-rank__detail">
            <button type="button" className="btn btn-ghost btn-sm self-start shrink-0" onClick={onBack}>
                <ChevronLeft aria-hidden="true" />
                {t('challenge.ranking.back')}
            </button>
            <div className="challenge-rank__card rounded-xl bg-surface-raised text-center">
                <RankAvatar face={face} name={entry.name} size="lg" />
                <p className="m-0 max-w-full truncate text-md font-semibold">{entry.name}</p>
                <TrainerTitle titleId={face.titleId} />
                <p className="m-0 text-xs text-muted">
                    {t('challenge.ranking.attempt', { place, board: t(`challenge.ranking.${board}`) })}
                    {face.level ? ` · ${t('challenge.ranking.level', { n: face.level })}` : ''}
                </p>
            </div>
            <Figures items={figures.map(([key, value]) => [t(`challenge.ranking.${key}`), value])} />
        </div>
    );
}

/**
 * The day's ranking — app UI beside the DS screen, not part of the game. Two
 * boards: the Time do dia (everyone had the same team: the fair one) and own
 * teams, each the top of the day by score, then the quicker win. A row opens
 * the attempt in place (no dialog over a dialog on a phone). Written only by
 * the server (api/_lib/challenge/ranking.js).
 *
 * Two homes: a desktop's side rail, where it also carries your record
 * (`stats`), and `ChallengeRankingSheet` where there is no room for a rail.
 */
export function ChallengeRanking({ ranks, defaultBoard = 'daily', stats = null, showTitle = true }) {
    const { t } = useTranslation();
    const [board, setBoard] = useState(BOARDS.includes(defaultBoard) ? defaultBoard : 'daily');
    const [open, setOpen] = useState(null);
    const list = ranks?.boards?.[board] || [];
    const mine = ranks?.mine?.[board] || null;
    const opened = open !== null ? list[open] : null;

    if (opened) {
        return (
            <div className="challenge-rank">
                <RankDetail entry={opened} place={open + 1} board={board} onBack={() => setOpen(null)} />
            </div>
        );
    }

    return (
        <div className="challenge-rank">
            {showTitle && <h2 className="m-0 shrink-0 truncate text-sm">{t('challenge.ranking.title')}</h2>}
            <div className="segmented segmented--sm segmented--block" role="group" aria-label={t('challenge.ranking.title')}>
                {BOARDS.map((key) => (
                    <button
                        key={key}
                        type="button"
                        className="segmented__item"
                        aria-pressed={board === key}
                        onClick={() => setBoard(key)}
                    >
                        {t(`challenge.ranking.${key}`)}
                    </button>
                ))}
            </div>
            {list.length ? (
                <ol className="challenge-rank__list custom-scrollbar m-0 list-none p-0">
                    {list.map((entry, index) => (
                        // A board is replaced whole, never reordered in place.
                        <RankRow key={`${index}-${entry.name}`} entry={entry} place={index + 1} onOpen={() => setOpen(index)} />
                    ))}
                </ol>
            ) : (
                <p className="m-0 grid flex-1 place-items-center text-center text-sm text-muted">{t('challenge.ranking.empty')}</p>
            )}
            <p className="m-0 shrink-0 text-center text-xs text-muted">
                {t('challenge.ranking.counts', { wins: ranks?.wins?.[board] || 0, played: ranks?.played?.[board] || 0 })}
                {mine ? ` · ${t('challenge.ranking.you', { place: mine })}` : ''}
            </p>
            {stats && (
                <Figures
                    label={t('challenge.rail.record')}
                    items={[
                        [t('challenge.poketch.streak'), stats.streak ?? 0],
                        [t('challenge.poketch.wins'), stats.wins ?? 0],
                        [t('challenge.poketch.played'), stats.played ?? 0],
                    ]}
                />
            )}
        </div>
    );
}

/**
 * The ranking where no rail fits (phones, narrow columns): an app dialog — a sheet below 640px.
 *
 * Portalled to <body>. Rendered in place it sat inside `.challenge-view`, a
 * size container (`container: … / inline-size`), and containment makes that
 * element the box `position: fixed` measures from and a stacking context of
 * its own: the sheet was as tall as the page, so nothing in it scrolled, and
 * the dock drew over its bottom (2026-10-29).
 */
export function ChallengeRankingSheet({ ranks, defaultBoard, stats, onClose }) {
    const { t } = useTranslation();
    const dialogRef = useModalA11y(onClose);
    return createPortal(
        <div className="modal-scrim">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="challenge-ranking-title"
                tabIndex={-1}
                className="modal-panel modal-panel--sm challenge-rank-sheet"
            >
                <div className="modal-header">
                    <h2 id="challenge-ranking-title" className="modal-title">{t('challenge.ranking.title')}</h2>
                    <button type="button" onClick={onClose} aria-label={t('common.close')} className="modal-close">
                        <CloseIcon />
                    </button>
                </div>
                <div className="modal-body">
                    <ChallengeRanking ranks={ranks} defaultBoard={defaultBoard} stats={stats} showTitle={false} />
                </div>
            </div>
        </div>,
        document.body,
    );
}
