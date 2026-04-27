import { typeColors } from '../constants/types';

export const TypeBadge = ({ type }) => (
    <span
        className="text-xs text-white font-semibold mr-1 mb-1 px-2.5 py-1 rounded-full shadow-sm"
        style={{ backgroundColor: typeColors[type] || '#777' }}
    >
        {type.toUpperCase()}
    </span>
);
