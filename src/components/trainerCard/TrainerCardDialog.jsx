import React, { useMemo } from 'react';
import { Download, Flame, X } from 'lucide-react';
import '../../styles/trainer-card.css';
import { useModalA11y } from '../../hooks/useModalA11y';
import { useTranslation } from '../../hooks/useTranslation';
import { useTrainerCosmetics } from '../../hooks/useTrainerCosmetics';
import { useAuthStore } from '../../store/useAuthStore';
import { useLanguageStore } from '../../store/useLanguageStore';
import { useTrainerCardStore } from '../../store/useTrainerCardStore';
import { auth } from '../../services/firebase';
import { liveStreak } from '../../utils/dailyCheckin';
import { PERSONAS, derivePersona } from '../../utils/trainerProfile';
import { trainerPixels } from '../../utils/trainerCardPattern';
import { getPokemonArtworkSpriteUrl, getTeamPokemonDisplaySprite } from '../../utils/pokemonSprites';
import { typeColors } from '../../constants/types';
import { AvatarSprite } from '../AvatarSprite';
import { FriendActionButton } from '../FriendActionButton';
import { PokeballIcon } from '../icons';
import { Sprite } from '../Sprite';
import { TrainerBadge } from '../TrainerBadge';
import { FramedAvatar } from '../rewards/FramedAvatar';
import { TrainerTitle } from '../rewards/TrainerTitle';

/**
 * The trainer card (2026-11-05, Enzo's reference: a clean profile card — a
 * banner, the avatar on its edge, name, handle, a line of bio, two numbers
 * and "since"). Translated into this app: the banner is the trainer's own
 * pixel pattern (their uid drawn, so no two cards are alike) in their
 * persona's type colour, with their partner standing in it; the bio is their
 * persona; the numbers are the streak, the level and wins; "since" is the
 * month they joined. Opened from the forum and the friends list
 * (useTrainerCardStore), mounted lazily by AppLayout.
 */

const COLS = 36;
const ROWS = 10;

function useCardFacts(uid, stamped) {
    const ownUid = useAuthStore((s) => s.userId);
    const ownStreak = useAuthStore((s) => s.streak);
    const ownProfile = useAuthStore((s) => s.trainerProfile);
    const cosmetics = useTrainerCosmetics(uid, stamped);
    if (uid && uid === ownUid) {
        const created = auth?.currentUser?.metadata?.creationTime;
        const date = created ? new Date(created) : null;
        return {
            ...cosmetics,
            streak: liveStreak(ownStreak),
            persona: derivePersona(ownProfile)?.id || null,
            memberSince: date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 7) : null,
            wins: null,
        };
    }
    return {
        ...cosmetics,
        streak: cosmetics.streak ? liveStreak(cosmetics.streak) : null,
        persona: cosmetics.persona || null,
        memberSince: cosmetics.memberSince || null,
        wins: cosmetics.battleRecord ? cosmetics.battleRecord.wins : null,
    };
}

function Banner({ seed, avatar, isShiny }) {
    const pixels = useMemo(() => trainerPixels(seed, { cols: COLS, rows: ROWS }), [seed]);
    return (
        <div className="trainer-card__banner" aria-hidden="true">
            <svg className="trainer-card__pixels" viewBox={`0 0 ${COLS} ${ROWS}`} preserveAspectRatio="xMaxYMid slice">
                {pixels.map((p) => (
                    <rect
                        key={`${p.x}-${p.y}`}
                        x={p.x + 0.12}
                        y={p.y + 0.12}
                        width="0.76"
                        height="0.76"
                        className={p.accent ? 'is-accent' : undefined}
                        opacity={p.accent ? 1 : p.o}
                    />
                ))}
            </svg>
            {avatar && (
                <img
                    className="trainer-card__partner"
                    src={getPokemonArtworkSpriteUrl(avatar, { shiny: Boolean(isShiny) })}
                    alt=""
                    width={176}
                    height={176}
                    decoding="async"
                />
            )}
        </div>
    );
}

export function TrainerCardDialog() {
    const { t } = useTranslation();
    const language = useLanguageStore((s) => s.language);
    const profile = useTrainerCardStore((s) => s.profile);
    const extras = useTrainerCardStore((s) => s.extras);
    const close = useTrainerCardStore((s) => s.close);
    const dialogRef = useModalA11y(profile ? close : null);
    const facts = useCardFacts(profile?.userId, { frameId: profile?.frameId, titleId: profile?.titleId });

    if (!profile) return null;

    const persona = facts.persona ? PERSONAS[facts.persona] : null;
    const tone = persona ? typeColors[persona.tone] : null;
    const name = profile.name || t('trainerCard.unknown');
    const since = facts.memberSince
        ? new Date(`${facts.memberSince}-15T12:00:00`).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { month: 'long', year: 'numeric' })
        : null;
    const stats = [
        facts.streak != null && { key: 'streak', value: facts.streak, label: t(facts.streak === 1 ? 'trainerCard.streakOne' : 'trainerCard.streak'), icon: facts.streak > 0 },
        facts.level && { key: 'level', value: facts.level, label: t('trainerCard.level') },
        facts.wins != null && { key: 'wins', value: facts.wins, label: t(facts.wins === 1 ? 'trainerCard.winsOne' : 'trainerCard.wins') },
    ].filter(Boolean);
    const teams = extras?.sharedTeams || [];

    return (
        <div className="modal-scrim">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="trainer-card-name"
                tabIndex={-1}
                className="modal-panel modal-panel--sm trainer-card"
                style={tone ? { '--tc-tone': tone } : undefined}
            >
                <Banner seed={profile.userId} avatar={profile.avatar} isShiny={profile.isShiny} />
                <button type="button" className="trainer-card__close" onClick={close} aria-label={t('trainerCard.close')}>
                    <X aria-hidden="true" />
                </button>

                <div className="trainer-card__body">
                    <div className="trainer-card__top">
                        <FramedAvatar as="div" uid={profile.userId} stampedFrameId={profile.frameId} className="trainer-card__avatar">
                            <AvatarSprite
                                trainerSprite={profile.trainerSprite}
                                pokemonId={profile.avatar}
                                isShiny={profile.isShiny}
                                alt=""
                                className="trainer-card__avatar-img"
                                fallback={<PokeballIcon className="trainer-card__avatar-ball" />}
                            />
                        </FramedAvatar>
                        <FriendActionButton targetUserId={profile.userId} className="btn-sm trainer-card__action" />
                    </div>

                    <h2 id="trainer-card-name" className="trainer-card__name">
                        <span>{name}</span>
                        {profile.selectedBadgeId && <TrainerBadge badgeId={profile.selectedBadgeId} size="sm" />}
                    </h2>
                    <p className="trainer-card__handle">
                        <span>@{name.toLowerCase().replace(/\s+/g, '')}</span>
                        {facts.titleId && <TrainerTitle titleId={facts.titleId} />}
                    </p>

                    <p className="trainer-card__bio">
                        {persona ? (
                            <>
                                <strong>{t(`onboarding.personas.${persona.id}.name`)}.</strong>{' '}
                                {t(`trainerCard.bio.${persona.id}`)}
                            </>
                        ) : t('trainerCard.bio.none')}
                    </p>

                    {stats.length > 0 && (
                        <dl className="trainer-card__stats">
                            {stats.map((s) => (
                                <div key={s.key} className={`trainer-card__stat is-${s.key}`}>
                                    <dt className="sr-only">{s.label}</dt>
                                    <dd>
                                        {s.icon && <Flame className="trainer-card__flame" aria-hidden="true" />}
                                        <strong>{s.value}</strong> <span>{s.label}</span>
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    )}

                    {since && (
                        <p className="trainer-card__since">
                            <span className="trainer-card__since-pixel" aria-hidden="true" />
                            {t('trainerCard.since', { date: since })}
                        </p>
                    )}
                </div>

                {extras && (
                    <section className="trainer-card__teams" aria-labelledby="trainer-card-teams">
                        <h3 id="trainer-card-teams" className="trainer-card__teams-title">{t('trainerCard.sharedTeams')}</h3>
                        {teams.length === 0 ? (
                            <p className="trainer-card__teams-empty">{t('trainerCard.noTeams')}</p>
                        ) : (
                            <ul className="trainer-card__team-list">
                                {teams.map((team) => (
                                    <li key={team.name} className="trainer-card__team">
                                        <span className="trainer-card__team-name">{team.name}</span>
                                        <span className="trainer-card__team-party" aria-hidden="true">
                                            {(team.pokemons || []).slice(0, 6).map((pk, i) => (
                                                <Sprite key={pk.instanceId || `${pk.id}-${i}`} src={getTeamPokemonDisplaySprite(pk)} className="trainer-card__team-sprite" />
                                            ))}
                                        </span>
                                        {extras.onImport && (
                                            <button
                                                type="button"
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => { extras.onImport(team); close(); }}
                                                aria-label={t('trainerCard.importTeam', { team: team.name })}
                                            >
                                                <Download aria-hidden="true" />
                                                {t('trainerCard.import')}
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                )}
            </div>
        </div>
    );
}

export default TrainerCardDialog;
