import React from 'react';
import { getCosmetic } from '../../constants/cosmetics';
import { useTranslation } from '../../hooks/useTranslation';

/**
 * A trainer's equipped title (constants/cosmetics.js, kind `title`), the line
 * under their name. Renders nothing for no title or an id that is not one, so
 * a call site can pass whatever a profile or a forum post carried.
 */
export function TrainerTitle({ titleId, className = '' }) {
    const { t } = useTranslation();
    const item = getCosmetic(titleId);
    if (!item || item.kind !== 'title') return null;
    return <span className={`trainer-title ${className}`.trim()}>{t(`rewards.items.${item.id}.name`)}</span>;
}

export default TrainerTitle;
