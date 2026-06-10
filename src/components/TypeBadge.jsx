import { typeColors } from '../constants/types';
import { useTranslation } from '../hooks/useTranslation';

export const TypeBadge = ({ type }) => {
    const { t } = useTranslation();
    return (
        <span
            className="text-xs text-white font-semibold mr-1 mb-1 px-2.5 py-1 rounded-full shadow-sm"
            style={{ backgroundColor: typeColors[type] || '#777' }}
        >
            {t(`types.${type.toLowerCase()}`, { defaultValue: type }).toUpperCase()}
        </span>
    );
};
