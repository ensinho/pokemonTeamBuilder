import React from 'react';
import { Palette } from 'lucide-react';
import { JourneyBar } from '../journeys/JourneyList';

/**
 * The Home's one hero (2026-11-09, Poddi's "Podcast of the day" — .claude/
 * skills/app-screens): ONE surface tinted by its subject's type (`tone`),
 * official artwork as the protagonist, the headline in the heading face, and
 * a "player" bar at its foot that says where things stand and holds the one
 * action, round, in the thumb's reach.
 *
 * It replaced the card-inside-a-scene banner (three surfaces deep). The
 * trainer's wallpaper stays: drained to light and shade (`luminosity`) under
 * the tint, as before.
 *
 * Content is the caller's (`art`, `eyebrow`, `title`, `sub`, the bar's
 * `label`/`meta`/`percent`/`extra`, `action`) — which subject leads is
 * `personaHero()`'s call (utils/trainerProfile.js), never the view's.
 */
export function DayHero({
    tone,
    art,
    eyebrow,
    title,
    sub,
    label,
    meta,
    percent,
    extra,
    action,
    wallpaper,
    wallpaperChanged = false,
    onChangeWallpaper,
    wallpaperLabel,
}) {
    return (
        <section className="day-hero" style={{ '--hero-type': tone }} aria-labelledby="day-hero-title">
            {wallpaper && (
                <span
                    key={wallpaper.id}
                    className={`day-hero__scene ${wallpaperChanged ? 'is-changed' : ''}`}
                    style={{ backgroundImage: `url(${wallpaper.url})` }}
                    aria-hidden="true"
                />
            )}
            <span className="day-hero__disc" aria-hidden="true" />
            {art && <span className="day-hero__art" aria-hidden="true">{art}</span>}

            <div className="day-hero__top">
                {eyebrow && <span className="day-hero__eyebrow">{eyebrow}</span>}
                {onChangeWallpaper && (
                    <button type="button" className="btn btn-icon btn-sm day-hero__wallpaper" onClick={onChangeWallpaper}
                        aria-label={wallpaperLabel} title={wallpaperLabel}>
                        <Palette aria-hidden="true" />
                    </button>
                )}
            </div>

            <div className="day-hero__copy">
                <h2 id="day-hero-title" className="day-hero__title">{title}</h2>
                {sub && <p className="day-hero__sub">{sub}</p>}
            </div>

            {extra && <div className="day-hero__extra">{extra}</div>}

            <div className="day-hero__bar">
                <span className="day-hero__now">
                    <span className="day-hero__label">{label}</span>
                    {meta && <span className="day-hero__meta">{meta}</span>}
                    {typeof percent === 'number' && <JourneyBar percent={percent} />}
                </span>
                {action && (
                    <button
                        type="button"
                        className="btn btn-primary day-hero__play"
                        onClick={action.onClick}
                        aria-label={action.label}
                        title={action.label}
                    >
                        {/* Its own motion on hover (utils/glyphMotion.js), the caller's pick. */}
                        <span className="day-hero__play-glyph" data-glyph={action.glyph || 'nudge'} aria-hidden="true">
                            <action.Icon />
                        </span>
                        <span className="day-hero__play-label">{action.short || action.label}</span>
                    </button>
                )}
            </div>
        </section>
    );
}

export default DayHero;
