import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { typeColors, typeIcons } from '../../constants/types';
import { itemSpriteUrl } from '../../utils/itemSuggestions';
import { pctOf, pretty } from '../../utils/metaFormat';
import { MonSprite } from '../views/metaShared';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * Non-blocking floating telemetry preview for hovered desktop Meta Usage rows.
 * Reads exclusively from already-loaded `usageData.byId[mon.id]` — zero extra network calls.
 */
export function MetaRowPopover({
    mon,
    rank,
    detail,
    types,
    anchorRect,
    usingSmogon,
    t,
}) {
    const cardRef = useRef(null);
    const [coords, setCoords] = useState(null);

    useLayoutEffect(() => {
        if (!anchorRect || !cardRef.current || typeof window === 'undefined') return;
        const pad = 16;
        const gap = 8;
        const rect = cardRef.current.getBoundingClientRect();
        const width = rect.width || 296;
        const height = rect.height || 220;

        // Anchor towards the right half of the row so rank/sprite/name stay unobstructed while scanning.
        const preferredLeft = anchorRect.right - width - 12;
        const left = clamp(preferredLeft, pad, Math.max(pad, window.innerWidth - width - pad));

        const fitsBelow = anchorRect.bottom + gap + height <= window.innerHeight - pad;
        const top = fitsBelow
            ? anchorRect.bottom + gap
            : Math.max(pad, anchorRect.top - height - gap);

        setCoords({ top, left });
    }, [anchorRect, mon?.id]);

    if (!mon || !anchorRect || typeof document === 'undefined') return null;

    const primaryType = types?.[0];
    const tone = primaryType ? typeColors[primaryType] : null;
    const n = detail?.n || 0;
    const topItems = Array.isArray(detail?.items) ? detail.items.slice(0, 3) : [];
    const topMoves = Array.isArray(detail?.moves) ? detail.moves.slice(0, 3) : [];
    const topTera = Array.isArray(detail?.tera) && detail.tera.length > 0 ? detail.tera[0] : null;
    const topPartner = Array.isArray(detail?.teammates) && detail.teammates.length > 0 ? detail.teammates[0] : null;

    const useItemsAsPrimary = topItems.length > 0;
    const primaryList = useItemsAsPrimary ? topItems : topMoves;
    const primaryHeading = useItemsAsPrimary
        ? t('markedUi.meta.hoverItems')
        : t('markedUi.meta.hoverMoves');

    const pctNum = Number(mon.pct) || 0;
    const pctLabel = usingSmogon ? pctNum.toFixed(1) : String(pctNum);
    const hasWr = Number.isFinite(mon.winRate);
    const wrTone = hasWr ? (mon.winRate >= 52 ? 'is-positive' : mon.winRate < 48 ? 'is-negative' : '') : '';
    const teraSlug = topTera?.name ? String(topTera.name).toLowerCase() : null;

    return createPortal(
        <div
            ref={cardRef}
            role="tooltip"
            className="meta-row-popover"
            style={{
                top: coords?.top ?? -9999,
                left: coords?.left ?? -9999,
                visibility: coords ? 'visible' : 'hidden',
                ...(tone ? { '--mon-tone': tone } : {}),
            }}
        >
            <div className="meta-row-popover__head">
                <div className="meta-row-popover__ident">
                    <span className={`meta-rank ${rank === 1 ? 'is-gold' : rank <= 3 ? 'is-top' : ''}`}>
                        #{rank}
                    </span>
                    <span className="meta-row-popover__name">{pretty(mon.name)}</span>
                    {types?.length > 0 && (
                        <span className="meta-row-popover__types" aria-hidden="true">
                            {types.slice(0, 2).map((tp) => (
                                typeIcons[tp]
                                    ? <img key={tp} src={typeIcons[tp]} alt="" className="meta-row__type-icon" />
                                    : null
                            ))}
                        </span>
                    )}
                </div>
                <div className="meta-row-popover__figures figure">
                    <span className="meta-row-popover__usage">{pctLabel}%</span>
                    {hasWr && (
                        <span className={`meta-row-popover__wr ${wrTone}`}>
                            {Number(mon.winRate).toFixed(1)}%
                        </span>
                    )}
                </div>
            </div>

            {primaryList.length > 0 && (
                <div className="meta-row-popover__section">
                    <p className="meta-row-popover__label">{primaryHeading}</p>
                    <ul className="meta-row-popover__bars">
                        {primaryList.map((entry) => {
                            const pct = n > 0 ? pctOf(entry.count, n) : 0;
                            const barWidth = Math.min(100, Math.max(4, pct));
                            return (
                                <li key={entry.slug || entry.name} className="meta-row-popover__bar-item">
                                    <div className="meta-row-popover__bar-top">
                                        <span className="meta-row-popover__bar-name">
                                            {useItemsAsPrimary && entry.slug && (
                                                <img
                                                    src={itemSpriteUrl(entry.slug)}
                                                    alt=""
                                                    aria-hidden="true"
                                                    className="meta-row-popover__item-icon image-pixelated"
                                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                />
                                            )}
                                            <span className="truncate">{pretty(entry.name)}</span>
                                        </span>
                                        <span className="meta-row-popover__bar-pct figure">{pct}%</span>
                                    </div>
                                    <span className="meta-row-popover__track" aria-hidden="true">
                                        <span className="meta-row-popover__fill" style={{ width: `${barWidth}%` }} />
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            {(topPartner || (teraSlug && typeColors[teraSlug])) && (
                <div className="meta-row-popover__meta-row">
                    {topPartner && (
                        <div className="meta-row-popover__partner">
                            <span className="meta-row-popover__label">{t('markedUi.meta.hoverPartner')}</span>
                            <div className="meta-row-popover__partner-chip">
                                <MonSprite id={topPartner.id} name={topPartner.name} alt="" className="h-5 w-5 image-pixelated shrink-0" />
                                <span className="truncate capitalize">{pretty(topPartner.name)}</span>
                                {n > 0 && (
                                    <span className="figure text-muted">{pctOf(topPartner.count, n)}%</span>
                                )}
                            </div>
                        </div>
                    )}
                    {teraSlug && typeColors[teraSlug] && (
                        <div className="meta-row-popover__tera">
                            <span className="meta-row-popover__label">{t('markedUi.meta.hoverTera')}</span>
                            <span
                                className="meta-row-popover__tera-chip"
                                style={{ '--type-chip': typeColors[teraSlug] }}
                            >
                                {typeIcons[teraSlug] && (
                                    <img src={typeIcons[teraSlug]} alt="" aria-hidden="true" className="h-3 w-3 shrink-0" />
                                )}
                                <span className="capitalize">{t(`types.${teraSlug}`, { defaultValue: topTera.name })}</span>
                            </span>
                        </div>
                    )}
                </div>
            )}

            <div className="meta-row-popover__foot">
                <span>{t('markedUi.meta.hoverDetails')}</span>
            </div>
        </div>,
        document.body,
    );
}
