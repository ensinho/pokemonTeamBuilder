/**
 * Helper to format ISO dates into friendly relative time strings in pt/en
 */
export const formatForumTime = (isoString, language = 'pt') => {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) {
        return language === 'pt' ? 'agora há pouco' : 'just now';
    }
    if (diffMin < 60) {
        return language === 'pt' ? `há ${diffMin} min` : `${diffMin}m ago`;
    }
    if (diffHr < 24) {
        return language === 'pt' ? `há ${diffHr} h` : `${diffHr}h ago`;
    }
    if (diffDays === 1) {
        return language === 'pt' ? 'ontem' : 'yesterday';
    }
    if (diffDays < 30) {
        return language === 'pt' ? `há ${diffDays} dias` : `${diffDays}d ago`;
    }
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}/${date.getFullYear()}`;
};

export const getCategoryMeta = (cat, language = 'pt') => {
    const meta = {
        general: {
            id: 'general',
            label: language === 'pt' ? 'Conversa Geral' : 'General Chat',
            colorClass: 'category-badge--general',
            dotClass: 'forum-category-dot--general'
        },
        teams: {
            id: 'teams',
            label: language === 'pt' ? 'Avaliação de Times' : 'Team Building',
            colorClass: 'category-badge--teams',
            dotClass: 'forum-category-dot--teams'
        },
        strategy: {
            id: 'strategy',
            label: language === 'pt' ? 'Estratégia & Meta' : 'Strategy & Meta',
            colorClass: 'category-badge--strategy',
            dotClass: 'forum-category-dot--strategy'
        },
        announcements: {
            id: 'announcements',
            label: language === 'pt' ? 'Anúncios Oficiais' : 'Announcements',
            colorClass: 'category-badge--announcements',
            dotClass: 'forum-category-dot--announcements'
        }
    };
    return meta[cat] || {
        id: cat,
        label: cat,
        colorClass: 'category-badge--default',
        dotClass: 'forum-category-dot--default'
    };
};
