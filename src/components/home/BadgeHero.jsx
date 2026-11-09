import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Trophy } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { useGymLeaders } from '../../hooks/useGymLeaders';
import { useAuthStore } from '../../store/useAuthStore';
import { caseGame, caseLeaders, nextLeader } from '../../utils/badgeCase';
import { typeColors } from '../../constants/types';
import { SHOWDOWN_SPRITES_BASE } from '../../utils/assetHost';
import { DayHero } from './DayHero';

const TRAINER_SPRITE_BASE = `${SHOWDOWN_SPRITES_BASE}/trainers/`;

/** The hero's box while the gyms load: the same floor, so nothing below moves. */
function DayHeroPlaceholder() {
    return <section className="day-hero day-hero--placeholder" aria-hidden="true" />;
}

/**
 * The Traveler's hero (Enzo, 2026-11-09 — `personaHero()` → 'badges'): the
 * next gym leader of the game they are playing, in colour on a ground of
 * their type, and the case's progress in the player bar with "study their
 * team" as the action. The full case below the hero (BadgeCase) is still
 * where badges are tapped; this says what comes next. A full case turns the
 * hero gold — the only thing on the page that is earned that way.
 *
 * Its own chunk (CozyHomeView loads it lazily): only this persona's Home
 * reads `gym-leaders.json`.
 */
export function BadgeHero(wallpaperProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { games, status } = useGymLeaders();
    const badgeCase = useAuthStore((s) => s.badgeCase);
    const game = caseGame(games, badgeCase);

    if (!game) return status === 'error' ? null : <DayHeroPlaceholder />;

    const leaders = caseLeaders(game);
    const earned = badgeCase?.earned?.[game.key] || [];
    const next = nextLeader(leaders, earned);
    const shown = next || leaders[leaders.length - 1] || null;
    const studyPath = `/gyms?game=${encodeURIComponent(game.key)}`;

    return (
        <DayHero
            {...wallpaperProps}
            tone={next ? (typeColors[next.type] || typeColors.electric) : 'var(--brand-gold)'}
            art={shown && (
                <span className="day-hero__trainers">
                    <img
                        src={`${TRAINER_SPRITE_BASE}${shown.sprite}.png`}
                        alt=""
                        width={80}
                        height={80}
                        decoding="async"
                        fetchPriority="high"
                        className="day-hero__trainer day-hero__trainer--solo"
                        onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                    />
                </span>
            )}
            eyebrow={game.label}
            title={next ? next.name : t('badgeCase.fullTitle')}
            sub={next
                ? [t('homeToday.nextGym'), t(`types.${next.type}`), next.city].filter(Boolean).join(' · ')
                : t('badgeCase.fullBody')}
            label={t('badgeCase.title')}
            meta={t('badgeCase.count', { n: earned.length, total: leaders.length })}
            percent={leaders.length ? (earned.length / leaders.length) * 100 : 0}
            action={{
                Icon: next ? BookOpen : Trophy,
                glyph: next ? 'open' : 'lift',
                label: next ? t('homeToday.studyGym', { leader: next.name }) : t('homeToday.seeGyms'),
                short: next ? t('homeToday.studyShort') : t('homeToday.seeGymsShort'),
                onClick: () => navigate(studyPath),
            }}
        />
    );
}

export default BadgeHero;
