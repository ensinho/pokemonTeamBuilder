import React from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { typeColors } from '../../constants/types';
import { getTeamPokemonDisplaySprite } from '../../utils/pokemonSprites';
import { TEAM_SIZE } from '../../utils/homeStatus';
import { titleCaseSlug } from '../../utils/smogonSets';
import { Sprite } from '../Sprite';

/**
 * The team in progress as the party (2026-11-09, Milo's "Your little dream
 * team" — .claude/skills/app-screens): six round slots, each member standing
 * on a disc of its own type with its name and type under it; an empty slot is
 * a dashed "+" (dashed means absent, here as everywhere). Any slot edits the
 * team. Phones only: on a desktop the hero's bar carries the party inline.
 */
export function HomeParty({ team, members, onEdit, onSeeAll }) {
    const { t } = useTranslation();
    return (
        <section className="section home-party" aria-labelledby="home-party-title">
            <header className="section-head">
                <h3 id="home-party-title" className="section-title">{t('homeToday.party')}</h3>
                <span className="section-meta">{team.name}</span>
                <span className="section-action">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={onSeeAll}>
                        {t('cozyHome.seeAll')} <ChevronRight aria-hidden="true" />
                    </button>
                </span>
            </header>
            <ol className="home-party__slots">
                {Array.from({ length: TEAM_SIZE }, (_, i) => {
                    const member = members[i];
                    if (!member) {
                        return (
                            <li key={`empty-${i}`}>
                                <button type="button" className="home-party__slot is-empty" onClick={onEdit}>
                                    <span className="home-party__disc" aria-hidden="true"><Plus /></span>
                                    <span className="home-party__name">{t('homeToday.add')}</span>
                                </button>
                            </li>
                        );
                    }
                    const type = member.types?.[0] || 'normal';
                    const name = titleCaseSlug(member.name || '');
                    return (
                        <li key={member.instanceId || `${member.id}-${i}`}>
                            <button
                                type="button"
                                className="home-party__slot"
                                style={{ '--slot-tone': typeColors[type] }}
                                onClick={onEdit}
                                aria-label={t('homeToday.editMember', { name, team: team.name })}
                            >
                                <span className="home-party__disc" aria-hidden="true">
                                    <Sprite src={getTeamPokemonDisplaySprite(member)} className="home-party__sprite" />
                                </span>
                                <span className="home-party__name" aria-hidden="true">{name}</span>
                                <span className="home-party__type" aria-hidden="true">{t(`types.${type}`)}</span>
                            </button>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}

export default HomeParty;
