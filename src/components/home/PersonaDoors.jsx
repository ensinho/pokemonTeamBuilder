import React from 'react';
import { ChevronRight } from 'lucide-react';
import { typeColors } from '../../constants/types';
import { PICK_DESTINATIONS } from '../../utils/trainerProfile';
import { doorLook } from '../../utils/personaDoors';
import { getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { Sprite } from '../Sprite';

/**
 * "Para você" as doors (2026-11-12): each destination a door with its
 * subject's Pokémon standing on a platform of its type colour — the live one
 * where the Home has it (`live[key].dex`: the meta's leader, the lead of the
 * team in progress) — and a live figure (`live[key].fig` + `.label`) in place
 * of a generic line.
 *
 * Harmony pass (2026-11-12): four equal doors on the Home's four columns,
 * the same anatomy as every card around them (`home-tile`), and none of them
 * repeats what the hero or the Rota do dia already show (`homeDoors()`).
 */
export function PersonaDoors({ picks, live = {}, t, onOpen }) {
    return (
        <ul className="persona-doors home-grid">
            {picks.map((key) => {
                const info = live[key] || {};
                const look = doorLook(key, info);
                return (
                    <li key={key}>
                        <button
                            type="button"
                            className="home-tile home-tile--card door"
                            style={{ '--tone': typeColors[look.type] || typeColors.normal }}
                            onClick={() => onOpen(PICK_DESTINATIONS[key].path)}
                        >
                            <span className="home-tile__media" aria-hidden="true">
                                <span className="home-tile__stage">
                                    <Sprite src={getPokemonFrontSpriteUrl(look.dex)} className={`home-tile__sprite ${info.silhouette ? 'pokepuzzle-silhouette' : ''}`} />
                                </span>
                            </span>
                            <span className="home-tile__body">
                                <span className="home-tile__title">{t(PICK_DESTINATIONS[key].labelKey)}</span>
                                <span className="home-tile__sub">{t(`onboarding.picks.${key}`)}</span>
                                <span className="home-tile__foot">
                                    {info.fig != null ? (
                                        <span className="home-tile__fig">
                                            <strong>{info.fig}</strong>
                                            {info.label && <span>{info.label}</span>}
                                        </span>
                                    ) : <span />}
                                    <ChevronRight className="home-tile__chevron" aria-hidden="true" />
                                </span>
                            </span>
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}
