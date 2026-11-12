import React from 'react';
import { Play } from 'lucide-react';
import { typeColors } from '../../constants/types';
import { getTeamPokemonDisplaySprite } from '../../utils/pokemonSprites';
import { TEAM_SIZE } from '../../utils/homeStatus';
import { PcBox } from '../PcBox';
import { Sprite } from '../Sprite';

const typeName = (entry) => (typeof entry === 'string' ? entry : entry?.type?.name || entry?.name || null);
const toneOf = (member) => typeColors[typeName(member?.types?.[0])] || null;

/**
 * "Seus times" as party and PC (2026-11-12): the team in progress is a party
 * — six slots, each member on a platform in its own type colour, the card in
 * its lead's — with its state and one action; the others are boxes of Bill's
 * PC (PcBox, 3×2), one tap from the builder. The totals live in the panel's
 * heading (the Home's Panel `meta`), not a strip of their own.
 */
export function TeamDeck({ active, others, t, status, menu, onContinue, onEdit }) {
    const { team, summary } = active;
    const leadTone = toneOf(summary.members[0]) || 'var(--color-primary)';
    return (
        <div className="team-deck">
            <article className="team-party" style={{ '--tone': leadTone }}>
                <div className="team-party__head">
                    <span className="team-party__info">
                        <span className="team-party__eyebrow">{t('cozyHome.deck.active')}</span>
                        <button type="button" className="team-party__name" onClick={onContinue}>{team.name}</button>
                        <span className="team-party__chips">
                            {status(summary)}
                            {summary.size > 0 && (
                                <span className="team-party__meta">{t('cozyHome.deck.coverage', { n: summary.coverage })}</span>
                            )}
                        </span>
                    </span>
                    <span className="team-party__actions">
                        <button type="button" className="btn btn-primary" onClick={onContinue}>
                            <Play aria-hidden="true" /> {t('homeToday.continueShort')}
                        </button>
                        {menu(team)}
                    </span>
                </div>
                <span className="team-party__six" role="img" aria-label={t('cozyHome.ofSix', { n: summary.size })}>
                    {Array.from({ length: TEAM_SIZE }, (_, i) => {
                        const member = summary.members[i];
                        return (
                            <span key={i} className={`team-party__slot ${member ? '' : 'is-empty'}`} style={member ? { '--slot-tone': toneOf(member) || leadTone } : undefined}>
                                {member && <Sprite src={getTeamPokemonDisplaySprite(member)} className="team-party__sprite" />}
                            </span>
                        );
                    })}
                </span>
            </article>

            {others.length > 0 && (
                <ul className="team-boxes">
                    {others.map(({ team: other, summary: s }) => (
                        <li key={other.id}>
                            <div className="team-box">
                                <PcBox members={s.members} columns={3} size="sm" className="team-box__box" />
                                <span className="team-box__row">
                                    <span className={`team-box__dot ${s.status === 'ready' ? 'is-ready' : ''}`} aria-hidden="true" />
                                    <button type="button" className="team-box__name" onClick={() => onEdit(other)}>{other.name}</button>
                                    {menu(other)}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
