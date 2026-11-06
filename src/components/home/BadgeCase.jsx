import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, MessageSquare } from 'lucide-react';
import '../../styles/badge-case.css';
import { useTranslation } from '../../hooks/useTranslation';
import { useGymLeaders } from '../../hooks/useGymLeaders';
import { useAuthStore } from '../../store/useAuthStore';
import { caseLeaders, chooseGame, nextLeader, toggleBadge } from '../../utils/badgeCase';
import { typeColors } from '../../constants/types';
import { SHOWDOWN_SPRITES_BASE } from '../../utils/assetHost';
import { Loader } from '../Loader';
import { useForumStore } from '../../store/useForumStore';

const TRAINER_SPRITE_BASE = `${SHOWDOWN_SPRITES_BASE}/trainers/`;
const DEFAULT_GAME = 'scarlet-violet';

/**
 * The Badge Case (2026-11-05) — the Traveler's Home. The game's eight gym
 * leaders in the case they hand badges into: a leader not beaten yet is a
 * silhouette (this app's "not yet" — the onboarding's Mewtwo), a badge won in
 * the trainer's own game is tapped here and the leader steps out in colour on
 * a gem of their type. The next leader is called out; the eighth badge is the
 * one moment, a gold case. State: utils/badgeCase.js, saved by useAuthStore.
 */
export function BadgeCase() {
    const { t } = useTranslation();
    const { games, status } = useGymLeaders();
    const badgeCase = useAuthStore((s) => s.badgeCase);
    const setBadgeCase = useAuthStore((s) => s.setBadgeCase);
    const navigate = useNavigate();
    const [isSharing, setIsSharing] = useState(false);

    const official = useMemo(() => games.filter((g) => g.kind === 'official'), [games]);
    const hacks = useMemo(() => games.filter((g) => g.kind !== 'official'), [games]);
    const game = games.find((g) => g.key === badgeCase?.game) || games.find((g) => g.key === DEFAULT_GAME) || games[0];

    if (!game) {
        return status === 'error' ? null : <Loader size="sm" label={t('badgeCase.loading')} block />;
    }

    const leaders = caseLeaders(game);
    // Into the forum's Aventuras, as a card others can answer with gym tips (social-heart B5).
    const share = async () => {
        if (isSharing) return;
        setIsSharing(true);
        const won = badgeCase?.earned?.[game.key] || [];
        const nextUp = nextLeader(leaders, won);
        const id = await useForumStore.getState().createTopic(
            t('badgeCase.shareTitle', { game: game.label, n: won.length, total: leaders.length }),
            'adventures',
            nextUp ? t('badgeCase.shareText', { leader: nextUp.name }) : t('badgeCase.shareDone'),
            null,
            {
                sharedBadgeCase: {
                    game: game.key,
                    label: game.label,
                    slots: leaders.map((l) => ({ type: l.type || null, won: won.includes(l.order) })),
                    next: nextUp ? nextUp.name : null,
                },
            },
        );
        setIsSharing(false);
        if (id) navigate(`/feed?topic=${encodeURIComponent(id)}`);
    };
    const earned = badgeCase?.earned?.[game.key] || [];
    const next = nextLeader(leaders, earned);
    const isFull = leaders.length > 0 && !next;

    return (
        <section className={`section cozy-panel card badge-case ${isFull ? 'is-full' : ''}`} aria-labelledby="badge-case-title">
            <header className="section-head">
                <h3 id="badge-case-title" className="section-title">{t('badgeCase.title')}</h3>
                <span className="section-meta">{t('badgeCase.count', { n: earned.length, total: leaders.length })}</span>
                <label className="section-action badge-case__game">
                    <span className="sr-only">{t('badgeCase.gameLabel')}</span>
                    <select
                        className="badge-case__select"
                        value={game.key}
                        onChange={(e) => setBadgeCase(chooseGame(badgeCase, e.target.value))}
                    >
                        <optgroup label={t('badgeCase.official')}>
                            {official.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
                        </optgroup>
                        {hacks.length > 0 && (
                            <optgroup label={t('badgeCase.hacks')}>
                                {hacks.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
                            </optgroup>
                        )}
                    </select>
                </label>
            </header>

            <ol className="badge-case__grid">
                {leaders.map((leader) => {
                    const won = earned.includes(leader.order);
                    const isNext = next?.order === leader.order;
                    return (
                        <li key={leader.order}>
                            <button
                                type="button"
                                className={`badge-case__slot ${won ? 'is-won' : ''} ${isNext ? 'is-next' : ''}`}
                                style={{ '--gem': typeColors[leader.type] || 'var(--color-primary)' }}
                                aria-pressed={won}
                                aria-label={t(won ? 'badgeCase.slotWon' : 'badgeCase.slotTodo', { badge: leader.badge || leader.name, leader: leader.name })}
                                onClick={() => setBadgeCase(toggleBadge(badgeCase, game.key, leader.order))}
                            >
                                <img
                                    className="badge-case__leader"
                                    src={`${TRAINER_SPRITE_BASE}${leader.sprite}.png`}
                                    alt=""
                                    width={56}
                                    height={56}
                                    loading="lazy"
                                    decoding="async"
                                    onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                                />
                                <span className="badge-case__gem" aria-hidden="true">
                                    {won && <Check />}
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ol>

            <p className="badge-case__next" aria-live="polite">
                {isFull ? (
                    <>
                        <strong>{t('badgeCase.fullTitle')}</strong> {t('badgeCase.fullBody')}
                    </>
                ) : next ? (
                    <>
                        {t('badgeCase.nextLabel')} <strong>{next.name}</strong>
                        {' · '}{t(`types.${next.type}`)}{next.city ? ` · ${next.city}` : ''}
                        {' · '}<Link to={`/gyms?game=${encodeURIComponent(game.key)}`} className="badge-case__link">{t('badgeCase.study')}</Link>
                    </>
                ) : null}
            </p>
            <div className="badge-case__foot">
                <p className="badge-case__hint">{t('badgeCase.hint')}</p>
                {earned.length > 0 && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={share} disabled={isSharing}>
                        <MessageSquare aria-hidden="true" /> {t('badgeCase.share')}
                    </button>
                )}
            </div>
        </section>
    );
}

export default BadgeCase;
