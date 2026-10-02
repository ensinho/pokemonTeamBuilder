import { typeColors, typeIcons } from '../constants/types';
import { useTranslation } from '../hooks/useTranslation';

/**
 * The standard way to name a Pokémon type: icon + label in a pill outlined and
 * tinted in that type's canonical colour.
 *
 * The one way to name a type (v3 retired the solid ALL-CAPS `TypeBadge`); a
 * dense grid that only counts types shows the bare type icon instead. The
 * colour is passed down as `--type-chip` and mixed into theme tokens in
 * index.css, so one chip reads correctly on all six themes.
 *
 * `size`: 'md' (default) or 'sm' for dense rows.
 */
export const TypeChip = ({ type, size = 'md', className = '' }) => {
    const { t } = useTranslation();
    const key = String(type || '').toLowerCase();
    if (!key) return null;

    return (
        <span
            className={`type-chip ${size === 'sm' ? 'type-chip--sm' : ''}  ${className}`}
            style={{ '--type-chip': typeColors[key] || 'var(--color-primary)' }}
        >
            {typeIcons[key] && <img src={typeIcons[key]} alt="" aria-hidden="true" className="type-chip__icon" />}
            {t(`types.${key}`, { defaultValue: type })}
        </span>
    );
};
