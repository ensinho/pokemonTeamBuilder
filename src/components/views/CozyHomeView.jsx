import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronRight, Hourglass, Palette, Pencil, Plus, Shield, Sparkles, Swords } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useForumStore } from '../../store/useForumStore';
import { useActiveTeamStore } from '../../store/useActiveTeamStore';
import { useTranslation } from '../../hooks/useTranslation';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useTrainerBadges } from '../../hooks/useTrainerBadges';
import { useMetaUsage } from '../../hooks/useMetaUsage';
import { useDailyPuzzle } from '../../hooks/useDailyPuzzle';
import { maxWidthBelow } from '../../constants/breakpoints';
import { typeColors, typeIcons } from '../../constants/types';
import { loadPokemonIndex } from '../../services/pokemonDataCache';
import { getPokemonArtworkSpriteUrl, getPokemonFrontSpriteUrl, getTeamPokemonDisplaySprite } from '../../utils/pokemonSprites';
import { formatForumTime } from '../../utils/forumTime';
import {
    TEAM_SIZE,
    TYPE_COUNT,
    dayPeriod,
    editedParts,
    findMetaAnswer,
    pickNextBadge,
    resolveMembers,
    summarizeTeam,
    trainerIdFromUid,
} from '../../utils/homeStatus';
import { PartnerFlare } from '../PartnerFlare';
import { Sprite } from '../Sprite';
import { TypeChip } from '../TypeChip';
import { EmptyState } from '../EmptyState';
import { Loader } from '../Loader';
import { SHARE_BACKGROUNDS, getBackgroundById } from '../../assets/backgrounds';
import '../../styles/cozy-home.css';

/**
 * The cozy Home (2026-10-06 proposal). One trainer card that says where the
 * team in progress stands, the three things that are "today", and the
 * trainer's own story — tinted by the partner Pokémon's type, not by a
 * template's accent. The GitHub-repo metaphor of the classic Home is gone:
 * this reads as a Trainer Card. `onUseClassic` switches back (AppLayout keeps
 * the choice).
 */

const PERIOD_PARTNER = { morning: 196, afternoon: 25, evening: 197, night: 197 };
const TABS = ['today', 'teams', 'meta', 'community'];

const displayName = (name = '') =>
    name.split('-').filter(Boolean).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');

const stripDot = (s) => s.replace(/\./g, '').replace(/\sde\s/g, ' ').trim();

const useNow = () => {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 60 * 1000);
        return () => clearInterval(id);
    }, []);
    return now;
};

/**
 * Every panel on this page opens the same way: the design system's section
 * head (title, an optional qualifier, the action at the far end), then the
 * content. `card` puts it on a card; without it the section sits on the page
 * (the Meta list brings its own .data-list surface).
 */
const Panel = ({ title, meta, action, card = true, children }) => (
    <section className={`section cozy-panel ${card ? 'card' : ''}`}>
        <header className="section-head">
            <h3 className="section-title">{title}</h3>
            {meta && <span className="section-meta">{meta}</span>}
            {action && <span className="section-action">{action}</span>}
        </header>
        {children}
    </section>
);

/** Six Poké Balls, like the party row in battle: a member fills one, an empty slot is dashed. */
const PartyBalls = ({ size }) => (
    <span className="cozy-party" aria-hidden="true">
        {Array.from({ length: TEAM_SIZE }, (_, i) => (
            <svg key={i} viewBox="0 0 16 16" className={`cozy-party__ball ${i < size ? 'is-filled' : ''}`}>
                <circle cx="8" cy="8" r="6.5" className="cozy-party__rim" />
                {i < size && <path d="M1.5 8a6.5 6.5 0 0 1 13 0z" className="cozy-party__top" />}
                <path d="M1.5 8h13" className="cozy-party__band" />
                <circle cx="8" cy="8" r="2" className="cozy-party__button" />
            </svg>
        ))}
    </span>
);

export function CozyHomeView({
    navigate,
    savedTeams = [],
    favoritePokemons,
    greetingPokemonId,
    greetingPokemonIsShiny,
    onOpenPokemonSelector,
    handleEditTeam,
    activeTeamId,
    heroBackgroundId,
    onChangeHeroBackground,
    onUseClassic,
}) {
    const { t, language } = useTranslation();
    const isPhone = useMediaQuery(maxWidthBelow('lg'));
    // Every sprite on this page is the Pokédex's own: the pixel front sprite
    // through <Sprite> (placeholder, fade-in, artwork fallback for forms).
    const dexSprite = (id, shiny = false) => getPokemonFrontSpriteUrl(id, { shiny });
    const now = useNow();
    const [tab, setTab] = useState('today');

    const { userId, streak } = useAuthStore();
    const { badges, equippedBadge } = useTrainerBadges();
    const { ranked: metaRanked, format: metaFormat, status: metaStatus } = useMetaUsage();
    const puzzle = useDailyPuzzle(userId);

    // The Pokédex index carries names and types for every id; saved slots and
    // usage rows only carry ids, so everything here resolves through it.
    const [indexById, setIndexById] = useState(() => new Map());
    useEffect(() => {
        let cancelled = false;
        loadPokemonIndex()
            .then((index) => { if (!cancelled) setIndexById(new Map(index.map((p) => [p.id, p]))); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, []);
    const typesById = useMemo(() => new Map([...indexById].map(([id, p]) => [id, p.types || []])), [indexById]);

    // Forum: the same "Teams" topic the classic Home mirrors.
    const { topics, messages, initTopicsListener, setCurrentTopicId } = useForumStore();
    const teamsTopicId = useMemo(() => {
        const byTitle = topics.find((tp) => (tp.title || '').trim().toLowerCase() === 'teams');
        return byTitle?.id || topics.find((tp) => tp.category === 'teams')?.id || null;
    }, [topics]);
    useEffect(() => { initTopicsListener(); }, [initTopicsListener]);
    useEffect(() => { if (teamsTopicId) setCurrentTopicId(teamsTopicId); }, [teamsTopicId, setCurrentTopicId]);

    const period = dayPeriod(now.getHours());

    // The banner's scene: the wallpaper the user picked (shared with the classic
    // Home), or one per day of the year until they pick.
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    const wallpaper = (heroBackgroundId && getBackgroundById(heroBackgroundId))
        || SHARE_BACKGROUNDS[dayOfYear % SHARE_BACKGROUNDS.length];
    const [wallpaperChanged, setWallpaperChanged] = useState(false);
    const cycleWallpaper = () => {
        if (!onChangeHeroBackground || SHARE_BACKGROUNDS.length < 2) return;
        const i = SHARE_BACKGROUNDS.findIndex((bg) => bg.id === wallpaper?.id);
        setWallpaperChanged(true);
        onChangeHeroBackground(SHARE_BACKGROUNDS[(i + 1) % SHARE_BACKGROUNDS.length].id);
    };
    const locale = language === 'pt' ? 'pt-BR' : 'en-GB';
    const shortDate = (date) => stripDot(new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(date));
    const clockLine = [
        stripDot(new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(now)),
        shortDate(now),
    ].join(' ');
    const clock = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const whenLabel = (iso) => {
        const parts = editedParts(iso, now);
        if (!parts) return '';
        if (parts.kind === 'today') return t('cozyHome.when.today', { time: parts.time });
        if (parts.kind === 'yesterday') return t('cozyHome.when.yesterday', { time: parts.time });
        if (parts.kind === 'days') return t('cozyHome.when.days', { n: parts.n });
        if (parts.kind === 'weeks') return parts.n === 1 ? t('cozyHome.when.weeksOne') : t('cozyHome.when.weeks', { n: parts.n });
        return shortDate(parts.date);
    };
    const journeyDate = (iso) => {
        const parts = editedParts(iso, now);
        if (!parts) return '';
        if (parts.kind === 'today') return t('cozyHome.jToday');
        if (parts.kind === 'yesterday') return t('cozyHome.jYesterday');
        return shortDate(parts.date);
    };
    const typeName = (type) => t(`types.${type}`);

    // ── The team in progress ────────────────────────────────────────────────
    const activeTeam = savedTeams.find((team) => team.id === activeTeamId) || savedTeams[0] || null;
    const summary = useMemo(() => summarizeTeam(activeTeam, typesById), [activeTeam, typesById]);

    const partnerId = greetingPokemonId || PERIOD_PARTNER[period];
    const partner = indexById.get(partnerId);
    const partnerType = partner?.types?.[0] || 'normal';
    const partnerName = partner ? displayName(partner.name) : '';

    const heroTitle = !activeTeam
        ? t('cozyHome.titleEmpty')
        : summary.status === 'ready'
            ? t('cozyHome.titleReady')
            : summary.status === 'draft'
                ? t('cozyHome.titleDraft')
                : summary.missing === 1 ? t('cozyHome.titleMissingOne') : t('cozyHome.titleMissing', { n: summary.missing });

    const nextAction = !activeTeam
        ? t('cozyHome.actionStart')
        : summary.status !== 'ready'
            ? t('cozyHome.actionComplete', { name: activeTeam.name })
            : summary.weakness
                ? t('cozyHome.actionCover', { type: typeName(summary.weakness.type) })
                : t('cozyHome.actionBattle');

    const { currentTeam, editingTeamId, setCurrentTeam, setTeamName, setEditingTeamId } = useActiveTeamStore();
    const startNewTeam = () => {
        // Keep an unsaved draft in the builder; start clean over a saved team.
        if (currentTeam.length === 0 || editingTeamId) {
            setCurrentTeam([]);
            setTeamName('');
            setEditingTeamId(null);
        }
        navigate('/builder');
    };
    const continueTeam = () => (activeTeam ? handleEditTeam(activeTeam) : startNewTeam());
    const ctaLabel = activeTeam ? t('cozyHome.continue', { name: activeTeam.name }) : t('cozyHome.buildTeam');

    // ── Today ───────────────────────────────────────────────────────────────
    const nextBadge = useMemo(() => pickNextBadge(badges), [badges]);
    const badgeName = (badge) => (language === 'pt' ? badge.namePt : badge.nameEn);

    const metaLeader = metaRanked[0] || null;
    const metaLeaderType = (metaLeader && typesById.get(metaLeader.id)?.[0]) || 'normal';
    const metaAnswer = useMemo(
        () => findMetaAnswer(summary.members, (metaLeader && typesById.get(metaLeader.id)) || []),
        [summary.members, metaLeader, typesById],
    );

    // ── Story ───────────────────────────────────────────────────────────────
    const latestShare = useMemo(
        () => [...messages].reverse().find((m) => m.sharedTeam && m.createdBy !== userId) || null,
        [messages, userId],
    );
    const latestMessages = useMemo(() => messages.slice(-5).reverse(), [messages]);

    const journey = useMemo(() => {
        const items = [];
        if (nextBadge) {
            items.push({
                key: 'badge', when: t('cozyHome.jNext'), tone: 'accent', icon: <Sparkles />,
                title: t('cozyHome.jBadge', { badge: badgeName(nextBadge) }),
                sub: `${nextBadge.progress.current} / ${nextBadge.progress.target}`,
            });
        }
        if (puzzle.target) {
            const solved = puzzle.summary?.solved;
            items.push({
                key: 'puzzle', when: t('cozyHome.jToday'), tone: solved ? 'success' : 'warning',
                icon: solved ? <Check /> : <Hourglass />,
                title: t('cozyHome.jPuzzle', { n: puzzle.target.id }),
                sub: solved ? t('cozyHome.jSolved', { n: puzzle.summary.attempts }) : t('cozyHome.jOpen'),
                onClick: () => navigate('/pokepuzzle'),
            });
        }
        if (savedTeams[0]) {
            const team = savedTeams[0];
            const s = team === activeTeam ? summary : summarizeTeam(team, typesById);
            items.push({
                key: 'team', when: journeyDate(team.updatedAt), tone: s.status === 'ready' ? 'success' : 'neutral',
                icon: s.status === 'ready' ? <Check /> : <Pencil />,
                title: s.status === 'ready' ? t('cozyHome.jTeamComplete', { name: team.name }) : t('cozyHome.jTeamEdited', { name: team.name }),
                sub: s.status === 'ready' ? t('cozyHome.jTeamCompleteSub', { n: s.coverage }) : t('cozyHome.jTeamEditedSub', { n: s.size }),
                onClick: () => handleEditTeam(team),
            });
        }
        if (latestShare) {
            items.push({
                key: 'share', when: journeyDate(latestShare.createdAt), tone: 'sprite',
                spriteId: latestShare.creatorAvatar || 25,
                title: t('cozyHome.jShared', { name: latestShare.creatorName || 'Trainer', team: latestShare.sharedTeam.name || '—' }),
                sub: t('cozyHome.jSharedSub'),
                onClick: () => navigate('/feed'),
            });
        }
        return items;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nextBadge, puzzle, savedTeams, activeTeam, summary, typesById, latestShare, language, now]);

    // ── Pieces ──────────────────────────────────────────────────────────────
    const streakCount = streak?.count || 0;

    const chips = (
        <div className="cozy-chips">
            {streakCount > 0 && (
                <span className="cozy-chip cozy-chip--streak">
                    <span className="cozy-chip__dot" aria-hidden="true" />
                    {streakCount === 1 ? t('cozyHome.streakChipOne') : t('cozyHome.streakChip', { n: streakCount })}
                </span>
            )}
            {partner && (
                <button type="button" className="cozy-chip" onClick={onOpenPokemonSelector} title={t('cozyHome.changePartner')}
                    style={{ '--chip-type': typeColors[partnerType] }}>
                    <span className="cozy-chip__avatar">
                        <Sprite src={dexSprite(partnerId, greetingPokemonIsShiny)} className="cozy-chip__sprite" eager />
                    </span>
                    {t('cozyHome.partnerChip', { name: partnerName })}
                </button>
            )}
            {equippedBadge && (
                <span className="cozy-chip">
                    <equippedBadge.Icon className="cozy-chip__badge" />
                    {badgeName(equippedBadge)}
                </span>
            )}
            {metaFormat?.label && (
                <button type="button" className="cozy-chip cozy-chip--mono" onClick={() => navigate('/meta')}>
                    {metaFormat.label}
                </button>
            )}
        </div>
    );

    const tabs = (
        <div className={`segmented cozy-tabs ${isPhone ? 'segmented--block' : ''}`} role="group" aria-label={t('cozyHome.tabsLabel')}>
            {TABS.map((key) => (
                <button key={key} type="button" className="segmented__item" aria-pressed={tab === key} onClick={() => setTab(key)}>
                    {t(`cozyHome.tabs.${key}`)}
                </button>
            ))}
        </div>
    );

    const hero = (
        <section className="cozy-hero" style={{ '--hero-type': typeColors[partnerType] }}>
            {wallpaper && (
                // Keyed by wallpaper so a change the user asked for fades in;
                // the first paint does not (`is-changed` is set only by the click).
                <span
                    key={wallpaper.id}
                    className={`cozy-hero__scene ${wallpaperChanged ? 'is-changed' : ''}`}
                    style={{ backgroundImage: `url(${wallpaper.url})` }}
                    aria-hidden="true"
                />
            )}
            <div className="cozy-hero__top">
                <span className="cozy-hero__pill">
                    <Shield aria-hidden="true" />
                    {t('cozyHome.statusPill')}
                    <span className="cozy-hero__id">{t('cozyHome.trainerId', { id: trainerIdFromUid(userId) })}</span>
                </span>
                {onChangeHeroBackground && (
                    <button type="button" className="btn btn-icon btn-sm cozy-hero__wallpaper" onClick={cycleWallpaper}
                        aria-label={t('cozyHome.changeWallpaper', { name: wallpaper?.name || '' })} title={t('cozyHome.changeWallpaper', { name: wallpaper?.name || '' })}>
                        <Palette aria-hidden="true" />
                    </button>
                )}
            </div>

            <button type="button" className="cozy-hero__partner" onClick={onOpenPokemonSelector} aria-label={t('cozyHome.changePartner')}
                style={{ '--partner-type-color': typeColors[partnerType] }}>
                <span className="cozy-hero__platform" aria-hidden="true" />
                <span className="cozy-hero__idle">
                    <Sprite
                        src={dexSprite(partnerId, greetingPokemonIsShiny)}
                        artworkSrc={getPokemonArtworkSpriteUrl(partnerId, { shiny: greetingPokemonIsShiny })}
                        alt={partnerName}
                        className="cozy-hero__art"
                        eager
                    />
                </span>
                <PartnerFlare />
            </button>

            <div className="cozy-hero__card">
                {typeIcons[partnerType] && <img src={typeIcons[partnerType]} alt="" aria-hidden="true" className="cozy-hero__watermark" />}
                <p className="cozy-hero__clock"><span className="cozy-hero__date">{clockLine} · </span>{clock} · {t(`cozyHome.periods.${period}`)}</p>
                <h2 className="cozy-hero__title">{heroTitle}</h2>
                <p className="cozy-hero__sub">
                    {activeTeam ? (
                        <>
                            {t('cozyHome.team')} <strong>{activeTeam.name}</strong>
                            {activeTeam.updatedAt && <> · {t('cozyHome.saved', { when: whenLabel(activeTeam.updatedAt) })}</>}
                            <PartyBalls size={summary.size} />
                        </>
                    ) : t('cozyHome.subEmpty')}
                </p>

                <div className="cozy-hero__foot">
                    <dl className="cozy-hero__stats">
                        <div className="stat">
                            <dt className="stat__label">{t('cozyHome.coverage')}</dt>
                            <dd className="stat__value">{t('cozyHome.coverageValue', { n: summary.coverage, total: TYPE_COUNT })}</dd>
                        </div>
                        <div className="stat">
                            <dt className="stat__label">{t('cozyHome.weakPoint')}</dt>
                            <dd className="stat__value">
                                {summary.weakness ? (
                                    <>
                                        <TypeChip type={summary.weakness.type} size="sm" />
                                        <span>{summary.weakness.count}/{TEAM_SIZE}</span>
                                    </>
                                ) : t('cozyHome.noWeakness')}
                            </dd>
                        </div>
                        <div className="stat cozy-hero__action">
                            <dt className="stat__label">{t('cozyHome.nextAction')}</dt>
                            <dd className="stat__value">{nextAction}</dd>
                        </div>
                    </dl>
                    <button type="button" className="btn btn-lg cozy-ink cozy-hero__cta" onClick={continueTeam}>
                        <Swords aria-hidden="true" /> {ctaLabel}
                    </button>
                </div>
            </div>
        </section>
    );

    const badgeSegments = nextBadge ? Math.min(nextBadge.progress.target, 10) : 0;
    // One slot per step when the target is small; tenths of the way otherwise.
    const badgeFilled = !nextBadge ? 0
        : nextBadge.progress.target <= 10 ? nextBadge.progress.current
            : Math.floor(nextBadge.progress.percent / 10);

    const yourDay = (
        <Panel
            card={false}
            title={t('cozyHome.yourDay')}
            meta={streakCount > 0 ? t('cozyHome.streakDay', { n: streakCount }) : t('cozyHome.noStreak')}
        >
            <div className="cozy-day">
                {puzzle.target && (
                    <button type="button" className="card card--interactive cozy-day__card" style={{ '--day-tone': 'var(--color-primary)' }}
                        onClick={() => navigate('/pokepuzzle')}>
                        <span className="cozy-day__head">
                            <span className="cozy-day__tile" aria-hidden="true">
                                <Sprite
                                    src={dexSprite(puzzle.summary?.solved ? puzzle.target.id : puzzle.silhouetteId)}
                                    className={`cozy-day__sprite ${puzzle.summary?.solved ? '' : 'pokepuzzle-silhouette'}`}
                                />
                            </span>
                            {puzzle.summary?.solved
                                ? <span className="badge badge--success cozy-day__go"><Check aria-hidden="true" /> {t('cozyHome.solved')}</span>
                                : <span className="btn btn-sm cozy-ink cozy-day__go">{t('cozyHome.play')}</span>}
                        </span>
                        <span className="cozy-day__eyebrow">#{String(puzzle.target.id).padStart(3, '0')}</span>
                        <span className="cozy-day__title">{t('cozyHome.puzzleTitle')}</span>
                        <span className="cozy-day__sub">
                            {puzzle.summary?.solved
                                ? t('cozyHome.puzzleSolved', { n: puzzle.summary.attempts })
                                : t('cozyHome.puzzleOpen', { n: puzzle.target.id })}
                        </span>
                    </button>
                )}

                <button type="button" className="card card--interactive cozy-day__card" style={{ '--day-tone': 'var(--color-warning)' }}
                    onClick={() => navigate('/profile')}>
                    <span className="cozy-day__head">
                        <span className="cozy-day__tile cozy-day__tile--badge" aria-hidden="true">
                            {nextBadge ? <nextBadge.Icon /> : <Sparkles />}
                        </span>
                    </span>
                    <span className="cozy-day__eyebrow">{nextBadge ? `${nextBadge.progress.current}/${nextBadge.progress.target}` : '★'}</span>
                    <span className="cozy-day__title">{nextBadge ? badgeName(nextBadge) : t('cozyHome.allBadges')}</span>
                    <span className="cozy-day__sub">
                        {nextBadge
                            ? (language === 'pt' ? nextBadge.reqPt : nextBadge.reqEn)
                            : t('cozyHome.allBadgesSub')}
                    </span>
                    {nextBadge && (
                        <span className="cozy-case" aria-hidden="true">
                            {Array.from({ length: badgeSegments }, (_, i) => (
                                <i key={i} className={i < badgeFilled ? 'is-on' : ''} />
                            ))}
                        </span>
                    )}
                </button>

                {metaLeader && (
                    <button type="button" className="card card--interactive cozy-day__card"
                        style={{ '--day-tone': typeColors[metaLeaderType] }} onClick={() => navigate('/meta')}>
                        <span className="cozy-day__head">
                            <span className="cozy-day__tile" aria-hidden="true">
                                <Sprite src={dexSprite(metaLeader.id)} className="cozy-day__sprite" />
                            </span>
                            <span className="cozy-day__chevron"><ChevronRight aria-hidden="true" /></span>
                        </span>
                        <span className="cozy-day__eyebrow">{metaLeader.count}%</span>
                        <span className="cozy-day__title">{t('cozyHome.metaLeads', { name: displayName(metaLeader.name) })}</span>
                        <span className="cozy-day__sub">
                            {activeTeam && summary.size > 0
                                ? (metaAnswer
                                    ? t('cozyHome.metaAnswer', { team: activeTeam.name, answer: displayName(indexById.get(metaAnswer.id)?.name || metaAnswer.name || '') })
                                    : t('cozyHome.metaNoAnswer', { team: activeTeam.name }))
                                : t('cozyHome.metaShare', { pct: metaLeader.count })}
                        </span>
                    </button>
                )}
            </div>
        </Panel>
    );

    const teamStatus = (s) => (
        <span className={`badge cozy-status ${s.status === 'ready' ? 'badge--success' : s.status === 'missing' ? 'badge--warning' : ''}`}>
            {s.status === 'ready' ? t('cozyHome.statusReady')
                : s.status === 'draft' ? t('cozyHome.statusDraft')
                    : t('cozyHome.statusMissing', { n: s.missing })}
        </span>
    );

    const completeCount = useMemo(
        () => savedTeams.filter((team) => resolveMembers(team).length >= TEAM_SIZE).length,
        [savedTeams],
    );

    const teamsPanel = (limit) => (
        <Panel
            title={t('cozyHome.yourTeams')}
            meta={t('cozyHome.yourTeamsSub')}
            action={(
                <button type="button" className="btn btn-secondary btn-icon cozy-round" onClick={startNewTeam} aria-label={t('cozyHome.newTeam')}>
                    <Plus aria-hidden="true" />
                </button>
            )}
        >
            {savedTeams.length === 0 ? (
                <EmptyState
                    compact
                    title={t('cozyHome.titleEmpty')}
                    message={t('cozyHome.teamsEmpty')}
                    action={{ label: t('cozyHome.buildTeam'), onClick: startNewTeam }}
                />
            ) : (
                <ul className="cozy-teams">
                    {savedTeams.slice(0, limit).map((team) => {
                        const s = team === activeTeam ? summary : summarizeTeam(team, typesById);
                        return (
                            <li key={team.id}>
                                <button type="button" className="card card--inset card--interactive card--compact cozy-team" onClick={() => handleEditTeam(team)}>
                                    <span className="cozy-team__roster" aria-hidden="true">
                                        {s.members.slice(0, TEAM_SIZE).map((p, i) => (
                                            <span key={i} className="cozy-team__member" style={{ '--i': i }}>
                                                <Sprite src={getTeamPokemonDisplaySprite(p)} className="cozy-team__sprite" />
                                            </span>
                                        ))}
                                    </span>
                                    <span className="cozy-team__text">
                                        <span className="cozy-team__name">{team.name}</span>
                                        <span className="cozy-team__sub">
                                            {[team.updatedAt && t('cozyHome.edited', { when: whenLabel(team.updatedAt) }), t('cozyHome.ofSix', { n: s.size })]
                                                .filter(Boolean).join(' · ')}
                                        </span>
                                    </span>
                                    {teamStatus(s)}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}

            <dl className="cozy-tally">
                <div className="stat"><dt className="stat__label">{t('cozyHome.statTeams')}</dt><dd className="stat__value">{savedTeams.length}</dd></div>
                <div className="stat"><dt className="stat__label">{t('cozyHome.statComplete')}</dt><dd className="stat__value">{completeCount}</dd></div>
                <div className="stat"><dt className="stat__label">{t('cozyHome.statFavorites')}</dt><dd className="stat__value">{favoritePokemons?.size || 0}</dd></div>
            </dl>

            {savedTeams.length > limit && (
                <button type="button" className="btn btn-ghost btn-sm cozy-panel__more" onClick={() => navigate('/teams')}>
                    {t('cozyHome.seeAll')} <ChevronRight aria-hidden="true" />
                </button>
            )}
        </Panel>
    );

    const journeyPanel = (
        <Panel
            title={t('cozyHome.journey')}
            meta={streakCount > 0 ? t('cozyHome.journeyDay', { n: streakCount }) : null}
        >
            <ol className="cozy-journey">
                {journey.map((item) => {
                    const Tag = item.onClick ? 'button' : 'div';
                    return (
                        <li key={item.key}>
                            <Tag {...(item.onClick ? { type: 'button', onClick: item.onClick } : {})} className="cozy-journey__row">
                                <span className="cozy-journey__when">{item.when}</span>
                                <span className={`cozy-journey__node cozy-journey__node--${item.tone}`} aria-hidden="true">
                                    {item.spriteId ? <Sprite src={dexSprite(item.spriteId)} className="cozy-journey__sprite" /> : item.icon}
                                </span>
                                <span className="cozy-journey__text">
                                    <span className="cozy-journey__title">{item.title}</span>
                                    <span className="cozy-journey__sub">{item.sub}</span>
                                </span>
                            </Tag>
                        </li>
                    );
                })}
            </ol>
        </Panel>
    );

    const communityPanel = (limit) => {
        const list = latestMessages.slice(0, limit);
        return (
            <Panel
                title={t('cozyHome.community')}
                action={(
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/feed')}>
                        {t('cozyHome.forum')} <ChevronRight aria-hidden="true" />
                    </button>
                )}
            >
                {list.length === 0 ? (
                    <EmptyState compact title={t('cozyHome.community')} message={t('cozyHome.communityEmpty')} />
                ) : (
                    <ul className="cozy-posts">
                        {list.map((m) => (
                            <li key={m.id}>
                                <button type="button" className="card card--inset card--interactive card--compact cozy-post" onClick={() => navigate('/feed')}>
                                    <span className="cozy-post__avatar" aria-hidden="true">
                                        <Sprite src={dexSprite(m.creatorAvatar || 25, Boolean(m.creatorAvatarIsShiny))} className="cozy-post__sprite" />
                                    </span>
                                    <span className="cozy-post__body">
                                        <span className="cozy-post__meta">
                                            <strong>@{m.creatorName || 'Trainer'}</strong> · {formatForumTime(m.createdAt, language)}
                                        </span>
                                        <span className="cozy-post__text">
                                            {m.text || (m.sharedTeam ? t('cozyHome.sharedTeam', { team: m.sharedTeam.name || '—' }) : '…')}
                                        </span>
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>
        );
    };

    const metaPanel = (
        <Panel
            card={false}
            title={t('cozyHome.metaTitle')}
            meta={metaFormat?.label}
            action={(
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/meta')}>
                    {t('cozyHome.seeMeta')} <ChevronRight aria-hidden="true" />
                </button>
            )}
        >
            {metaRanked.length === 0 ? (
                metaStatus === 'loading'
                    ? <Loader size="sm" label={t('cozyHome.metaEmpty')} block />
                    : <EmptyState compact title={t('cozyHome.metaTitle')} message={t('cozyHome.metaEmpty')} />
            ) : (
                <ol className="data-list cozy-meta">
                    {metaRanked.slice(0, 8).map((row, i) => {
                        const type = typesById.get(row.id)?.[0] || 'normal';
                        return (
                            <li key={row.id} className="data-list__row cozy-meta__row" style={{ '--row-type': typeColors[type] }}>
                                <span className="data-list__num cozy-meta__rank">{i + 1}</span>
                                <Sprite src={dexSprite(row.id)} className="cozy-meta__sprite" />
                                <span className="cozy-meta__name">{displayName(row.name)}</span>
                                <span className="cozy-meta__bar" aria-hidden="true">
                                    <i style={{ inlineSize: `${Math.min(100, (row.count / Math.max(1, metaRanked[0].count)) * 100)}%` }} />
                                </span>
                                <span className="data-list__num cozy-meta__pct">{row.count}%</span>
                            </li>
                        );
                    })}
                </ol>
            )}
        </Panel>
    );

    // ── Layout ──────────────────────────────────────────────────────────────
    // Phones get one tab at a time, the PDF's shape; desktop keeps the story
    // rail beside whichever tab is open.
    let main;
    if (tab === 'today') main = isPhone ? <>{hero}{yourDay}{journeyPanel}</> : <>{hero}{yourDay}{teamsPanel(3)}</>;
    else if (tab === 'teams') main = teamsPanel(isPhone ? 6 : 8);
    else if (tab === 'meta') main = metaPanel;
    else main = communityPanel(5);

    return (
        <main className="cozy-home">
            <div className="cozy-toolbar">
                {chips}
                {tabs}
            </div>

            <div className="cozy-layout">
                <div className="cozy-main">
                    {main}
                </div>

                {!isPhone && (
                    <aside className="cozy-rail">
                        {journeyPanel}
                        {tab !== 'community' && communityPanel(1)}
                    </aside>
                )}
            </div>

            {onUseClassic && (
                <div className="cozy-footer">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={onUseClassic}>{t('cozyHome.classic')}</button>
                </div>
            )}
        </main>
    );
}
