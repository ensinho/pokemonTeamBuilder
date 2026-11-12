import React from 'react';
import { getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { Sprite } from '../Sprite';

/**
 * The Rota do dia's art where a card used to show a glyph in a grey square
 * (harmony pass, 2026-11-12): everywhere else on the Home the art is a
 * Pokémon, so here too.
 *
 * - `RouteDuo` — a battle with a friend: the trainer's partner facing a
 *   silhouette ("Quem é esse Pokémon?": the opponent is not chosen yet), each
 *   on a platform, the partner's in its own type colour.
 * - `RouteEmblem` — a standing goal (the next badge): its icon on a ring that
 *   fills with the progress; gold only once it is earned.
 */
export function RouteDuo({ partnerId, partnerShiny = false, partnerTone, foeId = 25 }) {
    return (
        <span className="route-duo">
            <span className="route-duo__side" style={{ '--tone': partnerTone }}>
                <Sprite src={getPokemonFrontSpriteUrl(partnerId, { shiny: partnerShiny })} className="home-tile__sprite route-duo__partner" />
            </span>
            <span className="route-duo__vs">vs</span>
            <span className="route-duo__side route-duo__side--foe">
                <Sprite src={getPokemonFrontSpriteUrl(foeId)} className="home-tile__sprite pokepuzzle-silhouette" />
                <span className="route-duo__ask">?</span>
            </span>
        </span>
    );
}

const R = 34;
const C = 2 * Math.PI * R;

export function RouteEmblem({ Icon, percent = 0, earned = false }) {
    const p = Math.max(0, Math.min(100, percent));
    return (
        <span className={`route-emblem ${earned ? 'is-earned' : ''}`}>
            <svg className="route-emblem__ring" viewBox="0 0 76 76" aria-hidden="true">
                <circle cx="38" cy="38" r={R} className="route-emblem__track" />
                <circle cx="38" cy="38" r={R} className="route-emblem__fill" strokeDasharray={`${(C * p) / 100} ${C}`} />
            </svg>
            <span className="route-emblem__icon">{Icon && <Icon />}</span>
        </span>
    );
}
