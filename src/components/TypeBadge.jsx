import { useTranslation } from '../hooks/useTranslation';

export const TypeBadge = ({ type }) => {
    const { t } = useTranslation();
    const typeLower = type?.toLowerCase() ?? 'unknown';
    return (
        <span
            className={`type-badge--${typeLower} text-xs font-semibold mr-1 mb-1 px-2.5 py-1 rounded-full shadow-sm`}
        >
            {t(`types.${typeLower}`, { defaultValue: type }).toUpperCase()}
        </span>
    );
};
