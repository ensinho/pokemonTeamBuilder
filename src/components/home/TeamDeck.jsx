import React from 'react';
import { Play, Plus } from 'lucide-react';
import { typeColors } from '../../constants/types';
import { getTeamPokemonDisplaySprite } from '../../utils/pokemonSprites';
import { TEAM_SIZE } from '../../utils/homeStatus';
import { PcBox } from '../PcBox';
import { Sprite } from '../Sprite';

const typeName = (entry) => (typeof entry === 'string' ? entry : entry?.type?.name || entry?.name || null);
const toneOf = (member) => typeColors[typeName(member?.types?.[0])] || null;

/**
 * "Seus times" as party and PC (2026-11-12): the team in progress is a party
 * — six slots, each member on a platform of its own type colour — with its
 * state and one action; the others are boxes of Bill's PC (PcBox, 3×2), one
 * tap from the builder.
 *
 * Harmony pass (2026-11-12): the Home's four columns — the party takes two,
 * each box one, every card the same anatomy (`home-tile`: the art in a band
 * of the same height, then the words). A row is never left half empty: with
 * one box the last column is the dashed "new team" slot (dashed = absent),
 * with none the party takes the whole row. The cards are neutral; colour
 * lives only on the platforms.
 */
export function TeamDeck({ active, others, t, status, menu, subline, onContinue, onEdit, onNew }) {
    const { team, summary } = active;
    const partySpan = others.length === 0 ? 'is-span-4' : 'is-span-2';
    return (
        <ul className="team-deck home-grid">
            <li className={partySpan}>
                <article className="home-tile home-tile--card team-party">
                    <span className="home-tile__media team-party__six" role="img" aria-label={t('cozyHome.ofSix', { n: summary.size })}>
                        {Array.from({ length: TEAM_SIZE }, (_, i) => {
                            const member = summary.members[i];
                            return (
                                <span
                                    key={i}
                                    className={`team-party__slot ${member ? '' : 'is-empty'}`}
                                    style={member ? { '--tone': toneOf(member) || 'var(--color-primary)' } : undefined}
                                >
                                    {member && <Sprite src={getTeamPokemonDisplaySprite(member)} className="team-party__sprite" />}
                                </span>
                            );
                        })}
                    </span>
                    <span className="home-tile__body">
                        <span className="home-tile__kicker">{t('cozyHome.deck.active')}</span>
                        <button type="button" className="home-tile__title team-party__name" onClick={onContinue}>{team.name}</button>
                        <span className="home-tile__foot">
                            <span className="team-party__chips">
                                {status(summary)}
                                {summary.size > 0 && (
                                    <span className="team-party__meta">{t('cozyHome.deck.coverage', { n: summary.coverage })}</span>
                                )}
                            </span>
                            <span className="team-party__actions">
                                {/* The page's one primary is the hero's: this one is secondary. */}
                                <button type="button" className="btn btn-secondary" onClick={onContinue}>
                                    <Play aria-hidden="true" /> {t('homeToday.continueShort')}
                                </button>
                                {menu(team)}
                            </span>
                        </span>
                    </span>
                </article>
            </li>

            {others.map(({ team: other, summary: s }) => (
                <li key={other.id}>
                    <article className="home-tile home-tile--card team-box">
                        <span className="home-tile__media" aria-hidden="true">
                            <PcBox members={s.members} columns={3} size="sm" className="team-box__box" />
                        </span>
                        <span className="home-tile__body">
                            <button type="button" className="home-tile__title team-box__name" onClick={() => onEdit(other)}>{other.name}</button>
                            <span className="home-tile__foot">
                                <span className="team-box__state">
                                    <span className={`team-box__dot ${s.status === 'ready' ? 'is-ready' : ''}`} aria-hidden="true" />
                                    <span className="home-tile__sub">{subline(other, s)}</span>
                                </span>
                                {menu(other)}
                            </span>
                        </span>
                    </article>
                </li>
            ))}

            {others.length === 1 && onNew && (
                <li>
                    <button type="button" className="home-tile home-tile--card team-new" onClick={onNew}>
                        <span className="home-tile__media" aria-hidden="true">
                            <span className="team-new__plus"><Plus /></span>
                        </span>
                        <span className="home-tile__body">
                            <span className="home-tile__title">{t('cozyHome.newTeam')}</span>
                            <span className="home-tile__sub">{t('cozyHome.deck.newSub')}</span>
                        </span>
                    </button>
                </li>
            )}
        </ul>
    );
}
