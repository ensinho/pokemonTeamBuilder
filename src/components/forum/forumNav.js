import {
    PokeballIcon,
    SwordsIcon,
    StarIcon,
    MessageIcon,
    FlameIcon,
    TrophyIcon,
    ClockIcon,
    InfoCircleIcon,
    MapPinIcon,
    LightbulbIcon,
} from '../icons';
import { isDiaryTopic } from '../../utils/forumDiary';
import { isWeeklyTopic } from '../../utils/forumWeekly';

// The forum's navigation vocabulary, said once: the feed's tabs, the
// explorer and the drawer all read these lists (they were copied into two
// components before 2026-11-10, and a new category meant editing both).

// Newest first is the feed a trainer lands on (DEFAULT_FEED_SORT).
export const FORUM_SORTS = [
    { id: 'new', key: 'forum.sortNew', icon: ClockIcon },
    { id: 'hot', key: 'forum.sortHot', icon: FlameIcon },
    { id: 'top', key: 'forum.sortTop', icon: TrophyIcon },
];

// Same ids, same order as FORUM_CATEGORY_IDS (utils/forumRanking).
export const FORUM_CATEGORIES = [
    { id: 'all', key: 'forum.catAll', icon: PokeballIcon },
    { id: 'diary', key: 'forum.catDiary', icon: ClockIcon },
    { id: 'general', key: 'forum.catGeneral', icon: MessageIcon },
    { id: 'teams', key: 'forum.catTeams', icon: SwordsIcon },
    { id: 'strategy', key: 'forum.catStrategy', icon: FlameIcon },
    { id: 'questions', key: 'forum.catQuestions', icon: InfoCircleIcon },
    { id: 'adventures', key: 'forum.catAdventures', icon: MapPinIcon },
    { id: 'feedback', key: 'forum.catFeedback', icon: LightbulbIcon },
    { id: 'announcements', key: 'forum.catAnnouncements', icon: StarIcon },
];

/** A pinned room wears one icon everywhere: its door, the explorer, the drawer. */
export const roomIcon = (topic) => {
    if (isDiaryTopic(topic)) return ClockIcon;
    if (isWeeklyTopic(topic)) return TrophyIcon;
    if (topic.category === 'teams') return SwordsIcon;
    return MessageIcon;
};
