/**
 * What one Pokégear entry says and where it leads (2026-11-06). Pure, so the
 * wording rules are tested: the translation key, its params, and the route.
 */
export function describeInboxEntry(entry) {
    const name = entry?.fromName || 'Trainer';
    const topicUrl = entry?.topicId
        ? `/feed?topic=${encodeURIComponent(entry.topicId)}${entry.messageId ? `&c=${encodeURIComponent(entry.messageId)}` : ''}`
        : '/feed';
    switch (entry?.kind) {
        case 'reply': return { key: 'pokegear.reply', params: { name }, to: topicUrl };
        case 'mention': return { key: 'pokegear.mention', params: { name }, to: topicUrl };
        case 'comment': return {
            key: (entry.count || 1) > 1 ? 'pokegear.comments' : 'pokegear.comment',
            params: { name, count: entry.count || 1, others: Math.max(0, (entry.count || 1) - 1) },
            to: topicUrl,
        };
        case 'reaction': return {
            key: (entry.count || 1) > 1 ? 'pokegear.reactions' : 'pokegear.reaction',
            params: { name, count: entry.count || 1, others: Math.max(0, (entry.count || 1) - 1) },
            to: topicUrl,
            reaction: entry.reaction || null,
        };
        case 'friend': return { key: 'pokegear.friend', params: { name }, to: '/friends?tab=requests' };
        case 'passed': return {
            key: 'pokegear.passed',
            params: { name, champion: entry.champion === 'blue' ? 'Blue' : 'Cynthia' },
            to: `/challenge?champion=${entry.champion === 'blue' ? 'blue' : 'cynthia'}`,
        };
        default: return { key: 'pokegear.generic', params: { name }, to: '/' };
    }
}
