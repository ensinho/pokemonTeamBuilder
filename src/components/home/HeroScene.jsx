import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Palette } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { HERO_SCENE_GROUPS, getHeroScene } from '../../constants/heroScenes';
import { trainerPixels } from '../../utils/trainerCardPattern';
import { getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { AnchoredPopover } from '../AnchoredPopover';

const PIXEL_COLS = 48;
const PIXEL_ROWS = 14;

/**
 * One scene behind the Home hero (constants/heroScenes.js): a photograph
 * drained to light and shade, a pattern painted through a mask in the hero's
 * own colours, the trainer's partner, or their Trainer ID as pixels.
 * `owner` carries what makes the last two theirs: `{ uid, partnerId, partnerShiny }`.
 */
export function HeroScene({ scene, owner = {}, changed = false, className = '' }) {
    const pixels = useMemo(
        () => (scene?.kind === 'trainer' ? trainerPixels(owner.uid || 'trainer', { cols: PIXEL_COLS, rows: PIXEL_ROWS, accents: 7 }) : null),
        [scene?.kind, owner.uid],
    );
    if (!scene) return null;
    const base = `day-hero__scene day-hero__scene--${scene.kind} ${changed ? 'is-changed' : ''} ${className}`;

    if (scene.kind === 'image') {
        return <span className={base} style={{ backgroundImage: `url(${scene.url})` }} aria-hidden="true" />;
    }
    if (scene.kind === 'pattern') {
        return (
            <span
                className={base}
                style={{ '--scene-mask': scene.mask, '--scene-size': `${scene.size}px` }}
                aria-hidden="true"
            />
        );
    }
    if (scene.kind === 'partner') {
        return (
            <span className={base} aria-hidden="true">
                {/* the partner as a sprite too (2026-11-12: "sempre priorizar o sprite") */}
                {owner.partnerId && (
                    <img
                        src={getPokemonFrontSpriteUrl(owner.partnerId, { shiny: Boolean(owner.partnerShiny) })}
                        alt=""
                        width={96}
                        height={96}
                        decoding="async"
                        loading="lazy"
                        className="day-hero__scene-partner"
                    />
                )}
            </span>
        );
    }
    // 'trainer': the trainer card's banner, busiest on the art's side.
    return (
        <span className={base} aria-hidden="true">
            <svg className="day-hero__scene-pixels" viewBox={`0 0 ${PIXEL_COLS} ${PIXEL_ROWS}`} preserveAspectRatio="xMaxYMid slice">
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
        </span>
    );
}

/**
 * The palette button on the hero and the shelf it opens: every scene as a
 * small live preview in the hero's own tint, grouped — the trainer's own
 * first, then the weather, the places, the photographs. A tap applies at
 * once (the hero changes behind the shelf); Escape or a tap outside closes.
 */
export function ScenePicker({ currentId, onPick, owner, tone }) {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const anchorRef = useRef(null);
    const popoverRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return undefined;
        const onDown = (event) => {
            if (anchorRef.current?.contains(event.target) || popoverRef.current?.contains(event.target)) return;
            setIsOpen(false);
        };
        const onKey = (event) => {
            if (event.key === 'Escape') { setIsOpen(false); anchorRef.current?.focus(); }
        };
        document.addEventListener('pointerdown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [isOpen]);

    const nameOf = (scene) => scene.name || t(`cozyHome.scenes.${scene.id}`);
    const current = getHeroScene(currentId);
    const label = t('cozyHome.changeWallpaper', { name: current ? nameOf(current) : '' });

    return (
        <>
            <button
                ref={anchorRef}
                type="button"
                className="btn btn-icon btn-sm day-hero__wallpaper"
                onClick={() => setIsOpen((open) => !open)}
                aria-label={label}
                title={label}
                aria-expanded={isOpen}
                aria-haspopup="dialog"
            >
                <Palette aria-hidden="true" />
            </button>
            <AnchoredPopover
                isOpen={isOpen}
                anchorRef={anchorRef}
                popoverRef={popoverRef}
                ariaLabel={t('cozyHome.scenes.title')}
                offset={6}
                className="menu-surface scene-picker"
                style={{ '--hero-type': tone }}
            >
                <div className="scene-picker__panel">
                    <p className="scene-picker__title">{t('cozyHome.scenes.title')}</p>
                    {HERO_SCENE_GROUPS.map((group) => (
                        <div key={group.id} className="scene-picker__group">
                            <span className="scene-picker__group-label">{t(`cozyHome.scenes.groups.${group.id}`)}</span>
                            <div className="scene-picker__grid">
                                {group.ids.map((id) => {
                                    const scene = getHeroScene(id);
                                    if (!scene) return null;
                                    const isOn = id === currentId;
                                    return (
                                        <button
                                            key={id}
                                            type="button"
                                            className={`scene-picker__swatch ${isOn ? 'is-on' : ''}`}
                                            onClick={() => onPick(id)}
                                            aria-pressed={isOn}
                                            title={nameOf(scene)}
                                        >
                                            <span className="scene-picker__preview" aria-hidden="true">
                                                <HeroScene scene={scene} owner={owner} />
                                                {isOn && <Check className="scene-picker__check" />}
                                            </span>
                                            <span className="scene-picker__name">{nameOf(scene)}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </AnchoredPopover>
        </>
    );
}
