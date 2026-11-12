import React from 'react';
import { typeColors } from '../../constants/types';
import { getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { doorLook } from '../../utils/personaDoors';
import { PICK_DESTINATIONS } from '../../utils/trainerProfile';
import { Sprite } from '../Sprite';

/**
 * "Para você" as doors (2026-11-12): the persona's first pick is the big
 * door, the other three a column of short ones beside it. Each door wears
 * its subject's type colour and a Pokémon — the live one where the Home
 * has it (`live[key].dex`: the meta's leader, the day's puzzle) — and a live
 * figure (`live[key].fig` + `.label`) in place of a generic line. Kept short
 * (Enzo, 2026-11-12: "cards não tão altos"): the three small doors are rows.
 */
export function PersonaDoors({ picks, live = {}, t, onOpen }) {
    return (
        <ul className="persona-doors">
            {picks.map((key, index) => {
                const info = live[key] || {};
                const look = doorLook(key, info);
                const big = index === 0;
                return (
                    <li key={key} className={big ? 'persona-doors__big' : undefined}>
                        <button
                            type="button"
                            className={`door ${big ? 'door--big' : ''}`}
                            style={{ '--tone': typeColors[look.type] || typeColors.normal }}
                            onClick={() => onOpen(PICK_DESTINATIONS[key].path)}
                        >
                            <span className="door__art" aria-hidden="true">
                                <Sprite src={getPokemonFrontSpriteUrl(look.dex)} className={`door__sprite ${info.silhouette ? 'pokepuzzle-silhouette' : ''}`} />
                            </span>
                            <span className="door__text">
                                <span className="door__title">{t(PICK_DESTINATIONS[key].labelKey)}</span>
                                <span className="door__why">{t(`onboarding.picks.${key}`)}</span>
                            </span>
                            {info.fig != null && (
                                <span className="door__live">
                                    <strong>{info.fig}</strong>
                                    {info.label && <span>{info.label}</span>}
                                </span>
                            )}
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}
