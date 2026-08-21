import React from 'react';

/**
 * High-fidelity Vector SVGs for Pokémon Trainer Badges (Gym Badges & Achievements)
 * All badges are precision-crafted vector enamel pins/gems with specular highlights,
 * gradients, and metallic bezels.
 */

// 1. BOULDER BADGE (Cinza / Rocha - Insígnia de Pedra)
export const BoulderBadgeSvg = ({ className = 'w-6 h-6', ...props }) => (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <defs>
            <linearGradient id="boulderBezel" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="boulderCenter" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#94a3b8" />
                <stop offset="50%" stopColor="#64748b" />
                <stop offset="100%" stopColor="#475569" />
            </linearGradient>
            <linearGradient id="boulderFacetTop" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#cbd5e1" />
                <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>
            <linearGradient id="boulderFacetBottom" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#64748b" />
                <stop offset="100%" stopColor="#334155" />
            </linearGradient>
            <filter id="boulderGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.4" />
            </filter>
        </defs>
        <g filter="url(#boulderGlow)">
            {/* Outer Bezel (Octagon) */}
            <polygon points="30,6 70,6 94,30 94,70 70,94 30,94 6,70 6,30" fill="url(#boulderBezel)" stroke="#0f172a" strokeWidth="3" strokeLinejoin="round" />
            {/* Facet Top */}
            <polygon points="30,8 70,8 64,28 36,28" fill="url(#boulderFacetTop)" opacity="0.95" />
            {/* Facet Top Right */}
            <polygon points="70,8 92,30 72,36 64,28" fill="#94a3b8" />
            {/* Facet Right */}
            <polygon points="92,30 92,70 72,64 72,36" fill="#64748b" />
            {/* Facet Bottom Right */}
            <polygon points="92,70 70,92 64,72 72,64" fill="url(#boulderFacetBottom)" />
            {/* Facet Bottom */}
            <polygon points="70,92 30,92 36,72 64,72" fill="#334155" />
            {/* Facet Bottom Left */}
            <polygon points="30,92 8,70 28,64 36,72" fill="#475569" />
            {/* Facet Left */}
            <polygon points="8,70 8,30 28,36 28,64" fill="#64748b" />
            {/* Facet Top Left */}
            <polygon points="8,30 30,8 36,28 28,36" fill="#cbd5e1" />
            {/* Center Octagon Gem */}
            <polygon points="36,28 64,28 72,36 72,64 64,72 36,72 28,64 28,36" fill="url(#boulderCenter)" stroke="#1e293b" strokeWidth="2" />
            {/* Specular Highlight */}
            <polygon points="37,30 63,30 70,37 66,40 38,40 30,37" fill="#ffffff" opacity="0.35" />
        </g>
    </svg>
);

// 2. CASCADE BADGE (Azul / Água - Insígnia da Cascata)
export const CascadeBadgeSvg = ({ className = 'w-6 h-6', ...props }) => (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <defs>
            <linearGradient id="cascadeDrop" x1="20%" y1="10%" x2="80%" y2="90%">
                <stop offset="0%" stopColor="#7dd3fc" />
                <stop offset="40%" stopColor="#38bdf8" />
                <stop offset="85%" stopColor="#0284c7" />
                <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
            <linearGradient id="cascadeHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </linearGradient>
            <filter id="cascadeGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#0284c7" floodOpacity="0.5" />
            </filter>
        </defs>
        <g filter="url(#cascadeGlow)">
            {/* Dark Enamel Outer Bezel */}
            <path
                d="M50 4 C48 8, 12 52, 12 70 A38 38 0 0 0 88 70 C88 52, 52 8, 50 4 Z"
                fill="#0c4a6e"
                stroke="#082f49"
                strokeWidth="3.5"
                strokeLinejoin="round"
            />
            {/* Cyan Gemstone Core */}
            <path
                d="M50 8 C48.5 12, 16 53, 16 69 A34 34 0 0 0 84 69 C84 53, 51.5 12, 50 8 Z"
                fill="url(#cascadeDrop)"
            />
            {/* Gloss Highlight Arc */}
            <path
                d="M50 14 C48 20, 24 54, 24 67 A26 26 0 0 0 50 90 C32 88, 22 72, 24 62 C26 50, 48 22, 50 14 Z"
                fill="url(#cascadeHighlight)"
            />
            {/* Crisp Point Specular Sparkle */}
            <ellipse cx="46" cy="30" rx="3.5" ry="8" transform="rotate(-20 46 30)" fill="#ffffff" opacity="0.65" />
        </g>
    </svg>
);

// 3. THUNDER BADGE (Dourado / Sol - Insígnia do Trovão)
export const ThunderBadgeSvg = ({ className = 'w-6 h-6', ...props }) => (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <defs>
            <linearGradient id="thunderRays" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="50%" stopColor="#facc15" />
                <stop offset="100%" stopColor="#eab308" />
            </linearGradient>
            <linearGradient id="thunderCore" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fb923c" />
                <stop offset="50%" stopColor="#ea580c" />
                <stop offset="100%" stopColor="#c2410c" />
            </linearGradient>
            <filter id="thunderGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#ea580c" floodOpacity="0.45" />
            </filter>
        </defs>
        <g filter="url(#thunderGlow)">
            {/* 8-pointed star base */}
            <polygon
                points="50,2 62,18 84,16 82,38 98,50 82,62 84,84 62,82 50,98 38,82 16,84 18,62 2,50 18,38 16,16 38,18"
                fill="url(#thunderRays)"
                stroke="#78350f"
                strokeWidth="3"
                strokeLinejoin="round"
            />
            {/* Inner Octagonal Ring */}
            <polygon
                points="35,20 65,20 80,35 80,65 65,80 35,80 20,65 20,35"
                fill="#ca8a04"
                stroke="#78350f"
                strokeWidth="2"
            />
            {/* Inner Sun Gem (Orange Octagon) */}
            <polygon
                points="37,25 63,25 75,37 75,63 63,75 37,75 25,63 25,37"
                fill="url(#thunderCore)"
                stroke="#7c2d12"
                strokeWidth="2"
            />
            {/* Center Amber Facet */}
            <polygon
                points="42,32 58,32 68,42 68,58 58,68 42,68 32,58 32,42"
                fill="#f97316"
                stroke="#9a3412"
                strokeWidth="1.5"
            />
            {/* Top Gloss Highlight */}
            <polygon points="38,27 62,27 73,38 67,42 40,42 28,38" fill="#ffffff" opacity="0.45" />
        </g>
    </svg>
);

// 4. RAINBOW BADGE (Multicolor / Flor - Insígnia do Arco-Íris)
export const RainbowBadgeSvg = ({ className = 'w-6 h-6', ...props }) => (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <defs>
            <filter id="rainbowGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000" floodOpacity="0.4" />
            </filter>
        </defs>
        <g filter="url(#rainbowGlow)" stroke="#1e293b" strokeWidth="2.5" strokeLinejoin="round">
            {/* 8 Flower Petals (Hexagonal/Rounded Segments in Rainbow sequence) */}
            {/* Top: Red */}
            <polygon points="42,6 58,6 64,22 50,28 36,22" fill="#ef4444" />
            {/* Top-Right: Orange */}
            <polygon points="68,14 80,24 76,40 60,36 56,22" fill="#f97316" />
            {/* Right: Yellow */}
            <polygon points="86,34 94,48 84,62 70,52 70,36" fill="#eab308" />
            {/* Bottom-Right: Light Green */}
            <polygon points="80,68 70,82 56,76 60,60 74,56" fill="#84cc16" />
            {/* Bottom: Green */}
            <polygon points="58,94 42,94 36,78 50,72 64,78" fill="#22c55e" />
            {/* Bottom-Left: Cyan */}
            <polygon points="20,82 12,68 24,56 38,60 34,76" fill="#06b6d4" />
            {/* Left: Blue / Indigo */}
            <polygon points="6,48 14,34 28,36 28,52 16,62" fill="#3b82f6" />
            {/* Top-Left: Violet / Pink */}
            <polygon points="24,24 36,14 44,22 40,36 24,40" fill="#a855f7" />

            {/* Central Octagon (Indigo Dark Core) */}
            <polygon points="38,32 62,32 68,38 68,62 62,68 38,68 32,62 32,38" fill="#1e1b4b" stroke="#0f172a" strokeWidth="2.5" />
            
            {/* Inner Four-Point Flower/Cross Icon (White/Cream Enamel) */}
            <path
                d="M50 36 C50 44, 44 50, 36 50 C44 50, 50 56, 50 64 C50 56, 56 50, 64 50 C56 50, 50 44, 50 36 Z"
                fill="#f8fafc"
                stroke="#6366f1"
                strokeWidth="1.5"
            />
            {/* Tiny Core Dot */}
            <circle cx="50" cy="50" r="2.5" fill="#f43f5e" stroke="none" />
        </g>
    </svg>
);

// 5. SOUL BADGE (Rosa / Coração - Insígnia da Alma)
export const SoulBadgeSvg = ({ className = 'w-6 h-6', ...props }) => (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <defs>
            <linearGradient id="soulLeft" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f472b6" />
                <stop offset="50%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#be185d" />
            </linearGradient>
            <linearGradient id="soulRight" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fb7185" />
                <stop offset="50%" stopColor="#f43f5e" />
                <stop offset="100%" stopColor="#9f1239" />
            </linearGradient>
            <filter id="soulGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#ec4899" floodOpacity="0.45" />
            </filter>
        </defs>
        <g filter="url(#soulGlow)">
            {/* Outer Dark Bezel */}
            <path
                d="M50 20 L24 8 C10 8, 4 24, 6 42 L24 76 L50 94 L76 76 L94 42 C96 24, 90 8, 76 8 Z"
                fill="#500724"
                stroke="#831843"
                strokeWidth="3.5"
                strokeLinejoin="round"
            />
            {/* Left Faceted Wing */}
            <path
                d="M49 23 L25 12 C13 12, 8 26, 10 42 L26 74 L49 90 Z"
                fill="url(#soulLeft)"
                stroke="#831843"
                strokeWidth="2"
            />
            {/* Right Faceted Wing */}
            <path
                d="M51 23 L75 12 C87 12, 92 26, 90 42 L74 74 L51 90 Z"
                fill="url(#soulRight)"
                stroke="#831843"
                strokeWidth="2"
            />
            {/* Left Top Gloss Highlight */}
            <path
                d="M26 14 C18 14, 13 22, 13 32 L26 40 L44 26 Z"
                fill="#ffffff"
                opacity="0.4"
            />
            {/* Center Seam Line */}
            <line x1="50" y1="21" x2="50" y2="92" stroke="#4c0519" strokeWidth="2.5" />
        </g>
    </svg>
);

// 6. MARSH BADGE (Ouro / Círculo Duplo - Insígnia do Pântano)
export const MarshBadgeSvg = ({ className = 'w-6 h-6', ...props }) => (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <defs>
            <linearGradient id="marshOuter" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="40%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#a16207" />
            </linearGradient>
            <linearGradient id="marshInner" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fde047" />
                <stop offset="50%" stopColor="#ca8a04" />
                <stop offset="100%" stopColor="#713f12" />
            </linearGradient>
            <filter id="marshGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#ca8a04" floodOpacity="0.5" />
            </filter>
        </defs>
        <g filter="url(#marshGlow)">
            {/* Outer Dark Gold Ring */}
            <circle cx="50" cy="50" r="44" fill="url(#marshOuter)" stroke="#451a03" strokeWidth="3.5" />
            {/* Outer Concentric Black Channel */}
            <circle cx="50" cy="50" r="32" fill="none" stroke="#292524" strokeWidth="3" />
            {/* Inner Gold Disc */}
            <circle cx="50" cy="50" r="28" fill="url(#marshInner)" stroke="#78350f" strokeWidth="2.5" />
            {/* Center Accent Core */}
            <circle cx="50" cy="50" r="14" fill="#eab308" stroke="#a16207" strokeWidth="1.5" />
            {/* Specular Crescent Highlight */}
            <path
                d="M20 36 A36 36 0 0 1 68 18 A40 40 0 0 0 20 36 Z"
                fill="#ffffff"
                opacity="0.5"
            />
        </g>
    </svg>
);

// 7. VOLCANO BADGE (Fogo / Chama Tripla - Insígnia do Vulcão)
export const VolcanoBadgeSvg = ({ className = 'w-6 h-6', ...props }) => (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <defs>
            <linearGradient id="volcanoOuter" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fb923c" />
                <stop offset="50%" stopColor="#ea580c" />
                <stop offset="100%" stopColor="#c2410c" />
            </linearGradient>
            <linearGradient id="volcanoDrop" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="50%" stopColor="#b91c1c" />
                <stop offset="100%" stopColor="#7f1d1d" />
            </linearGradient>
            <filter id="volcanoGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#dc2626" floodOpacity="0.5" />
            </filter>
        </defs>
        <g filter="url(#volcanoGlow)">
            {/* Triple Crest Flame Body */}
            <path
                d="M50 12 L66 32 L88 20 L80 62 L66 88 L34 88 L20 62 L12 20 L34 32 Z"
                fill="url(#volcanoOuter)"
                stroke="#431407"
                strokeWidth="3.5"
                strokeLinejoin="round"
            />
            {/* Inner Red Teardrop / Flame Center */}
            <path
                d="M50 36 C48 42, 32 60, 32 70 A18 18 0 0 0 68 70 C68 60, 52 42, 50 36 Z"
                fill="url(#volcanoDrop)"
                stroke="#450a0a"
                strokeWidth="2.5"
            />
            {/* Flame Center Inner Yellow Core */}
            <path
                d="M50 48 C49 52, 40 64, 40 69 A10 10 0 0 0 60 69 C60 64, 51 52, 50 48 Z"
                fill="#fde047"
                opacity="0.85"
            />
            {/* Top Left Specular Highlight */}
            <path
                d="M32 36 L24 26 L26 48 L34 52 Z"
                fill="#ffffff"
                opacity="0.4"
            />
        </g>
    </svg>
);

// 8. EARTH BADGE (Verde / Pena / Folha - Insígnia da Terra)
export const EarthBadgeSvg = ({ className = 'w-6 h-6', ...props }) => (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <defs>
            <linearGradient id="earthLeaf" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#86efac" />
                <stop offset="50%" stopColor="#4ade80" />
                <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>
            <filter id="earthGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#16a34a" floodOpacity="0.45" />
            </filter>
        </defs>
        <g filter="url(#earthGlow)">
            {/* Green Feather / Leaf Body */}
            <path
                d="M20 8 L72 8 L72 26 L62 26 L80 34 L80 50 L68 50 L84 58 L84 72 L66 72 L70 82 L60 88 L52 76 L44 80 L38 68 L28 72 L20 8 Z"
                fill="url(#earthLeaf)"
                stroke="#052e16"
                strokeWidth="3.5"
                strokeLinejoin="round"
            />
            {/* Quill Stem Line */}
            <line x1="24" y1="12" x2="68" y2="86" stroke="#052e16" strokeWidth="3" strokeLinecap="round" />
            {/* Feather Vanes (Angular cuts) */}
            <line x1="40" y1="28" x2="68" y2="28" stroke="#065f46" strokeWidth="2.5" />
            <line x1="48" y1="46" x2="76" y2="46" stroke="#065f46" strokeWidth="2.5" />
            <line x1="56" y1="64" x2="80" y2="64" stroke="#065f46" strokeWidth="2.5" />
            {/* Quill Stem Base Stem Tail */}
            <line x1="68" y1="86" x2="82" y2="96" stroke="#052e16" strokeWidth="4" strokeLinecap="round" />
            {/* Gloss Highlight on top blade */}
            <polygon points="23,12 68,12 60,22 26,18" fill="#ffffff" opacity="0.45" />
        </g>
    </svg>
);

// 9. MASTER CHAMPION STAR (Estrela de Campeão - Grande Mestre da Liga)
export const ChampionBadgeSvg = ({ className = 'w-6 h-6', ...props }) => (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <defs>
            <linearGradient id="champStar" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="50%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
            <linearGradient id="champRim" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>
            <filter id="champGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#818cf8" floodOpacity="0.6" />
            </filter>
        </defs>
        <g filter="url(#champGlow)">
            {/* Golden Star Bezel */}
            <polygon
                points="50,4 63,33 95,35 70,56 78,87 50,70 22,87 30,56 5,35 37,33"
                fill="url(#champRim)"
                stroke="#713f12"
                strokeWidth="3.5"
                strokeLinejoin="round"
            />
            {/* Prismatic Gem Star Core */}
            <polygon
                points="50,12 60,36 86,38 66,54 72,80 50,65 28,80 34,54 14,38 40,36"
                fill="url(#champStar)"
                stroke="#312e81"
                strokeWidth="2"
            />
            {/* Center Crystal Core */}
            <polygon
                points="50,28 58,44 72,46 62,56 65,70 50,60 35,70 38,56 28,46 42,44"
                fill="#ffffff"
                opacity="0.6"
            />
            {/* Bright Center Sparkle */}
            <circle cx="50" cy="50" r="4" fill="#ffffff" />
        </g>
    </svg>
);

// 10. STREAK FLAME BADGE (Chama da Constância - Sequência Diária)
export const FlameStreakBadgeSvg = ({ className = 'w-6 h-6', ...props }) => (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <defs>
            <linearGradient id="flameOuter" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#facc15" />
                <stop offset="40%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
            <linearGradient id="flameInner" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="60%" stopColor="#fef08a" />
                <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            <filter id="flameGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#f97316" floodOpacity="0.6" />
            </filter>
        </defs>
        <g filter="url(#flameGlow)">
            {/* Outer Flame Crest */}
            <path
                d="M50 4 C54 18, 76 28, 80 48 C84 66, 74 88, 50 94 C26 88, 16 66, 20 48 C22 36, 32 26, 38 32 C38 24, 46 12, 50 4 Z"
                fill="url(#flameOuter)"
                stroke="#7f1d1d"
                strokeWidth="3.5"
                strokeLinejoin="round"
            />
            {/* Secondary Inner Flame */}
            <path
                d="M50 28 C52 36, 68 46, 68 62 C68 76, 60 84, 50 86 C40 84, 32 76, 32 62 C32 50, 42 42, 44 48 C44 38, 48 32, 50 28 Z"
                fill="url(#flameInner)"
                stroke="#9a3412"
                strokeWidth="2"
            />
            {/* Core Sparkle */}
            <circle cx="50" cy="68" r="5" fill="#ffffff" />
        </g>
    </svg>
);

/**
 * Registry of all available Trainer Badges with requirements and criteria.
 */
export const BADGES_LIST = [
    {
        id: 'badge_boulder',
        key: 'boulder',
        nameEn: 'Boulder Badge',
        namePt: 'Insígnia de Pedra',
        descEn: 'The first step of every Pokémon master. Earned by solving your 1st PokéPuzzle or Quiz.',
        descPt: 'O primeiro passo de todo mestre Pokémon. Conquistada ao resolver seu 1º PokéPuzzle ou Quiz.',
        reqEn: '1 PokéPuzzle or Quiz',
        reqPt: '1 PokéPuzzle ou Quiz',
        category: 'milestone',
        targetCount: 1,
        getProgress: (stats) => {
            const current = Math.max(stats.pokepuzzleWins || 0, stats.completedQuizzesCount || 0);
            return { current: Math.min(current, 1), target: 1, percent: current >= 1 ? 100 : 0 };
        },
        checkUnlocked: (stats) => (stats.pokepuzzleWins || 0) >= 1 || (stats.completedQuizzesCount || 0) >= 1,
        Icon: BoulderBadgeSvg,
        accentColor: '#64748b',
    },
    {
        id: 'badge_cascade',
        key: 'cascade',
        nameEn: 'Cascade Badge',
        namePt: 'Insígnia da Cascata',
        descEn: 'Fluidity and sharp intuition. Earned by solving 5 PokéPuzzles.',
        descPt: 'Fluidez e intuição aguçada. Conquistada ao resolver 5 PokéPuzzles.',
        reqEn: '5 PokéPuzzles',
        reqPt: '5 PokéPuzzles',
        category: 'pokepuzzle',
        targetCount: 5,
        getProgress: (stats) => {
            const current = stats.pokepuzzleWins || 0;
            return { current: Math.min(current, 5), target: 5, percent: Math.min(100, Math.round((current / 5) * 100)) };
        },
        checkUnlocked: (stats) => (stats.pokepuzzleWins || 0) >= 5,
        Icon: CascadeBadgeSvg,
        accentColor: '#0284c7',
    },
    {
        id: 'badge_thunder',
        key: 'thunder',
        nameEn: 'Thunder Badge',
        namePt: 'Insígnia do Trovão',
        descEn: 'Quick wit and energy. Earned by solving 15 PokéPuzzles.',
        descPt: 'Rapidez de raciocínio e energia. Conquistada ao resolver 15 PokéPuzzles.',
        reqEn: '15 PokéPuzzles',
        reqPt: '15 PokéPuzzles',
        category: 'pokepuzzle',
        targetCount: 15,
        getProgress: (stats) => {
            const current = stats.pokepuzzleWins || 0;
            return { current: Math.min(current, 15), target: 15, percent: Math.min(100, Math.round((current / 15) * 100)) };
        },
        checkUnlocked: (stats) => (stats.pokepuzzleWins || 0) >= 15,
        Icon: ThunderBadgeSvg,
        accentColor: '#eab308',
    },
    {
        id: 'badge_rainbow',
        key: 'rainbow',
        nameEn: 'Rainbow Badge',
        namePt: 'Insígnia do Arco-Íris',
        descEn: 'Chromatic mastery and dedication. Earned by solving 30 PokéPuzzles.',
        descPt: 'Maestria cromática e dedicação. Conquistada ao resolver 30 PokéPuzzles.',
        reqEn: '30 PokéPuzzles',
        reqPt: '30 PokéPuzzles',
        category: 'pokepuzzle',
        targetCount: 30,
        getProgress: (stats) => {
            const current = stats.pokepuzzleWins || 0;
            return { current: Math.min(current, 30), target: 30, percent: Math.min(100, Math.round((current / 30) * 100)) };
        },
        checkUnlocked: (stats) => (stats.pokepuzzleWins || 0) >= 30,
        Icon: RainbowBadgeSvg,
        accentColor: '#a855f7',
    },
    {
        id: 'badge_soul',
        key: 'soul',
        nameEn: 'Soul Badge',
        namePt: 'Insígnia da Alma',
        descEn: 'Grandmaster solver with an unwavering spirit of deduction. Earned by solving 50 PokéPuzzles!',
        descPt: 'Grande mestre com espírito inabalável de dedução. Conquistada ao solucionar 50 PokéPuzzles!',
        reqEn: '50 PokéPuzzles',
        reqPt: '50 PokéPuzzles',
        category: 'pokepuzzle',
        targetCount: 50,
        getProgress: (stats) => {
            const current = stats.pokepuzzleWins || 0;
            return { current: Math.min(current, 50), target: 50, percent: Math.min(100, Math.round((current / 50) * 100)) };
        },
        checkUnlocked: (stats) => (stats.pokepuzzleWins || 0) >= 50,
        Icon: SoulBadgeSvg,
        accentColor: '#ec4899',
    },
    {
        id: 'badge_marsh',
        key: 'marsh',
        nameEn: 'Marsh Badge',
        namePt: 'Insígnia do Pântano',
        descEn: 'Flawless generational knowledge. Earned by completing 1 Generation Quiz with 100% accuracy.',
        descPt: 'Conhecimento impecável de uma geração. Conquistada ao completar 1 Quiz com 100% de acerto.',
        reqEn: '1 Perfect Quiz (100%)',
        reqPt: '1 Quiz com 100%',
        category: 'quiz',
        targetCount: 1,
        getProgress: (stats) => {
            const current = stats.perfectQuizzesCount || 0;
            return { current: Math.min(current, 1), target: 1, percent: current >= 1 ? 100 : 0 };
        },
        checkUnlocked: (stats) => (stats.perfectQuizzesCount || 0) >= 1,
        Icon: MarshBadgeSvg,
        accentColor: '#ca8a04',
    },
    {
        id: 'badge_volcano',
        key: 'volcano',
        nameEn: 'Volcano Badge',
        namePt: 'Insígnia do Vulcão',
        descEn: 'A burning passion for Pokémon lore. Earned by completing 3 different Generation Quizzes.',
        descPt: 'Paixão ardente pelo universo Pokémon. Conquistada ao completar 3 gerações de Quizzes.',
        reqEn: '3 Generation Quizzes',
        reqPt: '3 Quizzes de Geração',
        category: 'quiz',
        targetCount: 3,
        getProgress: (stats) => {
            const current = stats.completedQuizzesCount || 0;
            return { current: Math.min(current, 3), target: 3, percent: Math.min(100, Math.round((current / 3) * 100)) };
        },
        checkUnlocked: (stats) => (stats.completedQuizzesCount || 0) >= 3,
        Icon: VolcanoBadgeSvg,
        accentColor: '#ea580c',
    },
    {
        id: 'badge_earth',
        key: 'earth',
        nameEn: 'Earth Badge',
        namePt: 'Insígnia da Terra',
        descEn: 'Highest regional honor. Earned by completing 6 Generation Quizzes or solving 75 PokéPuzzles.',
        descPt: 'A mais alta honraria da Liga. Conquistada ao completar 6 Quizzes ou solucionar 75 PokéPuzzles.',
        reqEn: '6 Quizzes or 75 Puzzles',
        reqPt: '6 Quizzes ou 75 Puzzles',
        category: 'milestone',
        targetCount: 6,
        getProgress: (stats) => {
            const quizProg = (stats.completedQuizzesCount || 0) / 6;
            const puzzleProg = (stats.pokepuzzleWins || 0) / 75;
            const best = Math.max(quizProg, puzzleProg);
            const currentDisplay = (stats.completedQuizzesCount || 0) >= 6
                ? 6
                : stats.completedQuizzesCount || 0;
            return { current: currentDisplay, target: 6, percent: Math.min(100, Math.round(best * 100)) };
        },
        checkUnlocked: (stats) => (stats.completedQuizzesCount || 0) >= 6 || (stats.pokepuzzleWins || 0) >= 75,
        Icon: EarthBadgeSvg,
        accentColor: '#16a34a',
    },
    {
        id: 'badge_champion',
        key: 'champion',
        nameEn: 'Grand Champion Star',
        namePt: 'Estrela de Campeão',
        descEn: 'Supreme League Champion status. Earned by completing 8+ Generation Quizzes or 100 PokéPuzzles.',
        descPt: 'Status de Campeão Supremo da Liga. Conquistada com 8+ Quizzes de Geração ou 100 PokéPuzzles.',
        reqEn: '8 Quizzes or 100 Puzzles',
        reqPt: '8 Quizzes ou 100 Puzzles',
        category: 'master',
        targetCount: 8,
        getProgress: (stats) => {
            const quizProg = (stats.completedQuizzesCount || 0) / 8;
            const puzzleProg = (stats.pokepuzzleWins || 0) / 100;
            const best = Math.max(quizProg, puzzleProg);
            return { current: stats.completedQuizzesCount || 0, target: 8, percent: Math.min(100, Math.round(best * 100)) };
        },
        checkUnlocked: (stats) => (stats.completedQuizzesCount || 0) >= 8 || (stats.pokepuzzleWins || 0) >= 100,
        Icon: ChampionBadgeSvg,
        accentColor: '#818cf8',
    },
    {
        id: 'badge_streak_7',
        key: 'streak_7',
        nameEn: 'Flame of Consistency',
        namePt: 'Chama da Constância',
        descEn: 'Eternal flame of discipline. Earned by maintaining a 7-day Trainer streak.',
        descPt: 'Chama eterna da disciplina. Conquistada ao atingir uma sequência de 7 dias consecutivos.',
        reqEn: '7-day Streak',
        reqPt: 'Sequência de 7 dias',
        category: 'streak',
        targetCount: 7,
        getProgress: (stats) => {
            const streak = Math.max(stats.currentStreak || 0, stats.bestStreak || 0);
            return { current: Math.min(streak, 7), target: 7, percent: Math.min(100, Math.round((streak / 7) * 100)) };
        },
        checkUnlocked: (stats) => Math.max(stats.currentStreak || 0, stats.bestStreak || 0) >= 7,
        Icon: FlameStreakBadgeSvg,
        accentColor: '#f97316',
    },
];

export const BADGES_BY_ID = BADGES_LIST.reduce((acc, badge) => {
    acc[badge.id] = badge;
    return acc;
}, {});

export const getBadgeById = (id) => BADGES_BY_ID[id] || null;

export const isBadgeUnlocked = (badgeId, stats) => {
    const badge = getBadgeById(badgeId);
    if (!badge || !stats) return false;
    return badge.checkUnlocked(stats);
};
