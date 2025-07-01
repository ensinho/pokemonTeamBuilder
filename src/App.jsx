import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
// Funções de query do Firestore que vamos usar
import { getFirestore, collection, doc, getDoc, setDoc, onSnapshot, deleteDoc, query, orderBy, limit, startAfter, where, getDocs } from 'firebase/firestore';

// Suas importações de ícones e assets
import NormalIcon from "./assets/typeIcons/Normal_icon_LA.png";
import FireIcon from "./assets/typeIcons/Fire_icon_LA.png";
import WaterIcon from "./assets/typeIcons/Water_icon_LA.png";
import ElectricIcon from "./assets/typeIcons/Electric_icon_LA.png";
import GrassIcon from "./assets/typeIcons/Grass_icon_LA.png";
import IceIcon from "./assets/typeIcons/Ice_icon_LA.png";
import FightingIcon from "./assets/typeIcons/Fighting_icon_LA.png";
import PoisonIcon from "./assets/typeIcons/Poison_icon_LA.png";
import GroundIcon from "./assets/typeIcons/Ground_icon_LA.png";
import FlyingIcon from "./assets/typeIcons/Flying_icon_LA.png";
import PsychicIcon from "./assets/typeIcons/Psychic_icon_LA.png";
import BugIcon from "./assets/typeIcons/Bug_icon_LA.png";
import RockIcon from "./assets/typeIcons/Rock_icon_LA.png";
import GhostIcon from "./assets/typeIcons/Ghost_icon_LA.png";
import DragonIcon from "./assets/typeIcons/Dragon_icon_LA.png";
import DarkIcon from "./assets/typeIcons/Dark_icon_LA.png";
import SteelIcon from "./assets/typeIcons/Steel_icon_LA.png";
import FairyIcon from "./assets/typeIcons/Fairy_icon_LA.png";


// --- Assets & Data ---
const POKEBALL_PLACEHOLDER_URL = 'https://art.pixilart.com/sr2a947c8f967b8.png';

const THEMES = {
    dark: {
        primary: '#7d65e1',
        background: '#111827',
        card: '#1F2937',
        cardLight: '#374151',
        text: '#FFFFFF',
        textMuted: '#9CA3AF'
    },
    light: {
        primary: '#6353b3',
        background: '#F3F4F6',
        card: '#FFFFFF',
        cardLight: '#E5E7EB',
        text: '#1F2937',
        textMuted: '#6B7280'
    }
};

const typeColors = { normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C', grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1', ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A', rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705746', steel: '#B7B7CE', fairy: '#D685AD' };
const typeIcons = {
    normal: NormalIcon,
    fire: FireIcon,
    water: WaterIcon,
    electric: ElectricIcon,
    grass: GrassIcon,
    ice: IceIcon,
    fighting: FightingIcon,
    poison: PoisonIcon,
    ground: GroundIcon,
    flying: FlyingIcon,
    psychic: PsychicIcon,
    bug: BugIcon,
    rock: RockIcon,
    ghost: GhostIcon,
    dragon: DragonIcon,
    dark: DarkIcon,
    steel: SteelIcon,
    fairy: FairyIcon
};


const typeChart = {
    normal: { damageTaken: { Fighting: 2, Ghost: 0 }, damageDealt: { Rock: 0.5, Steel: 0.5 } },
    fire: { damageTaken: { Water: 2, Ground: 2, Rock: 2, Fire: 0.5, Grass: 0.5, Ice: 0.5, Bug: 0.5, Steel: 0.5, Fairy: 0.5 }, damageDealt: { Fire: 0.5, Water: 0.5, Rock: 0.5, Dragon: 0.5, Grass: 2, Ice: 2, Bug: 2, Steel: 2 } },
    water: { damageTaken: { Grass: 2, Electric: 2, Fire: 0.5, Water: 0.5, Ice: 0.5, Steel: 0.5 }, damageDealt: { Water: 0.5, Grass: 0.5, Dragon: 0.5, Fire: 2, Ground: 2, Rock: 2 } },
    grass: { damageTaken: { Fire: 2, Ice: 2, Poison: 2, Flying: 2, Bug: 2, Water: 0.5, Grass: 0.5, Electric: 0.5, Ground: 0.5 }, damageDealt: { Fire: 0.5, Grass: 0.5, Poison: 0.5, Flying: 0.5, Bug: 0.5, Steel: 0.5, Dragon: 0.5, Water: 2, Ground: 2, Rock: 2 } },
    electric: { damageTaken: { Ground: 2, Electric: 0.5, Flying: 0.5, Steel: 0.5 }, damageDealt: { Grass: 0.5, Electric: 0.5, Dragon: 0.5, Ground: 0, Water: 2, Flying: 2 } },
    ice: { damageTaken: { Fire: 2, Fighting: 2, Rock: 2, Steel: 2, Ice: 0.5 }, damageDealt: { Fire: 0.5, Water: 0.5, Ice: 0.5, Steel: 0.5, Grass: 2, Ground: 2, Flying: 2, Dragon: 2 } },
    fighting: { damageTaken: { Flying: 2, Psychic: 2, Fairy: 2, Bug: 0.5, Rock: 0.5, Dark: 0.5 }, damageDealt: { Flying: 0.5, Psychic: 0.5, Bug: 0.5, Fairy: 0.5, Poison: 0.5, Ghost: 0, Normal: 2, Ice: 2, Rock: 2, Dark: 2, Steel: 2 } },
    poison: { damageTaken: { Ground: 2, Psychic: 2, Grass: 0.5, Fighting: 0.5, Poison: 0.5, Bug: 0.5, Fairy: 0.5 }, damageDealt: { Ground: 0.5, Rock: 0.5, Poison: 0.5, Ghost: 0.5, Steel: 0, Grass: 2, Fairy: 2 } },
    ground: { damageTaken: { Water: 2, Grass: 2, Ice: 2, Poison: 0.5, Rock: 0.5, Electric: 0 }, damageDealt: { Grass: 0.5, Bug: 0.5, Flying: 0, Fire: 2, Electric: 2, Poison: 2, Rock: 2, Steel: 2 } },
    flying: { damageTaken: { Electric: 2, Ice: 2, Rock: 2, Grass: 0.5, Fighting: 0.5, Bug: 0.5, Ground: 0 }, damageDealt: { Electric: 0.5, Rock: 0.5, Steel: 0.5, Grass: 2, Fighting: 2, Bug: 2 } },
    psychic: { damageTaken: { Bug: 2, Ghost: 2, Dark: 2, Fighting: 0.5, Psychic: 0.5 }, damageDealt: { Steel: 0.5, Psychic: 0.5, Dark: 0, Fighting: 2, Poison: 2 } },
    bug: { damageTaken: { Fire: 2, Flying: 2, Rock: 2, Grass: 0.5, Fighting: 0.5, Ground: 0.5 }, damageDealt: { Fire: 0.5, Fighting: 0.5, Poison: 0.5, Flying: 0.5, Ghost: 0.5, Steel: 0.5, Fairy: 0.5, Grass: 2, Psychic: 2, Dark: 2 } },
    rock: { damageTaken: { Water: 2, Grass: 2, Fighting: 2, Ground: 2, Steel: 2, Normal: 0.5, Fire: 0.5, Poison: 0.5, Flying: 0.5 }, damageDealt: { Fighting: 0.5, Ground: 0.5, Steel: 0.5, Fire: 2, Ice: 2, Flying: 2, Bug: 2 } },
    ghost: { damageTaken: { Ghost: 2, Dark: 2, Poison: 0.5, Bug: 0.5, Normal: 0, Fighting: 0 }, damageDealt: { Steel: 0.5, Dark: 0.5, Normal: 0, Ghost: 2, Psychic: 2 } },
    dragon: { damageTaken: { Ice: 2, Dragon: 2, Fairy: 2, Fire: 0.5, Water: 0.5, Grass: 0.5, Electric: 0.5 }, damageDealt: { Steel: 0.5, Fairy: 0, Dragon: 2 } },
    dark: { damageTaken: { Fighting: 2, Bug: 2, Fairy: 2, Ghost: 0.5, Dark: 0.5, Psychic: 0 }, damageDealt: { Fighting: 0.5, Dark: 0.5, Fairy: 0.5, Ghost: 2, Psychic: 2 } },
    steel: { damageTaken: { Fire: 2, Fighting: 2, Ground: 2, Normal: 0.5, Grass: 0.5, Ice: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 0.5, Dragon: 0.5, Steel: 0.5, Fairy: 0.5, Poison: 0 }, damageDealt: { Fire: 0.5, Water: 0.5, Electric: 0.5, Steel: 0.5, Ice: 2, Rock: 2, Fairy: 2 } },
    fairy: { damageTaken: { Poison: 2, Steel: 2, Fighting: 0.5, Bug: 0.5, Dark: 0.5, Dragon: 0 }, damageDealt: { Fire: 0.5, Poison: 0.5, Steel: 0.5, Fighting: 2, Dragon: 2, Dark: 2 } }
};

// --- SVG Icons ---
const GithubIcon = ({ color }) => (<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" style={{ color: color }}><path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.168 6.839 9.492.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.031-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.378.203 2.398.1 2.651.64.7 1.03 1.595 1.03 2.688 0 3.848-2.338 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.001 10.001 0 0022 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" /></svg>);
const LinkedinIcon = ({ color }) => (<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" style={{ color: color }}><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>);
const StarIcon = ({ className = "w-6 h-6", isFavorite, color }) => ( <svg className={className} fill={isFavorite ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: isFavorite ? '#FBBF24' : color }}> <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.95-.69l1.519-4.674z" /> </svg> );
const TrashIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"> <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /> </svg> );
const ClearIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"> <path fillRule="evenodd" clipRule="evenodd" d="M10 8.586l3.95-3.95a1 1 0 111.414 1.414L11.414 10l3.95 3.95a1 1 0 01-1.414 1.414L10 11.414l-3.95 3.95a1 1 0 01-1.414-1.414L8.586 10l-3.95-3.95a1 1 0 011.414-1.414L10 8.586z" /></svg>);
const SaveIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /> </svg> );
const PlusIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"> <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /> </svg> );
const MenuIcon = () => (<svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>);
const CloseIcon = () => (<svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>);
const InfoIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>);
const PokeballIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-pokeball shrink-0"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /><path d="M3 12h6" /><path d="M15 12h6" /></svg>);
const SavedTeamsIcon = () => (<svg className="w-6 h-6 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>);
const CollapseLeftIcon = () => (<svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>);
const CollapseRightIcon = () => (<svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>);
const ShareIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.35a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" /></svg>);
const SuccessToastIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 7.2a2.2 2.2 0 0 1 2.2 -2.2h1a2.2 2.2 0 0 0 1.55 -.64l.7 -.7a2.2 2.2 0 0 1 3.12 0l.7 .7c.412 .41 .97 .64 1.55 .64h1a2.2 2.2 0 0 1 2.2 2.2v1c0 .58 .23 1.138 .64 1.55l.7 .7a2.2 2.2 0 0 1 0 3.12l-.7 .7a2.2 2.2 0 0 0 -.64 1.55v1a2.2 2.2 0 0 1 -2.2 2.2h-1a2.2 2.2 0 0 0 -1.55 .64l-.7 .7a2.2 2.2 0 0 1 -3.12 0l-.7 -.7a2.2 2.2 0 0 0 -1.55 -.64h-1a2.2 2.2 0 0 1 -2.2 -2.2v-1a2.2 2.2 0 0 0 -.64 -1.55l-.7 -.7a2.2 2.2 0 0 1 0 -3.12l.7 -.7a2.2 2.2 0 0 0 .64 -1.55v-1" /><path d="M9 12l2 2l4 -4" /></svg>);
const ErrorToastIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" ><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572" /><path d="M12 6l-2 4l4 3l-2 4v3" /></svg>);
const WarningToastIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>);
const SunIcon = ({ color }) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-sun" style={{ color: color }}><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" /><path d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7" /></svg>);
const MoonIcon = ({ color }) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-moon" style={{ color: color }}><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z" /></svg>);
const SwordsIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-swords"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M21 3v5l-11 9l-4 4l-3 -3l4 -4l9 -11z" /><path d="M5 13l6 6" /><path d="M14.32 17.32l3.68 3.68l3 -3l-3.365 -3.365" /><path d="M10 5.5l-2 -2.5h-5v5l3 2.5" /></svg>);
const EditIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>);
const SparklesIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-sparkles"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6z" /></svg>);
const ShowdownIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-upload"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 9l5 -5l5 5" /><path d="M12 4l0 12" /></svg>);

const TypeBadge = ({ type, colors }) => ( <span className="text-xs text-white font-semibold mr-1 mb-1 px-2.5 py-1 rounded-full shadow-sm" style={{ backgroundColor: typeColors[type] || '#777' }}> {type.toUpperCase()} </span> );

// --- Firebase Config ---
const firebaseConfig = { apiKey: "AIzaSyARU0ZFaHQhC3Iz2v48MMugAx5LwhDAFaM", authDomain: "pokemonbuilder-8f80d.firebaseapp.com", projectId: "pokemonbuilder-8f80d", storageBucket: "pokemonbuilder-8f80d.appspot.com", messagingSenderId: "514902448758", appId: "1:514902448758:web:818f024a8ce15bffa65d57", measurementId: "G-MLY0EFTHDK" };
const appId = 'pokemonTeamBuilder';

// --- Custom Hooks ---
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
};

// --- Helper Components ---
const PokemonCard = React.memo(({ onCardClick, details, lastRef, isSuggested, colors }) => {

    const handleCardClick = (e) => {
        e.stopPropagation();
        onCardClick(details);
    };
    
    if (!details) {
        return (
            <div ref={lastRef} className="rounded-lg p-3 text-center h-[172px]" style={{backgroundColor: colors.cardLight}}>
                <div className="mx-auto h-24 w-24 bg-gray-700 rounded-md animate-pulse"></div>
                <div className="mt-2 h-5 w-24 mx-auto bg-gray-700 rounded animate-pulse"></div>
                <div className="flex justify-center items-center mt-2 gap-2">
                    <div className="h-5 w-5 bg-gray-700 rounded-full animate-pulse"></div>
                </div>
            </div>
        );
    }
    
    return (
       <div
        ref={lastRef}
        onClick={handleCardClick}
        className={`rounded-lg p-3 text-center group relative cursor-pointer transition-all duration-300 ${isSuggested ? 'ring-2 ring-green-400 shadow-lg' : ''}`}
        style={{ backgroundColor: colors.cardLight }}
        >
        {isSuggested && <div className="absolute -top-2 -right-2 text-xs bg-green-500 text-white font-bold py-1 px-2 rounded-full z-10">Suggested</div>}
        <img
            src={details.sprite || POKEBALL_PLACEHOLDER_URL}
            onError={(e) => {
            e.currentTarget.src = POKEBALL_PLACEHOLDER_URL;
            }}
            alt={details.name}
            className="mx-auto w-full h-auto max-w-[120px] group-hover:scale-110 transition-transform"
        />
        <p className="mt-2 text-sm font-semibold capitalize" style={{color: colors.text}}>{details.name}</p>
        <div className="flex justify-center items-center mt-1 gap-1">
            {details.types.map((type) => (
            <img key={type} src={typeIcons[type]} alt={type} className="w-5 h-5" />
            ))}
        </div>
        </div>
    );
});

const StatBar = ({ stat, value, colors }) => {
    const statColors = { hp: 'bg-red-500', attack: 'bg-orange-500', defense: 'bg-yellow-500', 'special-attack': 'bg-blue-500', 'special-defense': 'bg-green-500', speed: 'bg-pink-500' };
    const width = (value / 255) * 100;
    return (
        <div className="flex items-center gap-2">
            <p className="w-1/3 text-sm font-semibold capitalize text-right" style={{color: colors.text}}>{stat.replace('-', ' ')}</p>
            <div className="w-2/3 rounded-full h-4" style={{backgroundColor: colors.cardLight}}>
                <div className={`${statColors[stat]} h-4 rounded-full text-xs text-white flex items-center justify-end pr-2`} style={{ width: `${width}%` }}>{value}</div>
            </div>
        </div>
    );
};

const AbilityChip = ({ ability }) => {
    const [description, setDescription] = useState('');
    const [isTooltipVisible, setTooltipVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const touchTimeout = useRef(null);

    const fetchAbilityDescription = useCallback(async () => {
        if (description || isLoading) return;
        setIsLoading(true);
        try {
            const res = await fetch(ability.url);
            const data = await res.json();
            const effectEntry = data.effect_entries.find(entry => entry.language.name === 'en');
            setDescription(effectEntry?.short_effect || 'No description available.');
        } catch (error) {
            setDescription('Could not load description.');
        } finally {
            setIsLoading(false);
        }
    }, [ability.url, description, isLoading]);

    const handleMouseEnter = () => {
        fetchAbilityDescription();
        setTooltipVisible(true);
    };

    const handleMouseLeave = () => {
        setTooltipVisible(false);
    };
    
    const handleTouchStart = () => {
        fetchAbilityDescription();
        touchTimeout.current = setTimeout(() => {
             setTooltipVisible(true);
        }, 300);
    };

    const handleTouchEnd = () => {
        clearTimeout(touchTimeout.current);
        setTimeout(() => {
            setTooltipVisible(false);
        }, 2000);
    };

    return (
        <span 
            className="relative capitalize text-white inline-block bg-gray-700 px-3 py-1 rounded-full text-sm cursor-pointer"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {ability.name.replace('-', ' ')}
            {isTooltipVisible && (
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-700 text-white text-xs rounded-md shadow-lg z-20">
                    {isLoading ? 'Loading...' : description}
                </span>
            )}
        </span>
    );
}

const PokemonDetailModal = ({ pokemon, onClose, onAdd, currentTeam, colors, showPokemonDetails, db }) => {
    const [showShiny, setShowShiny] = useState(false);
    const [evolutionDetails, setEvolutionDetails] = useState([]);

    useEffect(() => {
        if (!pokemon || !pokemon.evolution_chain_url || !db) return;
        
        const fetchEvolutionChain = async () => {
            try {
                const res = await fetch(pokemon.evolution_chain_url);
                const data = await res.json();
                const chain = [];
                let evoData = data.chain;
                do {
                    chain.push({
                        name: evoData.species.name,
                        url: evoData.species.url
                    });
                    evoData = evoData.evolves_to[0];
                } while (!!evoData && evoData.hasOwnProperty('evolves_to'));

                const detailsPromises = chain.map(async (evo) => {
                    const id = evo.url.split('/').filter(Boolean).pop();
                    const docRef = doc(db, 'artifacts/pokemonTeamBuilder/pokemons', id);
                    const docSnap = await getDoc(docRef);
                    return docSnap.exists() ? docSnap.data() : { name: evo.name, sprite: POKEBALL_PLACEHOLDER_URL };
                });
                
                const resolvedDetails = await Promise.all(detailsPromises);
                setEvolutionDetails(resolvedDetails);

            } catch (error) {
                console.error("Failed to fetch evolution chain", error);
            }
        };

        fetchEvolutionChain();
    }, [pokemon, db]);

    const handleEvolutionClick = (pokeData) => {
        onClose(); 
        showPokemonDetails(pokeData);
    };
    
    if (!pokemon) return null;
    
    const isAlreadyOnTeam = currentTeam.some(p => p.id === pokemon.id);
    const spriteToShow = showShiny ? (pokemon.animatedShinySprite || pokemon.shinySprite) : (pokemon.animatedSprite || pokemon.sprite);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 h-[100vh] flex items-center justify-center z-50 p-4 " onClick={onClose}>
            <div className="rounded-2xl shadow-xl w-full max-w-lg p-6 relative animate-fade-in" style={{backgroundColor: colors.card}} onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"><CloseIcon /></button>
                <div className="text-center">
                    <div className="relative inline-block">
                        <img src={spriteToShow || POKEBALL_PLACEHOLDER_URL} alt={pokemon.name} className="mx-auto h-32 w-36 image-pixelated"/>
                        <button 
                             onClick={() => setShowShiny(!showShiny)} 
                             className={`absolute bottom-0 right-0 p-1 rounded-full ${showShiny ? 'bg-yellow-500' : 'bg-gray-700'}`} 
                             style={{color: 'white'}} 
                             title="Toggle Shiny">
                            <SparklesIcon />
                        </button>
                    </div>
                    <h2 className="text-3xl font-bold capitalize mt-2" style={{color: colors.text}}>{pokemon.name} <span style={{color: colors.textMuted}}>#{pokemon.id}</span></h2>
                    <div className="flex justify-center gap-2 mt-2">
                        {pokemon.types.map(type => <TypeBadge key={type} type={type} colors={colors} />)}
                    </div>
                </div>
                <div className="mt-6">
                    <h3 className="text-xl font-bold mb-3 text-center" style={{color: colors.text}}>Base Stats</h3>
                    <div className="space-y-2">
                        {pokemon.stats?.map(stat => <StatBar key={stat.name} stat={stat.name} value={stat.base_stat} colors={colors} />)}
                    </div>
                </div>
                 {evolutionDetails.length > 1 && (
                    <div className="mt-6">
                        <h3 className="text-xl font-bold mb-3 text-center" style={{ color: colors.text }}>Evolution Line</h3>
                        <div className="flex justify-center items-center gap-2">
                            {evolutionDetails.map((evo, index) => (
                                <React.Fragment key={evo.name}>
                                    <div onClick={() => handleEvolutionClick(evo)} className="text-center cursor-pointer p-2 rounded-lg hover:bg-purple-500/30">
                                        <img src={evo.sprite || POKEBALL_PLACEHOLDER_URL} alt={evo.name} className="h-20 w-20 mx-auto" />
                                        <p className="text-sm capitalize" style={{color: colors.text}}>{evo.name}</p>
                                    </div>
                                    {index < evolutionDetails.length - 1 && <span className="text-2xl" style={{color: colors.textMuted}}>→</span>}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                )}
                <div className="mt-6">
                    <h3 className="text-xl font-bold mb-3 text-center">Abilities</h3>
                    <div className="flex flex-wrap justify-center gap-2">
                        {pokemon.abilities?.map((ability, index) => <AbilityChip key={index} ability={ability} />)}
                    </div>
                </div>
                <div className="mt-8 flex justify-center" >
                    {!isAlreadyOnTeam && onAdd && (
                        <button onClick={() => { onAdd(pokemon); onClose(); }} className="bg-primary hover:bg-purple-500/30 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transition-colors">
                            <PlusIcon /> Add to Team
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const TeamPokemonEditorModal = ({ pokemon, onClose, onSave, colors, items, natures, moveDetailsCache, setMoveDetailsCache }) => {
    const [customization, setCustomization] = useState(pokemon.customization);
    const [remainingEVs, setRemainingEVs] = useState(510);
    const [moveSearch, setMoveSearch] = useState('');
    const statNames = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];

    const fetchMoveDetails = useCallback(async (moveUrl, moveName) => {
        if (moveDetailsCache[moveName]) {
            return moveDetailsCache[moveName];
        }
        try {
            const res = await fetch(moveUrl);
            const data = await res.json();
            const moveData = {
                name: data.name,
                type: data.type.name,
                power: data.power,
                accuracy: data.accuracy,
                pp: data.pp,
                damage_class: data.damage_class.name,
            };
            setMoveDetailsCache(prev => ({...prev, [moveName]: moveData}));
            return moveData;
        } catch (error) {
            console.error(`Failed to fetch details for move: ${moveName}`, error);
            return null;
        }
    }, [moveDetailsCache, setMoveDetailsCache]);

    useEffect(() => {
        const totalEVs = Object.values(customization.evs).reduce((sum, ev) => sum + ev, 0);
        setRemainingEVs(510 - totalEVs);
    }, [customization.evs]);

    const handleEvChange = (stat, value) => {
        const numericValue = Number(value);
        const currentEvs = { ...customization.evs };
        const oldVal = currentEvs[stat];
        const diff = numericValue - oldVal;

        if (numericValue > 252) return;
        if (remainingEVs - diff < 0) return;

        setCustomization(prev => ({
            ...prev,
            evs: { ...prev.evs, [stat]: numericValue }
        }));
    };

    const handleCustomizationChange = (field, value) => {
        setCustomization(prev => ({...prev, [field]: value}));
    }

    const handleMoveToggle = (moveName) => {
        setCustomization(prev => {
            const currentMoves = prev.moves;
            const newMoves = currentMoves.includes(moveName)
                ? currentMoves.filter(m => m !== moveName)
                : [...currentMoves, moveName];
            
            if (newMoves.length > 4) return prev; 
            return { ...prev, moves: newMoves };
        });
    };
    
    const handleSaveChanges = () => {
        onSave(pokemon.instanceId, customization);
        onClose();
    };

    const calculateStat = (base, ev, statName) => {
        if (statName === 'hp') {
            return Math.floor(base * 2 + 31 + Math.floor(ev / 4)) + 110;
        }
        return Math.floor((Math.floor(base * 2 + 31 + Math.floor(ev / 4)) + 5));
    };

    const filteredMoves = useMemo(() => {
        if (!moveSearch) return pokemon.moves;
        return pokemon.moves.filter(m => m.name.toLowerCase().includes(moveSearch.toLowerCase()));
    }, [moveSearch, pokemon.moves]);

    useEffect(() => {
        filteredMoves.slice(0, 20).forEach(m => {
            if (!moveDetailsCache[m.name]) {
                fetchMoveDetails(m.url, m.name);
            }
        });
    }, [filteredMoves, moveDetailsCache, fetchMoveDetails]);

    if (!pokemon) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar p-6 relative animate-fade-in" style={{backgroundColor: colors.card, '--scrollbar-track-color': colors.card, '--scrollbar-thumb-color': colors.primary, '--scrollbar-thumb-border-color': colors.card}} onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"><CloseIcon /></button>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="flex flex-col items-center">
                        <img src={customization.isShiny ? (pokemon.animatedShinySprite || pokemon.shinySprite) : (pokemon.animatedSprite || pokemon.sprite)} alt={pokemon.name} className="mx-auto h-32 w-36 image-pixelated" />
                        <h2 className="text-3xl font-bold capitalize mt-2" style={{color: colors.text}}>{pokemon.name}</h2>
                        <div className="flex justify-center gap-2 mt-2">
                            {pokemon.types.map(type => <TypeBadge key={type} type={type} colors={colors} />)}
                        </div>
                        
                        <div className="w-full mt-4 grid grid-cols-2 gap-4">
                           <div>
                                <label className="block text-sm font-bold mb-1" style={{color: colors.text}}>Item</label>
                                <select value={customization.item} onChange={(e) => handleCustomizationChange('item', e.target.value)} className="w-full p-2 rounded-lg border-2 capitalize" style={{backgroundColor: colors.cardLight, borderColor: 'transparent', color: colors.text}}>
                                    <option value="">None</option>
                                    {items.map(item => <option key={item.name} value={item.name} className="capitalize">{item.name.replace(/-/g, ' ')}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1" style={{color: colors.text}}>Nature</label>
                                <select value={customization.nature} onChange={(e) => handleCustomizationChange('nature', e.target.value)} className="w-full p-2 rounded-lg border-2 capitalize" style={{backgroundColor: colors.cardLight, borderColor: 'transparent', color: colors.text}}>
                                    {natures.map(n => <option key={n.name} value={n.name} className="capitalize">{n.name.replace(/-/g, ' ')}</option>)}
                                </select>
                            </div>
                             <div>
                                <label className="block text-sm font-bold mb-1" style={{color: colors.text}}>Tera Type</label>
                                <select value={customization.teraType} onChange={(e) => handleCustomizationChange('teraType', e.target.value)} className="w-full p-2 rounded-lg border-2 capitalize" style={{backgroundColor: colors.cardLight, borderColor: 'transparent', color: colors.text}}>
                                    {Object.keys(typeColors).map(type => <option key={type} value={type} className="capitalize">{type}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center justify-start pt-5">
                                <label htmlFor="shiny-toggle" className="flex items-center cursor-pointer">
                                    <div className="relative">
                                        <input type="checkbox" id="shiny-toggle" className="sr-only" checked={customization.isShiny} onChange={(e) => handleCustomizationChange('isShiny', e.target.checked)} />
                                        <div className="block w-10 h-6 bg-gray-600 rounded-full"></div>
                                        <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition"></div>
                                    </div>
                                    <div className="ml-3 text-sm font-bold" style={{color: colors.text}}>Shiny</div>
                                </label>
                            </div>
                        </div>

                         <div className="w-full mt-4">
                            <label className="block text-lg font-bold mb-2" style={{color: colors.text}}>Ability</label>
                            <select value={customization.ability} onChange={(e) => handleCustomizationChange('ability', e.target.value)} className="w-full p-3 rounded-lg border-2 focus:outline-none capitalize" style={{backgroundColor: colors.cardLight, borderColor: 'transparent', color: colors.text}}>
                                {pokemon.abilities.map((ability) => (
                                    <option key={ability.name} value={ability.name} className="capitalize">{ability.name.replace(/-/g, ' ')}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div>
                        <h3 className="text-lg font-bold" style={{color: colors.text}}>Stats & EVs</h3>
                        <p className="text-sm mb-2" style={{color: colors.textMuted}}>Remaining EVs: <span className="font-bold text-lg" style={{color: colors.primary}}>{remainingEVs}</span></p>
                        
                        <div className="space-y-3">
                            {statNames.map((statName, i) => {
                                const baseStat = pokemon.stats[i].base_stat;
                                const ev = customization.evs[statName];
                                const totalStat = calculateStat(baseStat, ev, statName);
                                return (
                                <div key={statName}>
                                    <div className="flex justify-between items-center capitalize text-sm">
                                        <span style={{color: colors.text}}>{statName.replace(/-/g, ' ')}</span>
                                        <span style={{color: colors.textMuted}}>{ev} / {totalStat}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="range" min="0" max="252" value={ev} step="4" onChange={(e) => handleEvChange(statName, e.target.value)} className="w-full h-2 rounded-lg appearance-none cursor-pointer" style={{backgroundColor: colors.cardLight}}/>
                                    </div>
                                </div>
                                )
                            })}
                        </div>

                        <div className="mt-6">
                             <h3 className="text-lg font-bold mb-2" style={{color: colors.text}}>Move Selection</h3>
                             <div className="grid grid-cols-2 gap-2 min-h-[80px] mb-4 p-2 rounded-lg" style={{backgroundColor: colors.background}}>
                                {customization.moves.map(moveName => {
                                    const moveType = moveDetailsCache[moveName]?.type;
                                    return (
                                        <div key={moveName} className="p-2 rounded-lg text-center text-sm capitalize text-white" style={{ backgroundColor: moveType ? typeColors[moveType] : colors.cardLight }}>
                                            {moveName.replace(/-/g, ' ')}
                                        </div>
                                    )
                                })}
                                {Array.from({ length: 4 - customization.moves.length }).map((_, i) => (
                                    <div key={i} className="p-2 rounded-lg flex items-center justify-center" style={{backgroundColor: colors.cardLight, opacity: 0.5}}>
                                        <div className="w-8 h-1 rounded-full" style={{backgroundColor: colors.background}}></div>
                                    </div>
                                ))}
                            </div>
                             <input type="text" placeholder="Search moves..." value={moveSearch} onChange={(e) => setMoveSearch(e.target.value)} className="w-full p-2 rounded-lg mb-2" style={{backgroundColor: colors.cardLight, color: colors.text}}/>
                             <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-2" style={{'--scrollbar-track-color': colors.card, '--scrollbar-thumb-color': colors.primary, '--scrollbar-thumb-border-color': colors.card}}>
                                {filteredMoves.map((move) => {
                                    const moveType = moveDetailsCache[move.name]?.type;
                                    const isSelected = customization.moves.includes(move.name);
                                    
                                    const style = isSelected 
                                      ? { backgroundColor: moveType ? typeColors[moveType] : colors.primary, color: 'white' }
                                      : { backgroundColor: colors.cardLight, color: colors.text };

                                    return (
                                        <button 
                                            key={move.name} 
                                            onClick={() => handleMoveToggle(move.name)}
                                            className={`p-2 rounded-lg text-sm capitalize transition-colors ${!isSelected && 'hover:opacity-80'}`}
                                            style={style}
                                            >
                                            {move.name.replace(/-/g, ' ')}
                                        </button>
                                    )
                                })}
                             </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                     <button onClick={handleSaveChanges} className="bg-primary hover:bg-purple-500/30 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transition-colors">
                        <SaveIcon /> Confirm Changes
                    </button>
                </div>
            </div>
        </div>
    )
};


const TeamBuilderView = ({
    currentTeam, teamName, setTeamName, handleRemoveFromTeam, handleSaveTeam, editingTeamId, handleClearTeam,
    recentTeams, setCurrentPage, handleToggleFavorite, handleEditTeam, handleShareTeam, handleDeleteTeam, handleExportToShowdown,
    teamAnalysis,
    searchInput, setSearchInput, selectedGeneration, setSelectedGeneration, generations,
    isInitialLoading,
    availablePokemons, handleAddPokemonToTeam, lastPokemonElementRef, isFetchingMore,
    selectedTypes, handleTypeSelection, showDetails,
    suggestedPokemonIds, colors, onEditTeamPokemon
}) => (
    <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-3 space-y-8">
            <section className="p-6 rounded-xl shadow-lg" style={{backgroundColor: colors.card}}>
                <h2 className="text-base md:text-lg font-bold mb-4 border-b-2 pb-2" style={{fontFamily: "'Press Start 2P'", borderColor: colors.primary, color: colors.text}}>Current Team</h2>
                <input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Team Name" className="w-full p-3 rounded-lg border-2 focus:outline-none" style={{backgroundColor: colors.cardLight, borderColor: 'transparent', color: colors.text}}/>
                <div className="grid grid-cols-3 gap-4 min-h-[120px] p-4 rounded-lg mt-4 " style={{backgroundColor: colors.background}}>
                    {currentTeam.map(p => (
                        <div key={p.instanceId} className="text-center relative group cursor-pointer" onClick={() => onEditTeamPokemon(p)}>
                            <img
                            src={p.animatedSprite || p.sprite || POKEBALL_PLACEHOLDER_URL}
                            onError={(e) => { e.currentTarget.src = p.sprite || POKEBALL_PLACEHOLDER_URL }}
                            alt={p.name}
                            className="mx-auto h-20 w-20"
                            />
                            <p className="text-xs capitalize truncate" style={{color: colors.text}}>{p.name}</p>

                             <button
                                onClick={(e) => { e.stopPropagation(); onEditTeamPokemon(p); }}
                                className="absolute top-1 left-1 bg-gray-700 bg-opacity-50 text-white rounded-full h-6 w-6 flex items-center justify-center transition-opacity text-sm opacity-100 visible lg:opacity-0 lg:invisible lg:group-hover:opacity-100 lg:group-hover:visible"
                                >
                                <EditIcon />
                            </button>

                            <button
                            onClick={(e) => { e.stopPropagation(); handleRemoveFromTeam(p.instanceId); }}
                            className="
                                absolute top-1 right-1 bg-red-600 text-white rounded-full h-6 w-6 flex items-center justify-center text-sm
                                opacity-100 visible
                                lg:opacity-0 lg:invisible
                                lg:group-hover:opacity-100 lg:group-hover:visible
                                transition-opacity duration-200 
                            "
                            >
                            <TrashIcon/>
                            </button>
                        </div>
                        ))}

                    {Array.from({ length: 6 - currentTeam.length }).map((_, i) => (<div key={i} className="flex items-center justify-center"><img src={POKEBALL_PLACEHOLDER_URL} alt="Empty team slot" className="w-12 h-12 opacity-40"/></div>))}
                </div>
                <div className="flex items-center gap-2 mt-4">
                    <button onClick={handleSaveTeam} className="w-full flex items-center justify-center font-bold py-2 px-4 rounded-lg hover:opacity-90" style={{backgroundColor: colors.primary, color: colors.background}}> <SaveIcon /> {editingTeamId ? 'Update' : 'Save'} </button>
                    <button onClick={handleExportToShowdown} className="p-2 rounded-lg hover:opacity-80" style={{backgroundColor: colors.cardLight, color: colors.text}} title="Export to Showdown"><ShowdownIcon /></button>
                    <button onClick={handleShareTeam} className="p-2 rounded-lg hover:opacity-80" style={{backgroundColor: colors.cardLight, color: colors.text}} title="Share Team"><ShareIcon /></button>
                    <button onClick={handleClearTeam} className="p-2 rounded-lg hover:opacity-80" style={{backgroundColor: colors.cardLight, color: colors.text}} title="Clear Team"><ClearIcon /></button>
                </div>
            </section>
            
            <section className="p-6 rounded-xl shadow-lg" style={{backgroundColor: colors.card}}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-base md:text-lg font-bold" style={{fontFamily: "'Press Start 2P'", color: colors.text}}>Recent Teams</h2>
                    <button onClick={() => setCurrentPage('allTeams')} className="text-sm hover:underline" style={{color: colors.primary}}>View All</button>
                </div>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar" style={{'--scrollbar-track-color': colors.card, '--scrollbar-thumb-color': colors.primary, '--scrollbar-thumb-border-color': colors.card}}>
                    {recentTeams.length > 0 ? recentTeams.map(team => (
                        <div key={team.id} className="p-4 rounded-lg flex items-center justify-between transition-colors" style={{backgroundColor: colors.cardLight}}>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-lg truncate" style={{color: colors.text}}>{team.name}</p>
                                <div className="flex mt-1">
                                    {team.pokemons.map(p => <img key={p.id} src={p.sprite || POKEBALL_PLACEHOLDER_URL} onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL }} alt={p.name} className="h-8 w-8 -ml-2 border-2 rounded-full" style={{borderColor: colors.cardLight, backgroundColor: colors.card}} />)}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                <button onClick={() => handleToggleFavorite(team)} title="Favorite">
                                    <StarIcon isFavorite={team.isFavorite} color={colors.textMuted} />
                                </button>
                                <button onClick={() => handleEditTeam(team)} className="text-xs font-bold py-1 px-3 rounded-full" style={{backgroundColor: colors.primary, color: colors.background}} >Edit</button>
                                <button onClick={() => handleDeleteTeam(team.id)} className="bg-red-600 p-1 hover:bg-red-700 text-white rounded-lg"><TrashIcon /></button>
                            </div>
                        </div>
                    )) : <p className="text-center py-4" style={{color: colors.textMuted}}>No recent teams yet.</p>}
                </div>
            </section>
        </div>

        <div className="lg:col-span-6">
            <section className="p-6 rounded-xl shadow-lg h-full flex flex-col" style={{backgroundColor: colors.card}}>
                <div className="mb-4">
                    <h2 className="text-lg md:text-xl font-bold mb-4" style={{fontFamily: "'Press Start 2P'", color: colors.text}}>Choose your Pokémon!</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input type="text" placeholder="Search Pokémon..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="w-full p-3 rounded-lg border-2 focus:outline-none" style={{backgroundColor: colors.cardLight, borderColor: 'transparent', color: colors.text}}/>
                        <select value={selectedGeneration} onChange={e => setSelectedGeneration(e.target.value)} className="w-full p-3 rounded-lg border-2 focus:outline-none appearance-none capitalize" style={{backgroundColor: colors.cardLight, borderColor: 'transparent', color: colors.text}}>
                            <option value="all" style={{color: colors.text}}>All Generations</option>
                            {generations.map(gen => <option key={gen} value={gen} className="capitalize" style={{color: colors.text}}>{gen.replace('-', ' ')}</option>)}
                        </select>
                    </div>
                </div>
                <div className="relative flex-grow h-[60vh]">
                    {isInitialLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{borderColor: colors.primary}}></div>
                        </div>
                    ) : (
                    <>
                        <div className="h-full overflow-y-auto custom-scrollbar" style={{'--scrollbar-track-color': colors.card, '--scrollbar-thumb-color': colors.primary, '--scrollbar-thumb-border-color': colors.card}}>
                            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-2">
                                {availablePokemons.map((pokemon, index) => <PokemonCard key={pokemon.id} details={pokemon} onCardClick={handleAddPokemonToTeam} lastRef={index === availablePokemons.length - 1 ? lastPokemonElementRef : null} isSuggested={suggestedPokemonIds.has(pokemon.id)} colors={colors} />)}
                            </div>
                            {isFetchingMore && <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{borderColor: colors.primary}}></div></div>}
                            {availablePokemons.length === 0 && !isInitialLoading && <p className="text-center py-8" style={{color: colors.textMuted}}>No Pokémon found with these filters. :(</p>}
                        </div>
                    </>)}
                </div>
            </section>
        </div>

        <div className="lg:col-span-3 space-y-8">
            <section className="p-6 rounded-xl shadow-lg" style={{backgroundColor: colors.card}}>
                <h3 className="text-base md:text-lg font-bold mb-3 text-center" style={{fontFamily: "'Press Start 2P'", color: colors.text}}>Filter by Type</h3>
                <div className="grid grid-cols-5 lg:grid-cols-5 gap-1.5">
                    {Object.keys(typeColors).map(type => (
                        <button key={type} onClick={() => handleTypeSelection(type)} className={`p-1.5 rounded-lg bg-transparent transition-colors hover:opacity-75 ${selectedTypes.has(type) ? 'ring-2 ring-purple' : ''}`} style={{backgroundColor: colors.cardLight}} title={type}>
                            <img src={typeIcons[type]} alt={type} className="w-full h-full object-contain" />
                        </button>
                    ))}
                </div>
            </section>
            {currentTeam.length > 0 && (
                <section className="p-6 rounded-xl shadow-lg" style={{ backgroundColor: colors.card }}>
                    <h3 className="text-lg md:text-xl font-bold mb-4" style={{color: colors.text}}>Team Analysis</h3>
                    <div>
                        <h4 className="font-semibold mb-2 text-green-400">Offensive Coverage:</h4>
                        <div className="flex flex-wrap gap-1">
                            {teamAnalysis.strengths.size > 0 ? Array.from(teamAnalysis.strengths).sort().map(type => <TypeBadge key={type} type={type} colors={colors} />) : <p className="text-sm" style={{color: colors.textMuted}}>No type advantages found.</p>}
                        </div>
                    </div>
                    <div className="mt-4">
                        <h4 className="font-semibold mb-2 text-red-400">Defensive Weaknesses:</h4>
                        <div className="flex flex-wrap gap-1">
                            {Object.keys(teamAnalysis.weaknesses).length > 0 ? Object.entries(teamAnalysis.weaknesses).sort(([,a],[,b]) => b-a).map(([type, score]) => (
                                <div key={type} className="flex items-center">
                                    <TypeBadge type={type} colors={colors} />
                                    <span className="text-xs text-red-300">({score}x)</span>
                                </div>
                            )) : <p className="text-sm" style={{color: colors.textMuted}}>Your team is rock solid!</p>}
                        </div>
                    </div>
                </section>
            )}
        </div>
    </main>
);

const AllTeamsView = ({teams, onEdit, onDelete, onToggleFavorite, searchTerm, setSearchTerm, colors}) => (
    <div className="p-6 rounded-xl shadow-lg" style={{backgroundColor: colors.card}}>
        <h2 className="text-2xl md:text-3xl font-bold mb-6" style={{color: colors.text}}>All Saved Teams</h2>
        <input type="text" placeholder="Search teams by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-3 mb-6 rounded-lg border-2 focus:outline-none" style={{backgroundColor: colors.cardLight, borderColor: 'transparent', color: colors.text}}/>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {teams.length > 0 ? teams.map(team => (
                <div key={team.id} className="p-4 rounded-lg flex flex-col justify-between" style={{backgroundColor: colors.cardLight}}>
                    <div className="flex justify-between items-start">
                        <p className="font-bold text-xl truncate mb-2" style={{color: colors.text}}>{team.name}</p>
                        <button onClick={() => onToggleFavorite(team)} title="Favorite">
                            <StarIcon isFavorite={team.isFavorite} color={colors.textMuted} />
                        </button>
                    </div>
                    <div className="flex my-2">
                        {team.pokemons.map(p => <img key={p.id} src={p.sprite || POKEBALL_PLACEHOLDER_URL} onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL }} alt={p.name} className="h-12 w-12 -ml-3 border-2 rounded-full" style={{borderColor: colors.cardLight, backgroundColor: colors.card}} />)}
                    </div>
                    <div className="flex items-center gap-2 mt-auto pt-2">
                        <button onClick={() => onEdit(team)} className="w-full bg-primary hover:bg-purple-500/30 text-white font-bold py-2 px-4 rounded-lg">Edit</button>
                        <button onClick={() => onDelete(team.id)} className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"><TrashIcon /></button>
                    </div>
                </div>
            )) : <p className="col-span-full text-center py-8" style={{color: colors.textMuted}}>No teams found.</p>}
        </div>
    </div>
);

const PokedexView = ({
    pokemons,
    lastPokemonElementRef, isFetchingMore,
    searchInput, setSearchInput, selectedTypes, handleTypeSelection,
    selectedGeneration, setSelectedGeneration, generations,
    isInitialLoading, colors, showDetails
}) => {
    return (
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
             <div className="lg:col-span-9">
                 <section className="p-6 rounded-xl shadow-lg h-full flex flex-col" style={{backgroundColor: colors.card}}>
                     <div className="mb-4">
                         <h2 className="text-lg md:text-xl font-bold mb-4" style={{fontFamily: "'Press Start 2P'", color: colors.text}}>Pokédex</h2>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <input type="text" placeholder="Search Pokémon..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="w-full p-3 rounded-lg border-2 focus:outline-none" style={{backgroundColor: colors.cardLight, borderColor: 'transparent', color: colors.text}}/>
                             <select value={selectedGeneration} onChange={e => setSelectedGeneration(e.target.value)} className="w-full p-3 rounded-lg border-2 focus:outline-none appearance-none capitalize" style={{backgroundColor: colors.cardLight, borderColor: 'transparent', color: colors.text}}>
                                 <option value="all" style={{color: colors.text}}>All Generations</option>
                                 {generations.map(gen => <option key={gen} value={gen} className="capitalize" style={{color: colors.text}}>{gen.replace('-', ' ')}</option>)}
                             </select>
                         </div>
                     </div>
                     <div className="relative flex-grow h-[75vh]">
                         {isInitialLoading ? (
                             <div className="absolute inset-0 flex items-center justify-center">
                                 <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{borderColor: colors.primary}}></div>
                             </div>
                         ) : (
                         <>
                             <div className="h-full overflow-y-auto custom-scrollbar" style={{'--scrollbar-track-color': colors.card, '--scrollbar-thumb-color': colors.primary, '--scrollbar-thumb-border-color': colors.card}}>
                                 <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-2">
                                     {pokemons.map((pokemon, index) => <PokemonCard key={pokemon.id} details={pokemon} onCardClick={showDetails} lastRef={index === pokemons.length - 1 ? lastPokemonElementRef : null} colors={colors} />)}
                                 </div>
                                 {isFetchingMore && <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{borderColor: colors.primary}}></div></div>}
                                 {pokemons.length === 0 && !isInitialLoading && <p className="text-center py-8" style={{color: colors.textMuted}}>No Pokémon found.</p>}
                             </div>
                         </>)}
                     </div>
                 </section>
             </div>

             <div className="lg:col-span-3 space-y-8">
                 <section className="p-6 rounded-xl shadow-lg" style={{backgroundColor: colors.card}}>
                     <h3 className="text-base md:text-lg font-bold mb-3 text-center" style={{fontFamily: "'Press Start 2P'", color: colors.text}}>Filter by Type</h3>
                     <div className="grid grid-cols-5 lg:grid-cols-5 gap-1.5">
                         {Object.keys(typeColors).map(type => (
                             <button key={type} onClick={() => handleTypeSelection(type)} className={`p-1.5 rounded-lg bg-transparent transition-colors hover:opacity-75 ${selectedTypes.has(type) ? 'ring-2 ring-purple' : ''}`} style={{backgroundColor: colors.cardLight}} title={type}>
                                 <img src={typeIcons[type]} alt={type} className="w-full h-full object-contain" />
                             </button>
                         ))}
                     </div>
                 </section>
             </div>
        </main>
    )
};

export default function App() {
    // Theme State
    const [theme, setTheme] = useState('light');
    const colors = THEMES[theme];

    // Firebase States
    const [userId, setUserId] = useState(null);
    const [db, setDb] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    
    // --- ESTADOS REVISADOS PARA BUSCA NO FIRESTORE ---
    const [pokemons, setPokemons] = useState([]); // Lista de pokémons visíveis
    const [lastVisibleDoc, setLastVisibleDoc] = useState(null); // Cursor para paginação do Firestore
    const [hasMore, setHasMore] = useState(true); // Indica se há mais pokémons para carregar
    
    // Caches para dados secundários que ainda podem vir da API ou para otimização
    const [pokemonDetailsCache, setPokemonDetailsCache] = useState({});
    const [moveDetailsCache, setMoveDetailsCache] = useState({});
    
    // Estados de dados que não mudam (Items, Natures)
    const [items, setItems] = useState([]);
    const [natures, setNatures] = useState([]);
    const [generations, setGenerations] = useState([]);
    
    // --- ESTADOS DE FILTRO (Mantidos para cada view) ---
    // Filtros do Team Builder
    const [selectedGeneration, setSelectedGeneration] = useState('all');
    const [selectedTypes, setSelectedTypes] = useState(new Set());
    const [searchInput, setSearchInput] = useState('');
    const debouncedSearchTerm = useDebounce(searchInput, 300);
    
    // Filtros do Pokédex
    const [pokedexSelectedGeneration, setPokedexSelectedGeneration] = useState('all');
    const [pokedexSelectedTypes, setPokedexSelectedTypes] = useState(new Set());
    const [pokedexSearchInput, setPokedexSearchInput] = useState('');
    const debouncedPokedexSearchTerm = useDebounce(pokedexSearchInput, 300);

    // Team States (permanecem os mesmos)
    const [currentTeam, setCurrentTeam] = useState([]);
    const [savedTeams, setSavedTeams] = useState([]);
    const [teamName, setTeamName] = useState('');
    const [editingTeamId, setEditingTeamId] = useState(null);
    const [teamAnalysis, setTeamAnalysis] = useState({ strengths: new Set(), weaknesses: {} });
    
    // UI States (revisados para nova lógica de loading)
    const [isLoading, setIsLoading] = useState(true); // Loading inicial ou de filtro
    const [isFetchingMore, setIsFetchingMore] = useState(false); // Loading do scroll infinito
    const [toasts, setToasts] = useState([]);
    const [currentPage, setCurrentPage] = useState('builder');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [teamSearchTerm, setTeamSearchTerm] = useState('');
    const [modalPokemon, setModalPokemon] = useState(null);
    const [editingTeamMember, setEditingTeamMember] = useState(null);
    const [maxToasts, setMaxToasts] = useState(3);
    const [suggestedPokemonIds, setSuggestedPokemonIds] = useState(new Set());
    const [sharedTeamLoaded, setSharedTeamLoaded] = useState(false);       

    const showToast = useCallback((message, type = 'info') => {
        const id = Date.now();
        setToasts(prevToasts => [...prevToasts, { id, message, type }]);
        setTimeout(() => setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id)), 3000);
    }, []);

    useEffect(() => {
        if (!db || !userId) return;

        const teamsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/teams`);
        const q = query(teamsCollectionRef, orderBy('updatedAt', 'desc'));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const teamsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSavedTeams(teamsData);
        }, (error) => {
            console.error("Error listening to saved teams:", error);
            showToast("Could not fetch saved teams.", "error");
        });

        // Cleanup a subscription quando o componente desmontar
        return () => unsubscribe();

    }, [db, userId, showToast]);    

    // Busca dados estáticos (gens, items, natures) uma vez no início
    useEffect(() => {
        const fetchStaticData = async () => {
             try {
                const genRes = await fetch('https://pokeapi.co/api/v2/generation');
                const genData = await genRes.json();
                setGenerations(genData.results.map(g => g.name));

                const itemRes = await fetch('https://pokeapi.co/api/v2/item?limit=2000');
                const itemData = await itemRes.json();
                setItems(itemData.results);
                
                const natureRes = await fetch('https://pokeapi.co/api/v2/nature');
                const natureData = await natureRes.json();
                setNatures(natureData.results);
             } catch (e) {
                showToast("Failed to load filter data.", "error");
             }
        }
        fetchStaticData();
    }, []);

useEffect(() => {
    const teamDetails = currentTeam; 

    if (teamDetails.length === 0) {
        setTeamAnalysis({ strengths: new Set(), weaknesses: {} });
        setSuggestedPokemonIds(new Set());
        return;
    }
    
    const teamWeaknessCounts = {};
    const offensiveCoverage = new Set();
    
    teamDetails.flatMap(d => d.types).forEach(type => {
        Object.entries(typeChart[type]?.damageDealt || {}).forEach(([vs, mult]) => {
            if (mult > 1) offensiveCoverage.add(vs.toLowerCase());
        });
    });

    Object.keys(typeChart).forEach(attackingType => {
        const capitalizedAttackingType = attackingType.charAt(0).toUpperCase() + attackingType.slice(1);
        let weakCount = 0;
        let resistanceCount = 0;

        teamDetails.forEach(pokemon => {
            const multiplier = pokemon.types.reduce((acc, pokemonType) => {
                return acc * (typeChart[pokemonType]?.damageTaken[capitalizedAttackingType] ?? 1);
            }, 1);

            if (multiplier > 1) {
                weakCount++;
            } else if (multiplier < 1) {
                resistanceCount++;
            }
        });
        
        if (weakCount > 0 && weakCount >= teamDetails.length / 2 && weakCount > resistanceCount) {
            teamWeaknessCounts[attackingType] = weakCount;
        }
    });
    setTeamAnalysis({ strengths: offensiveCoverage, weaknesses: teamWeaknessCounts });

    const weaknessTypes = Object.keys(teamWeaknessCounts);
    if (weaknessTypes.length > 0 && pokemons.length > 0) {
        const potentialSuggestions = pokemons.filter(p => {
            const details = p; 
            if (!details.types) return false;

            return weaknessTypes.some(weakType => {
                const capitalizedWeakType = weakType.charAt(0).toUpperCase() + weakType.slice(1);
                const typeMultiplier = details.types.reduce((multiplier, pokemonType) => {
                    return multiplier * (typeChart[pokemonType]?.damageTaken[capitalizedWeakType] ?? 1);
                }, 1);
                return typeMultiplier < 1; // É resistente ao tipo que é uma fraqueza do time
            });
        });
        setSuggestedPokemonIds(new Set(potentialSuggestions.map(p => p.id).slice(0, 10)));
    } else {
        setSuggestedPokemonIds(new Set());
    }

}, [currentTeam, pokemons]); 

     const availablePokemons = useMemo(() => {
        const teamIds = new Set(currentTeam.map(p => p.id));
        const available = pokemons.filter(p => !teamIds.has(p.id));
        
        return available.sort((a, b) => {
            const aIsSuggested = suggestedPokemonIds.has(a.id);
            const bIsSuggested = suggestedPokemonIds.has(b.id);
            if (aIsSuggested && !bIsSuggested) return -1;
            if (!aIsSuggested && bIsSuggested) return 1;
            return a.id - b.id;
        });
    }, [pokemons, currentTeam, suggestedPokemonIds]);

     const recentTeams = useMemo(() =>
        savedTeams.sort((a,b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)).slice(0,3),
    [savedTeams]);
    
    const allFilteredTeams = useMemo(() => {
        let teams = [...savedTeams].sort((a,b) => (b.isFavorite - a.isFavorite) || new Date(b.updatedAt || a.createdAt) - new Date(a.updatedAt || a.createdAt));
        if (teamSearchTerm) {
            teams = teams.filter(team => team.name.toLowerCase().includes(teamSearchTerm.toLowerCase()));
        }
        return teams;
    }, [savedTeams, teamSearchTerm]);
    
     const fetchPokemonDetails = useCallback(async (pokemonId) => {
        if (pokemonDetailsCache[pokemonId]) {
            return pokemonDetailsCache[pokemonId];
        }
        if (!db) return null;

        try {
            const docRef = doc(db, 'artifacts/pokemonTeamBuilder/pokemons', String(pokemonId));
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const pokemonData = docSnap.data();
                setPokemonDetailsCache(prev => ({ ...prev, [pokemonId]: pokemonData }));
                return pokemonData;
            }
            return null;
        } catch (error) {
            console.error("Failed to fetch Pokémon details:", error);
            showToast(`Could not load details for Pokémon ID: ${pokemonId}`, "error");
            return null;
        }
    }, [db, pokemonDetailsCache, showToast]);

    const fetchAndSetSharedTeam = useCallback(async (teamId) => {
    if (!db || isLoading) return;

    setIsLoading(true);
    showToast("Loading shared team...", "info");

    try {
        const teamDocRef = doc(db, `artifacts/${appId}/public/data/teams`, teamId);
        const teamDoc = await getDoc(teamDocRef);

        if (teamDoc.exists()) {
            const teamData = teamDoc.data();
            
            // Fetch details for all Pokémon in parallel
            const detailsPromises = teamData.pokemons.map(p => fetchPokemonDetails(p.id));
            const teamPokemonDetails = await Promise.all(detailsPromises);

            // Combine fetched details with instance-specific customizations
            const customizedTeam = teamPokemonDetails.map((detail, i) => {
                // In case a pokemon detail fetch fails and returns something falsy
                if (!detail) return null; 

                return {
                    ...detail,
                    instanceId: teamData.pokemons[i].instanceId,
                    customization: teamData.pokemons[i].customization
                };
            });

            // Set state with the new team data, filtering out any failed fetches
            setCurrentTeam(customizedTeam.filter(Boolean));
            setTeamName(teamData.name);
            setEditingTeamId(null); // Reset editing state
            showToast(`Loaded team: ${teamData.name}`, "success");
        } else {
            showToast("Shared team not found.", "error");
        }
    } catch (error) {
        console.error("Failed to load shared team:", error);
        showToast("Failed to load shared team.", "error");
    } finally {
        // This will run after the try or catch block completes
        setIsLoading(false);
    }
    }, [
        db, 
        appId, // Added missing dependency
        isLoading, 
        showToast, 
        fetchPokemonDetails, 
    ]);

    useEffect(() => {
        if (!db || isLoading || !isAuthReady) return;
        const urlParams = new URLSearchParams(window.location.search);
        const teamId = urlParams.get('team');
        if (teamId) {
            fetchAndSetSharedTeam(teamId);
        }
    }, [db, isLoading, isAuthReady, fetchAndSetSharedTeam]);

    // Efeito para autenticação e inicialização do Firebase
    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const auth = getAuth(app);
            setDb(getFirestore(app));

            const unsubscribe = onAuthStateChanged(auth, async (user) => {
                if (user) {
                    setUserId(user.uid);
                    setIsAuthReady(true);
                } else {
                    try {
                        const token = typeof window.__initial_auth_token !== 'undefined' ? window.__initial_auth_token : null;
                        if (token) {
                            await signInWithCustomToken(auth, token);
                        } else {
                            await signInAnonymously(auth);
                        }
                        setUserId(auth.currentUser.uid);
                    } catch (error) {
                        showToast("Authentication failed. Please refresh.", "error");
                    } finally {
                        setIsAuthReady(true);
                    }
                }
            });
            return () => unsubscribe();
        } catch (e) {
            showToast("Failed to connect to services.", "error");
        }
    }, [showToast]);

    // Função para construir a query do Firestore dinamicamente
   const buildPokemonQuery = (isLoadMore = false) => {
        const genToUse = currentPage === 'pokedex' ? pokedexSelectedGeneration : selectedGeneration;
        const searchToUse = (currentPage === 'pokedex' ? debouncedPokedexSearchTerm : debouncedSearchTerm).toLowerCase();
        const typesToUse = Array.from(currentPage === 'pokedex' ? pokedexSelectedTypes : selectedTypes);

        let q = collection(db, 'artifacts/pokemonTeamBuilder/pokemons');
        const constraints = [];

        if (genToUse !== 'all') {
            constraints.push(where('generation', '==', genToUse));
        }
        if (typesToUse.length > 0) {
            constraints.push(where('types', 'array-contains-any', typesToUse));
        }
        
        if (searchToUse) {
            constraints.push(orderBy('name'));
            constraints.push(where('name', '>=', searchToUse));
            constraints.push(where('name', '<=', searchToUse + '\uf8ff'));
        } else {
            constraints.push(orderBy('id'));
        }

        if (isLoadMore && lastVisibleDoc) {
            constraints.push(startAfter(lastVisibleDoc));
        }

        constraints.push(limit(50));
        
        return query(q, ...constraints);
    };

    // Efeito para buscar pokémons quando os filtros mudam
    useEffect(() => {
        if (!db || !isAuthReady) return;

        const fetchInitial = async () => {
            setIsLoading(true);
            setHasMore(true);
            const q = buildPokemonQuery(false);
            try {
                const documentSnapshots = await getDocs(q);
                const firstBatch = documentSnapshots.docs.map(doc => doc.data());
                const lastVisible = documentSnapshots.docs[documentSnapshots.docs.length - 1];
                setPokemons(firstBatch);
                setLastVisibleDoc(lastVisible);
                if (documentSnapshots.docs.length < 50) setHasMore(false);
            } catch (error) {
                console.error("Error fetching pokemons:", error);
                showToast("Error loading Pokémon list. You may need to create a composite index in Firestore.", "error");
            } finally {
                setIsLoading(false);
            }
        };

        fetchInitial();
    }, [
        db, isAuthReady, currentPage, 
        debouncedSearchTerm, selectedGeneration, JSON.stringify(Array.from(selectedTypes)), 
        debouncedPokedexSearchTerm, pokedexSelectedGeneration, JSON.stringify(Array.from(pokedexSelectedTypes))
    ]);

    const fetchMorePokemons = useCallback(async () => {
        if (isFetchingMore || !hasMore || !db || !lastVisibleDoc) return;

        setIsFetchingMore(true);
        const q = buildPokemonQuery(true);
        try {
            const documentSnapshots = await getDocs(q);
            const newBatch = documentSnapshots.docs.map(doc => doc.data());
            const lastVisible = documentSnapshots.docs[documentSnapshots.docs.length - 1];
            
            setPokemons(prev => [...prev, ...newBatch]);
            setLastVisibleDoc(lastVisible);
            
            if (documentSnapshots.docs.length < 50) setHasMore(false);
        } catch (error) {
            console.error("Error fetching more pokemons:", error);
            showToast("Failed to load more Pokémon.", "error");
        } finally {
            setIsFetchingMore(false);
        }
    }, [isFetchingMore, hasMore, db, lastVisibleDoc, currentPage, selectedGeneration, debouncedSearchTerm, JSON.stringify(Array.from(selectedTypes)), pokedexSelectedGeneration, debouncedPokedexSearchTerm, JSON.stringify(Array.from(pokedexSelectedTypes))]);

    // Observer para o scroll infinito
    const observer = useRef();
    const lastPokemonElementRef = useCallback(node => {
        if (isFetchingMore || isLoading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                fetchMorePokemons();
            }
        });
        if (node) observer.current.observe(node);
    }, [isFetchingMore, isLoading, hasMore, fetchMorePokemons]);

     const handleAddPokemonToTeam = useCallback((pokemon) => {
        if (currentTeam.length >= 6) return showToast("Your team is full (6 Pokémon)!", 'warning');
        
        const newMember = {
            ...pokemon,
            instanceId: `${pokemon.id}-${Date.now()}`,
            customization: {
                item: '',
                nature: 'serious', 
                teraType: pokemon.types[0],
                isShiny: false,
                ability: pokemon.abilities[0].name,
                moves: pokemon.moves.slice(0, 4).map(m => m.name),
                evs: { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 },
                ivs: { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 }
            }
        };
        setCurrentTeam(prev => [...prev, newMember]);
    }, [currentTeam, showToast]);

    const handleRemoveFromTeam = useCallback((instanceId) => {
        setCurrentTeam(prev => prev.filter(p => p.instanceId !== instanceId));
    }, []);

    const handleClearTeam = useCallback(() => {
        setCurrentTeam([]);
        setTeamName('');
        setEditingTeamId(null);
    }, []);
    
        const handleSaveTeam = useCallback(async () => {
        if (!db || !userId) return showToast("Database connection not ready.", 'error');
        if (currentTeam.length === 0) return showToast("Your team is empty!", 'warning');
        if (!teamName.trim()) return showToast("Please name your team.", 'warning');
        
        if (savedTeams.some(team => team.name === teamName && team.id !== editingTeamId)) {
            return showToast("A team with this name already exists.", "warning");
        }

        const teamId = editingTeamId || doc(collection(db, `artifacts/${appId}/users/${userId}/teams`)).id;
        const existingTeam = savedTeams.find(t => t.id === editingTeamId);
        const teamData = { 
            name: teamName, 
            pokemons: currentTeam.map(p => ({
                id: p.id,
                name: p.name,
                sprite: p.sprite,
                instanceId: p.instanceId,
                customization: p.customization
            })), 
            isFavorite: existingTeam?.isFavorite || false, 
            createdAt: existingTeam?.createdAt || new Date().toISOString(), 
            updatedAt: new Date().toISOString() 
        };
        
        try {
            await setDoc(doc(db, `artifacts/${appId}/users/${userId}/teams`, teamId), teamData);
            showToast(`Team "${teamName}" saved!`, 'success');
            handleClearTeam();
        } catch (e) { showToast("Error saving team.", 'error'); }
    }, [db, userId, currentTeam, teamName, editingTeamId, savedTeams, showToast, handleClearTeam]);

    const handleShareTeam = useCallback(async () => {
        if (!db || !isAuthReady) return showToast("Database not ready.", "error");
        if (currentTeam.length === 0) return showToast("Cannot share an empty team!", "warning");
        
        const teamId = doc(collection(db, `artifacts/${appId}/public/data/teams`)).id;
        const teamData = { name: teamName || "Unnamed Team", pokemons: currentTeam.map(p => ({id: p.id, name: p.name, sprite: p.sprite || ''})) };

        try {
            await setDoc(doc(db, `artifacts/${appId}/public/data/teams`, teamId), teamData);
            const shareUrl = `${window.location.origin}${window.location.pathname}?team=${teamId}`;
            
            await navigator.clipboard.writeText(shareUrl);
            showToast("Share link copied to clipboard!", "success");

        } catch (error) {
            showToast("Could not generate share link.", "error");
        }
    }, [db, currentTeam, teamName, showToast, isAuthReady]);
    
    const handleExportToShowdown = useCallback(async () => {
        if (currentTeam.length === 0) return showToast("Your team is empty!", "warning");
        
        const formatCase = (str) => str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        
        const exportText = currentTeam.map(p => {
            const { customization, name } = p;
            const evsString = Object.entries(customization.evs)
              .filter(([, val]) => val > 0)
              .map(([key, val]) => {
                  const statMap = {'hp': 'HP', 'attack': 'Atk', 'defense': 'Def', 'special-attack': 'SpA', 'special-defense': 'SpD', 'speed': 'Spe' };
                  return `${val} ${statMap[key]}`;
              })
              .join(' / ');
              
            // A simple IV check, can be expanded
            const ivsString = customization.ivs.attack === 0 ? 'IVs: 0 Atk' : '';

            return [
                `${formatCase(name)} @ ${formatCase(customization.item || 'Nothing')}`,
                `Ability: ${formatCase(customization.ability)}`,
                `Level: 50`,
                customization.isShiny ? `Shiny: Yes` : null,
                `Tera Type: ${formatCase(customization.teraType)}`,
                evsString ? `EVs: ${evsString}` : null,
                `${formatCase(customization.nature)} Nature`,
                ivsString ? ivsString : null,
                ...customization.moves.map(move => `- ${formatCase(move)}`)
            ].filter(Boolean).join('\n');
            
        }).join('\n\n');
        
        try {
            await navigator.clipboard.writeText(exportText);
            showToast("Team copied for Pokémon Showdown!", "success");
        } catch (err) {
            showToast("Failed to copy team.", "error");
        }

    }, [currentTeam, showToast]);

        const handleEditTeam = useCallback(async (team) => {
        showToast(`Loading team: ${team.name}...`, 'info');
        
        const teamPokemonDetailsPromises = team.pokemons.map(p => fetchPokemonDetails(p.id));
        const teamPokemonDetails = await Promise.all(teamPokemonDetailsPromises);

        const customizedTeam = teamPokemonDetails.map((detail, i) => {
            if (!detail) return null; // Handle case where a Pokémon couldn't be fetched

            const savedPokemonData = team.pokemons[i];
            const defaultCustomization = {
                item: '', nature: 'serious', teraType: detail.types[0], isShiny: false,
                ability: detail.abilities[0].name,
                moves: detail.moves.slice(0, 4).map(m => m.name),
                evs: { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 },
                ivs: { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 }
            };
            
            return {
                ...detail,
                instanceId: savedPokemonData.instanceId,
                customization: { ...defaultCustomization, ...savedPokemonData.customization }
            };
        }).filter(Boolean); // Filtra qualquer resultado nulo

        setCurrentTeam(customizedTeam);
        setTeamName(team.name);
        setEditingTeamId(team.id);
        setCurrentPage('builder');
        setIsSidebarOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [fetchPokemonDetails, showToast]);

    const handleDeleteTeam = useCallback(async (teamId) => {
        if (!db || !userId) return;
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/teams`, teamId));
            if (editingTeamId === teamId) handleClearTeam();
            showToast("Team deleted.", 'info');
        } catch (e) { showToast("Error deleting team.", 'error'); }
    }, [db, userId, editingTeamId, handleClearTeam, showToast]);

    const handleToggleFavorite = useCallback(async (team) => {
        if (!db || !userId) return;
        try { await setDoc(doc(db, `artifacts/${appId}/users/${userId}/teams`, team.id), { ...team, isFavorite: !team.isFavorite }, { merge: true }); }
        catch (e) { showToast("Could not update favorite status.", 'error'); }
    }, [db, userId, showToast]);

    const handleTypeSelection = useCallback((type) => {
        const typeStateSetter = currentPage === 'pokedex' ? setPokedexSelectedTypes : setSelectedTypes;
        typeStateSetter(prev => {
            const newTypes = new Set(prev);
            newTypes.has(type) ? newTypes.delete(type) : newTypes.add(type);
            return newTypes;
        });
    }, [currentPage]);
    
    const showDetails = useCallback((pokemon) => {
        setModalPokemon(pokemon);
    }, []);

    const handleEditTeamMember = useCallback((pokemon) => {
        setEditingTeamMember(pokemon);
    }, []);

    const handleUpdateTeamMember = useCallback((instanceId, newCustomization) => {
        setCurrentTeam(prevTeam => prevTeam.map(member => 
            member.instanceId === instanceId ? { ...member, customization: newCustomization } : member
        ));
    }, []);
    
    const toggleTheme = useCallback(() => {
        setTheme(prevTheme => {
            const newTheme = prevTheme === 'dark' ? 'light' : 'dark';
            localStorage.setItem('theme', newTheme);
            return newTheme;
        });
    }, []);
    
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            setTheme(savedTheme); 
        }
    }, []);

    const renderPage = () => {
        const availablePokemons = useMemo(() => {
            if (!pokemons) return [];
            const teamIds = new Set(currentTeam.map(p => p.id));
            return pokemons.filter(p => !teamIds.has(p.id));
        }, [pokemons, currentTeam]);

        switch (currentPage) {
            case 'allTeams':
                return <AllTeamsView teams={savedTeams} onEdit={handleEditTeam} onDelete={handleDeleteTeam} onToggleFavorite={handleToggleFavorite} searchTerm={teamSearchTerm} setSearchTerm={setTeamSearchTerm} colors={colors} />;
            case 'pokedex':
                return <PokedexView 
                    pokemons={pokemons}
                    lastPokemonElementRef={lastPokemonElementRef}
                    isFetchingMore={isFetchingMore}
                    searchInput={pokedexSearchInput}
                    setSearchInput={setPokedexSearchInput}
                    selectedTypes={pokedexSelectedTypes}
                    handleTypeSelection={handleTypeSelection}
                    selectedGeneration={pokedexSelectedGeneration}
                    setSelectedGeneration={setPokedexSelectedGeneration}
                    generations={generations}
                    isInitialLoading={isLoading}
                    colors={colors}
                    showDetails={showDetails}
                />;
            default:
                return <TeamBuilderView
                    currentTeam={currentTeam}
                    teamName={teamName}
                    setTeamName={setTeamName}
                    handleRemoveFromTeam={handleRemoveFromTeam}
                    handleSaveTeam={handleSaveTeam}
                    editingTeamId={editingTeamId}
                    handleClearTeam={handleClearTeam}
                    recentTeams={recentTeams}
                    setCurrentPage={setCurrentPage}
                    handleToggleFavorite={handleToggleFavorite}
                    handleEditTeam={handleEditTeam}
                    handleDeleteTeam={handleDeleteTeam}
                    handleShareTeam={handleShareTeam}
                    handleExportToShowdown={handleExportToShowdown}
                    teamAnalysis={teamAnalysis}
                    searchInput={searchInput}
                    setSearchInput={setSearchInput}
                    selectedGeneration={selectedGeneration}
                    setSelectedGeneration={setSelectedGeneration}
                    generations={generations}
                    isInitialLoading={isLoading}
                    availablePokemons={availablePokemons}
                    handleAddPokemonToTeam={handleAddPokemonToTeam}
                    lastPokemonElementRef={lastPokemonElementRef}
                    isFetchingMore={isFetchingMore}
                    selectedTypes={selectedTypes}
                    handleTypeSelection={handleTypeSelection}
                    showDetails={showDetails}
                    suggestedPokemonIds={suggestedPokemonIds}
                    colors={colors}
                    onEditTeamPokemon={handleEditTeamMember}
                />;
        }
    };
    
    return (
      <div className="min-h-screen font-sans" style={{ backgroundColor: colors.background, color: colors.text }}>
        {modalPokemon && <PokemonDetailModal pokemon={modalPokemon} onClose={() => setModalPokemon(null)} onAdd={currentPage === 'builder' ? handleAddPokemonToTeam : null} currentTeam={currentTeam} colors={colors} showPokemonDetails={showDetails} pokemonDetailsCache={pokemonDetailsCache} db={db} />}
        {editingTeamMember && <TeamPokemonEditorModal pokemon={editingTeamMember} onClose={() => setEditingTeamMember(null)} onSave={handleUpdateTeamMember} colors={colors} items={items} natures={natures} moveDetailsCache={moveDetailsCache}/>}
        
        <div className="fixed top-5 right-5 z-50 space-y-2">{toasts.slice(0, maxToasts).map(toast => ( <div key={toast.id} className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg text-white animate-fade-in-out ${toast.type === 'success' ? 'bg-green-600' : toast.type === 'warning' ? 'bg-yellow-600' : 'bg-red-600'}`}>{toast.type === 'success' && <SuccessToastIcon />}{toast.type === 'error' && <ErrorToastIcon />}{toast.type === 'warning' && <WarningToastIcon />}{toast.message}</div> ))}</div>
        <div className="flex min-h-screen">
            <aside className={`fixed lg:relative lg:translate-x-0 inset-y-0 left-0 z-40 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'lg:w-20' : 'w-64'} ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} style={{backgroundColor: colors.card}}>
                <div className="flex flex-col h-full">
                  <div className={`flex items-center h-16 p-4 ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
                    <h2 className={`text-xl font-bold transition-opacity duration-200 whitespace-nowrap ${isSidebarCollapsed ? 'lg:opacity-0 lg:hidden' : 'opacity-100'}`} style={{fontFamily: "'Press Start 2P'", color: colors.primary}}>Menu</h2>
                    <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-1 rounded-lg hidden lg:block transition-colors hover:opacity-80" style={{color: colors.textMuted}}>{isSidebarCollapsed ? <CollapseRightIcon /> : <CollapseLeftIcon />}</button>
                  </div>
                  <nav className="px-4 flex-grow">
                    <ul>
                      <li>
                        <button onClick={() => { setCurrentPage('builder'); setIsSidebarOpen(false); }} className={`w-full p-3 rounded-lg font-bold flex items-center transition-colors hover:bg-purple-500/60 ${currentPage === 'builder' ? 'bg-primary' : ''} ${isSidebarCollapsed ? 'justify-center' : ''}`} style={{color: currentPage === 'builder' ? 'white' : colors.text}}>
                          <SwordsIcon />
                          <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-0 lg:ml-0 opacity-0' : 'w-auto ml-3 opacity-100'}`}>Team Builder</span>
                        </button>
                      </li>
                       <li className="mt-2">
                        <button onClick={() => { setCurrentPage('pokedex'); setIsSidebarOpen(false); }} className={`w-full p-3 rounded-lg font-bold flex items-center transition-colors hover:bg-purple-500/60 ${currentPage === 'pokedex' ? 'bg-primary' : ''} ${isSidebarCollapsed ? 'justify-center' : ''}`} style={{color: currentPage === 'pokedex' ? 'white' : colors.text}}>
                            <PokeballIcon />
                          <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-0 lg:ml-0 opacity-0' : 'w-auto ml-3 opacity-100'}`}>Pokédex</span>
                        </button>
                      </li>
                      <li className="mt-2">
                        <button onClick={() => { setCurrentPage('allTeams'); setIsSidebarOpen(false); }} className={`w-full p-3 mt-2 rounded-lg font-bold flex items-center transition-colors hover:bg-purple-500/60 ${currentPage === 'allTeams' ? 'bg-primary' : ''} ${isSidebarCollapsed ? 'justify-center' : ''}`} style={{color: currentPage === 'allTeams' ? 'white' : colors.text}}>
                          <SavedTeamsIcon/>
                          <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-0 lg:ml-0 opacity-0' : 'w-auto ml-3 opacity-100'}`}>Saved Teams</span>
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
            </aside>
            <div className="flex-1 min-w-0">
                <header className="relative flex items-center justify-between pt-4 px-4 h-24">
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="lg:hidden p-2 rounded-md"
                    style={{ backgroundColor: colors.cardLight, color: colors.text }}
                >
                    {isSidebarOpen ? <CloseIcon /> : <MenuIcon />}
                </button>

                <div className="flex-1 text-center px-2 marginLeft">
                    <h1
                    className="text-xs sm:text-base lg:text-3xl font-bold tracking-wider truncate"
                    style={{ fontFamily: "'Press Start 2P'", color: colors.primary }}
                    >
                    Pokémon Team Builder
                    </h1>
                    <p
                    className="text-xs sm:text-sm md:text-base mt-1 truncate"
                    style={{ fontFamily: "'Press Start 2P'", color: colors.primary }}
                    >
                    By: Enzo Esmeraldo
                    </p>
                </div>

                <div className="flex items-center gap-2 lg:mr-4 sm:mr-0">
                    <button onClick={toggleTheme} className="p-2 rounded-md" style={{ backgroundColor: colors.cardLight, color: colors.text }}>
                        {theme === 'dark' ? <SunIcon color={colors.text} /> : <MoonIcon color={colors.text} />}
                    </button>
                </div>

                </header>
                <div className="p-4 sm:p-6 lg:p-8">{renderPage()}</div>
                <footer className="text-center mt-12 py-6 border-t" style={{borderColor: colors.cardLight}}>
                    <p className="text-sm" style={{color: colors.textMuted}}>Developed and built by <a href="https://github.com/ensinho" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80" style={{color: colors.text}}>
                    Enzo Esmeraldo</a>
                    </p>

                <div className="flex justify-center gap-4 mt-4">
                        <a href="https://github.com/ensinho" target="_blank" rel="noopener noreferrer" className="hover:opacity-80" style={{color: colors.textMuted}}><GithubIcon color={colors.textMuted} /></a>
                        <a href="https://www.linkedin.com/in/enzoesmeraldo/" target="_blank" rel="noopener noreferrer" className="hover:opacity-80" style={{color: colors.textMuted}}><LinkedinIcon color={colors.textMuted} /></a>
                    </div>
                    <p className="text-xs mt-2" style={{color: colors.textMuted}}>Using the <a href="https://pokeapi.co/" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80" style={{color: colors.text}}>PokéAPI</a>. Pokémon and their names are trademarks of Nintendo.</p>
                </footer>
            </div>
        </div>
        <style>{` @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap'); .custom-scrollbar::-webkit-scrollbar { width: 12px; } .custom-scrollbar::-webkit-scrollbar-track { background: var(--scrollbar-track-color); } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: var(--scrollbar-thumb-color); border-radius: 20px; border: 3px solid var(--scrollbar-thumb-border-color); } @keyframes fade-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } } .animate-fade-in { animation: fade-in 0.2s ease-out forwards; } .image-pixelated { image-rendering: pixelated; } .bg-primary { background-color: ${colors.primary}; } input[type="checkbox"]:checked + div + div { transform: translateX(100%); background-color: ${colors.primary}; }`}</style>
      </div>
    );
}
