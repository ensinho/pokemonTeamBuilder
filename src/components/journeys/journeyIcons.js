import { Brain, Crown, Footprints, Map as MapIcon, Puzzle, Swords, Target, Trophy, Users } from 'lucide-react';

/** One glyph per level — the same idea its badge's emblem draws. */
export const JOURNEY_ICONS = {
    'first-steps': Footprints,
    'first-team': Swords,
    strategy: Target,
    community: Users,
    league: Crown,
    champions: Trophy,
    // The persona journeys (2026-11-05).
    'persona-strategist': Brain,
    'persona-traveler': MapIcon,
    'persona-challenger': Puzzle,
};
