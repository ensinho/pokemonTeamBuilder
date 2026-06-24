import { Atom, CloudRain, Sun, Hourglass, Snowflake, Repeat, Wind, Brain, Zap } from 'lucide-react';

// Lucide icon per meta-core id — shared by the Meta Cores modal and the Team
// Builder's "fits a core" chips so the icon set stays consistent.
export const CORE_ICONS = {
    rain: CloudRain,
    sun: Sun,
    sand: Hourglass,
    snow: Snowflake,
    trickroom: Repeat,
    tailwind: Wind,
    psyterrain: Brain,
    eleterrain: Zap,
};

export const coreIconFor = (id) => CORE_ICONS[id] || Atom;
