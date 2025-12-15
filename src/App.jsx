import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, setDoc, onSnapshot, deleteDoc, query, orderBy, limit, startAfter, where, getDocs } from 'firebase/firestore';

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
        background: '#E8EAF0',
        card: '#FFFFFF',
        cardLight: '#F3F4F6',
        text: '#111827',
        textMuted: '#4B5563'
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

const GithubIcon = ({ color }) => (<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" style={{ color: color }}><path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.168 6.839 9.492.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.031-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.378.203 2.398.1 2.651.64.7 1.03 1.595 1.03 2.688 0 3.848-2.338 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.001 10.001 0 0022 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" /></svg>);
const LinkedinIcon = ({ color }) => (<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" style={{ color: color }}><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>);
const StarsIcon = ({ className = "w-6 h-6", color }) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" ><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M17.8 19.817l-2.172 1.138a.392 .392 0 0 1 -.568 -.41l.415 -2.411l-1.757 -1.707a.389 .389 0 0 1 .217 -.665l2.428 -.352l1.086 -2.193a.392 .392 0 0 1 .702 0l1.086 2.193l2.428 .352a.39 .39 0 0 1 .217 .665l-1.757 1.707l.414 2.41a.39 .39 0 0 1 -.567 .411l-2.172 -1.138z" /><path d="M6.2 19.817l-2.172 1.138a.392 .392 0 0 1 -.568 -.41l.415 -2.411l-1.757 -1.707a.389 .389 0 0 1 .217 -.665l2.428 -.352l1.086 -2.193a.392 .392 0 0 1 .702 0l1.086 2.193l2.428 .352a.39 .39 0 0 1 .217 .665l-1.757 1.707l.414 2.41a.39 .39 0 0 1 -.567 .411l-2.172 -1.138z" /><path d="M12 9.817l-2.172 1.138a.392 .392 0 0 1 -.568 -.41l.415 -2.411l-1.757 -1.707a.389 .389 0 0 1 .217 -.665l2.428 -.352l1.086 -2.193a.392 .392 0 0 1 .702 0l1.086 2.193l2.428 .352a.39 .39 0 0 1 .217 .665l-1.757 1.707l.414 2.41a.39 .39 0 0 1 -.567 .411l-2.172 -1.138z" /></svg> );
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
const HeartIcon = ({ className = "w-6 h-6 shrink-0" }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>);
const SuccessToastIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 7.2a2.2 2.2 0 0 1 2.2 -2.2h1a2.2 2.2 0 0 0 1.55 -.64l.7 -.7a2.2 2.2 0 0 1 3.12 0l.7 .7c.412 .41 .97 .64 1.55 .64h1a2.2 2.2 0 0 1 2.2 2.2v1c0 .58 .23 1.138 .64 1.55l.7 .7a2.2 2.2 0 0 1 0 3.12l-.7 .7a2.2 2.2 0 0 0 -.64 1.55v1a2.2 2.2 0 0 1 -2.2 2.2h-1a2.2 2.2 0 0 0 -1.55 .64l-.7 .7a2.2 2.2 0 0 1 -3.12 0l-.7 -.7a2.2 2.2 0 0 0 -1.55 -.64h-1a2.2 2.2 0 0 1 -2.2 -2.2v-1a2.2 2.2 0 0 0 -.64 -1.55l-.7 -.7a2.2 2.2 0 0 1 0 -3.12l.7 -.7a2.2 2.2 0 0 0 .64 -1.55v-1" /><path d="M9 12l2 2l4 -4" /></svg>);
const ErrorToastIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" ><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572" /><path d="M12 6l-2 4l4 3l-2 4v3" /></svg>);
const WarningToastIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>);
const SunIcon = ({ color }) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-sun" style={{ color: color }}><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" /><path d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7" /></svg>);
const MoonIcon = ({ color }) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-moon" style={{ color: color }}><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z" /></svg>);
const SwordsIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-swords"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M21 3v5l-11 9l-4 4l-3 -3l4 -4l9 -11z" /><path d="M5 13l6 6" /><path d="M14.32 17.32l3.68 3.68l3 -3l-3.365 -3.365" /><path d="M10 5.5l-2 -2.5h-5v5l3 2.5" /></svg>);
const EditIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>);
const SparklesIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-sparkles"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6z" /></svg>);
const ShowdownIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-upload"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 9l5 -5l5 5" /><path d="M12 4l0 12" /></svg>);
const DiceIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-dice shrink-0"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><rect x="4" y="4" width="16" height="16" rx="2" /><circle cx="8.5" cy="8.5" r=".5" fill="currentColor" /><circle cx="15.5" cy="8.5" r=".5" fill="currentColor" /><circle cx="15.5" cy="15.5" r=".5" fill="currentColor" /><circle cx="8.5" cy="15.5" r=".5" fill="currentColor" /></svg>);
const FlowerIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="icon icon-tabler icons-tabler-filled icon-tabler-laurel-wreath"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M16.956 2.057c.355 .124 .829 .375 1.303 .796a3.77 3.77 0 0 1 1.246 2.204c.173 .989 -.047 1.894 -.519 2.683l-.123 .194q -.097 .147 -.196 .272q .066 .234 .117 .471q .26 -.178 .545 -.307c.851 -.389 1.727 -.442 2.527 -.306q .226 .04 .346 .076a1 1 0 0 1 .689 .712l.029 .13q .015 .08 .03 .18a4.45 4.45 0 0 1 -.324 2.496a3.94 3.94 0 0 1 -1.71 1.85l-.242 .12a4.23 4.23 0 0 1 -2.234 .349a9 9 0 0 1 -.443 1.023c.37 .016 .748 .093 1.128 .24c.732 .28 1.299 .758 1.711 1.367a3.95 3.95 0 0 1 .654 1.613a1 1 0 0 1 -.356 .917a3.8 3.8 0 0 1 -.716 .443c-.933 .455 -1.978 .588 -3.043 .179l-.032 -.015l-.205 -.086a3.6 3.6 0 0 1 -1.33 -1.069l-.143 -.197a4 4 0 0 1 -.26 -.433a6 6 0 0 1 -.927 .511q .18 .262 .337 .56a7.4 7.4 0 0 1 .66 1.747a1 1 0 0 1 -1.95 .444l-.028 -.11a6 6 0 0 0 -.449 -1.143c-.342 -.645 -.71 -.968 -1.048 -.968s-.706 .323 -1.048 .969a5.6 5.6 0 0 0 -.367 .874l-.082 .269l-.028 .11a1 1 0 0 1 -1.95 -.444a7.3 7.3 0 0 1 .66 -1.747q .158 -.298 .337 -.561a6.4 6.4 0 0 1 -.93 -.508a4 4 0 0 1 -.256 .43c-.366 .541 -.855 .98 -1.473 1.267l-.238 .1c-.994 .382 -1.97 .292 -2.855 -.091l-.188 -.087a3.8 3.8 0 0 1 -.716 -.443a1 1 0 0 1 -.356 -.917a3.95 3.95 0 0 1 .654 -1.613a3.6 3.6 0 0 1 1.71 -1.368c.38 -.146 .758 -.223 1.13 -.24a9 9 0 0 1 -.445 -1.023a4.23 4.23 0 0 1 -2.233 -.348a4 4 0 0 1 -.916 -.587l-.207 -.191a4 4 0 0 1 -.724 -.977l-.105 -.216a4.45 4.45 0 0 1 -.265 -2.806a1 1 0 0 1 .69 -.712q .119 -.036 .345 -.076c.801 -.135 1.678 -.082 2.53 .308q .283 .129 .545 .304q .048 -.235 .112 -.47a5 5 0 0 1 -.194 -.272c-.556 -.832 -.83 -1.806 -.642 -2.877l.05 -.242a3.75 3.75 0 0 1 1.027 -1.803l.169 -.159a4 4 0 0 1 1.303 -.796a1 1 0 0 1 .975 .178c.2 .168 .462 .446 .719 .83c.556 .833 .83 1.807 .642 2.878a3.77 3.77 0 0 1 -1.246 2.204c-.303 .27 -.607 .47 -.879 .61a7.5 7.5 0 0 0 -.255 1.971c0 3.502 2.285 6.272 5 6.272s5 -2.77 5 -6.276a7.6 7.6 0 0 0 -.253 -1.967a4.3 4.3 0 0 1 -.881 -.61a3.77 3.77 0 0 1 -1.246 -2.204c-.188 -1.07 .086 -2.045 .642 -2.877c.257 -.385 .52 -.663 .72 -.831a1 1 0 0 1 .974 -.178" /></svg>);

// Patch Notes Version - increment this to show patch notes again
const PATCH_NOTES_VERSION = '1.3.0';

// Patch Notes Modal Component
const PatchNotesModal = ({ onClose, colors }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div 
                className="rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto custom-scrollbar p-6 relative animate-fade-in"
                style={{ backgroundColor: colors.card, '--scrollbar-track-color': colors.card, '--scrollbar-thumb-color': colors.primary, '--scrollbar-thumb-border-color': colors.card }}
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10">
                    <CloseIcon />
                </button>
                
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="flex items-center justify-center gap-4 mb-2">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full" style={{ backgroundColor: colors.primary + '20' }}>
                            <FlowerIcon />
                        </div>
                        <h2 className="text-2xl font-bold" style={{ color: colors.text, fontFamily: "'Press Start 2P'" }}>
                            What's New!
                        </h2>
                    </div>
                    <p className="text-sm mt-2" style={{ color: colors.textMuted }}>
                        Version {PATCH_NOTES_VERSION} • December 2025
                    </p>
                </div>

                {/* Patch Notes Content */}
                <div className="space-y-5">
                    {/* New Home Page */}
                    <div className="p-4 rounded-xl" style={{ backgroundColor: colors.cardLight }}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">👌</span>
                            <h3 className="font-bold" style={{ color: colors.primary }}>Redesigned Home Page</h3>
                        </div>
                        <p className="text-sm mb-2" style={{ color: colors.text }}>
                            Experience a completely revamped home page with:
                        </p>
                        <ul className="text-sm space-y-1 ml-4" style={{ color: colors.text }}>
                            <li>• Personalized greetings based on time of day</li>
                            <li>• Customizable partner Pokémon</li>
                            <li>• Daily Pokémon showcase</li>
                            <li>• Trainer stats and achievements</li>
                            <li>• Quick access to your last team</li>
                        </ul>
                    </div>

                    {/* Favorites Feature */}
                    <div className="p-4 rounded-xl" style={{ backgroundColor: colors.cardLight }}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">⭐</span>
                            <h3 className="font-bold" style={{ color: colors.primary }}>Favorites System</h3>
                        </div>
                        <p className="text-sm" style={{ color: colors.text }}>
                            Mark your favorite Pokémon with a star! Access them quickly from the new Favorites page and see them featured on your home page.
                        </p>
                    </div>


                    {/* Random Generator */}
                    <div className="p-4 rounded-xl" style={{ backgroundColor: colors.cardLight }}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">🎲</span>
                            <h3 className="font-bold" style={{ color: colors.primary }}>Random Pokémon Generator</h3>
                        </div>
                        <p className="text-sm" style={{ color: colors.text }}>
                            Generate random Pokémon with advanced filters by generation, type, legendary status, and more!
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-6 text-center">
                    <button 
                        onClick={onClose}
                        className="px-8 py-3 rounded-lg font-bold text-white transition-colors hover:opacity-90"
                        style={{ backgroundColor: colors.primary }}
                    >
                        Got it, let's go!
                    </button>
                    <p className="text-xs mt-3" style={{ color: colors.textMuted }}>
                        Made with ❤️ by Enzo Esmeraldo
                    </p>
                </div>
            </div>
        </div>
    );
};

// Greeting Pokemon Selector Modal
const GreetingPokemonSelectorModal = ({ onClose, onSelect, allPokemons, currentPokemonId, colors, db }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState(null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [fullPokemonList, setFullPokemonList] = useState(allPokemons || []);
    const [lastDoc, setLastDoc] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    
    // Load more Pokemon in batches
    const loadMorePokemons = useCallback(async () => {
        if (!db || isLoadingMore || !hasMore) return;
        
        setIsLoadingMore(true);
        try {
            const constraints = [
                orderBy('id'),
                limit(200) // Load 200 at a time
            ];
            
            if (lastDoc) {
                constraints.push(startAfter(lastDoc));
            }
            
            const q = query(
                collection(db, 'artifacts/pokemonTeamBuilder/pokemons'),
                ...constraints
            );
            
            const snapshot = await getDocs(q);
            if (snapshot.empty || snapshot.docs.length < 200) {
                setHasMore(false);
            }
            
            const newPokemons = snapshot.docs.map(doc => doc.data());
            const lastVisible = snapshot.docs[snapshot.docs.length - 1];
            
            setFullPokemonList(prev => {
                const combined = [...prev, ...newPokemons];
                const unique = combined.filter((pokemon, index, self) => 
                    index === self.findIndex(p => p.id === pokemon.id)
                );
                return unique;
            });
            setLastDoc(lastVisible);
        } catch (error) {
            console.error('Error loading more Pokemon:', error);
            setHasMore(false);
        } finally {
            setIsLoadingMore(false);
        }
    }, [db, lastDoc, isLoadingMore, hasMore]);
    
    useEffect(() => {
        if (fullPokemonList.length < 100 && hasMore) {
            loadMorePokemons();
        }
    }, []);
    
    const filteredPokemons = useMemo(() => {
        return fullPokemonList.filter(pokemon => {
            const matchesSearch = pokemon.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = !selectedType || pokemon.types?.includes(selectedType);
            return matchesSearch && matchesType;
        });
    }, [fullPokemonList, searchTerm, selectedType]);
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div 
                className="rounded-2xl shadow-xl w-full max-w-7xl max-h-[85vh] overflow-y-auto custom-scrollbar p-6 relative animate-fade-in"
                style={{ backgroundColor: colors.card, '--scrollbar-track-color': colors.card, '--scrollbar-thumb-color': colors.primary, '--scrollbar-thumb-border-color': colors.card }}
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10">
                    <CloseIcon />
                </button>
                
                <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-2" style={{ color: colors.text }}>
                        Choose Your Partner Pokémon
                    </h2>
                    <p className="text-sm" style={{ color: colors.textMuted }}>
                        Select a Pokémon to display on your greeting card
                    </p>
                </div>
                
                {/* Search and filter */}
                <div className="mb-4 space-y-3">
                    <input
                        type="text"
                        placeholder="Search Pokémon..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border-2 transition-all focus:outline-none"
                        style={{ 
                            backgroundColor: colors.cardLight, 
                            color: colors.text,
                            borderColor: colors.cardLight,
                        }}
                    />
                    
                    {/* Type filter */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setSelectedType(null)}
                            className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                            style={{ 
                                backgroundColor: !selectedType ? colors.primary : colors.cardLight,
                                color: !selectedType ? 'white' : colors.text
                            }}
                        >
                            All Types
                        </button>
                        {Object.keys(typeColors).slice(0, 8).map(type => (
                            <button
                                key={type}
                                onClick={() => setSelectedType(type)}
                                className="px-3 py-1 rounded-full text-xs font-semibold text-white transition-all"
                                style={{ 
                                    backgroundColor: selectedType === type ? typeColors[type] : colors.cardLight,
                                    opacity: selectedType === type ? 1 : 0.7
                                }}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>
                
                {/* Clear selection option */}
                {currentPokemonId && (
                    <button
                        onClick={() => onSelect(null)}
                        className="w-full mb-4 p-3 rounded-lg border-2 border-dashed transition-all hover:scale-[1.02]"
                        style={{ borderColor: colors.textMuted, color: colors.textMuted }}
                    >
                        <span className="text-2xl mb-1 block">✨</span>
                        Remove custom Pokémon (use default)
                    </button>
                )}
                
                {/* Pokemon grid */}
                <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-3">
                    {filteredPokemons.map(pokemon => (
                        <button
                            key={pokemon.id}
                            onClick={() => onSelect(pokemon.id)}
                            className="p-3 rounded-xl text-center transition-all hover:scale-105 hover:shadow-lg relative"
                            style={{ 
                                backgroundColor: currentPokemonId === pokemon.id ? colors.primary + '20' : colors.cardLight,
                                border: currentPokemonId === pokemon.id ? `2px solid ${colors.primary}` : 'none'
                            }}
                        >
                            {currentPokemonId === pokemon.id && (
                                <div className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.primary }}>
                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            )}
                            <img 
                                src={pokemon.sprite || POKEBALL_PLACEHOLDER_URL}
                                alt={pokemon.name}
                                className="w-16 h-16 mx-auto"
                                onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                            />
                            <p className="text-xs capitalize truncate mt-1" style={{ color: colors.text }}>
                                {pokemon.name}
                            </p>
                        </button>
                    ))}
                </div>
                
                {/* Load More Button */}
                {hasMore && !searchTerm && !selectedType && (
                    <div className="mt-4 text-center">
                        <button
                            onClick={loadMorePokemons}
                            disabled={isLoadingMore}
                            className="px-6 py-3 rounded-lg font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ backgroundColor: colors.primary, color: 'white' }}
                        >
                            {isLoadingMore ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Loading more...
                                </div>
                            ) : (
                                `Load More Pokémon (${fullPokemonList.length}/1025+)`
                            )}
                        </button>
                    </div>
                )}
                
                {filteredPokemons.length === 0 && (
                    <div className="text-center py-12">
                        <p style={{ color: colors.textMuted }}>
                            {searchTerm || selectedType ? 'No Pokémon found matching your filters' : 'No Pokémon available'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

const TypeBadge = ({ type, colors }) => ( <span className="text-xs text-white font-semibold mr-1 mb-1 px-2.5 py-1 rounded-full shadow-sm" style={{ backgroundColor: typeColors[type] || '#777' }}> {type.toUpperCase()} </span> );

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};
const appId = import.meta.env.VITE_APP_ID || 'pokemonTeamBuilder';
const POKEAPI_BASE_URL = import.meta.env.VITE_POKEAPI_BASE_URL || 'https://pokeapi.co/api/v2';

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

// Skeleton Loading Component
const SkeletonCard = ({ colors }) => (
    <div className="rounded-lg p-3 text-center h-[172px] overflow-hidden relative" style={{backgroundColor: colors.cardLight}}>
        {/* Shimmer effect overlay */}
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        <div className="mx-auto h-24 w-24 rounded-md animate-pulse" style={{backgroundColor: colors.card}}></div>
        <div className="mt-2 h-5 w-20 mx-auto rounded animate-pulse" style={{backgroundColor: colors.card}}></div>
        <div className="flex justify-center items-center mt-2 gap-2">
            <div className="h-5 w-5 rounded-full animate-pulse" style={{backgroundColor: colors.card}}></div>
            <div className="h-5 w-5 rounded-full animate-pulse" style={{backgroundColor: colors.card}}></div>
        </div>
    </div>
);

// Confirmation Dialog Component
const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Delete", colors }) => {
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={onClose}>
            <div 
                className="rounded-2xl shadow-2xl w-full max-w-md p-6 relative transform transition-all animate-scale-in"
                style={{backgroundColor: colors.card, border: `1px solid ${colors.cardLight}`}}
                onClick={e => e.stopPropagation()}
            >
                <div className="text-center">
                    <div className="mx-auto w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                        <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold mb-2" style={{color: colors.text}}>{title}</h3>
                    <p className="text-sm mb-6" style={{color: colors.textMuted}}>{message}</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                        style={{backgroundColor: colors.cardLight, color: colors.text}}
                    >
                        No! Keep them
                    </button>
                    <button 
                        onClick={() => { onConfirm(); onClose(); }}
                        className="flex-1 py-3 px-4 rounded-xl font-semibold bg-red-600 hover:bg-red-700 text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

const PokemonCard = React.memo(({ onCardClick, details, lastRef, isSuggested, colors, isFavorite, onToggleFavorite }) => {

    const handleCardClick = (e) => {
        e.stopPropagation();
        onCardClick(details);
    };

    const handleFavoriteClick = (e) => {
        e.stopPropagation();
        if (onToggleFavorite) {
            onToggleFavorite(details.id);
        }
    };
    
    if (!details) {
        return <SkeletonCard colors={colors} />;
    }
    
    return (
       <div
        ref={lastRef}
        onClick={handleCardClick}
        className={`rounded-lg p-3 text-center group relative cursor-pointer transition-all duration-200 hover:scale-[1.03] hover:shadow-xl active:scale-[0.98] ${isSuggested ? 'ring-2 ring-green-400 shadow-lg' : ''}`}
        style={{ backgroundColor: colors.cardLight }}
        >
        {isSuggested && <div className="absolute -top-2 -right-2 text-xs bg-green-500 text-white font-bold py-1 px-2 rounded-full z-10 animate-bounce">Suggested</div>}
        
        {/* Favorite Star - Always visible when favorite, otherwise on hover */}
        {onToggleFavorite && (
            <button 
                onClick={handleFavoriteClick}
                className={`absolute top-1 left-1 z-10 p-1 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                style={{ backgroundColor: isFavorite ? 'rgba(251, 191, 36, 0.2)' : 'rgba(0,0,0,0.3)' }}
                title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
                <StarIcon className="w-4 h-4" isFavorite={isFavorite} color={colors.textMuted} />
            </button>
        )}
        
        <img
            src={details.sprite || POKEBALL_PLACEHOLDER_URL}
            onError={(e) => {
            e.currentTarget.src = POKEBALL_PLACEHOLDER_URL;
            }}
            alt={details.name}
            className="mx-auto w-full h-auto max-w-[120px] group-hover:scale-110 transition-transform duration-300"
        />
        <p className="mt-2 text-sm font-semibold capitalize" style={{color: colors.text}}>{details.name}</p>
        <div className="flex justify-center items-center mt-1 gap-1">
            {details.types.map((type) => (
            <img key={type} src={typeIcons[type]} alt={type} className="w-5 h-5 transition-transform group-hover:scale-110" />
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

const PokemonDetailModal = ({ pokemon, onClose, onAdd, currentTeam, colors, showPokemonDetails, db, isFavorite, onToggleFavorite }) => {
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm h-[100vh] flex items-center justify-center z-50 p-6" onClick={onClose}>
            <div className="rounded-2xl shadow-2xl w-full max-w-lg p-4 relative animate-scale-in" style={{backgroundColor: colors.card, border: `1px solid ${colors.cardLight}`}} onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white hover:rotate-90 transition-all duration-200"><CloseIcon /></button>
                <div className="text-center">
                    <div className="relative inline-block">
                        <img src={spriteToShow || POKEBALL_PLACEHOLDER_URL} alt={pokemon.name} className="mx-auto h-30 w-32 image-pixelated hover:scale-110 transition-transform duration-300"/>
                        <button 
                             onClick={() => setShowShiny(!showShiny)} 
                             className={`absolute bottom-0 right-0 p-1 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${showShiny ? 'bg-yellow-500' : 'bg-gray-700'}`} 
                             style={{color: 'white'}} 
                             title="Toggle Shiny">
                            <SparklesIcon />
                        </button>
                        {onToggleFavorite && (
                            <button 
                                onClick={() => onToggleFavorite(pokemon.id)} 
                                className={`absolute bottom-0 left-0 p-1 rounded-full transition-all duration-200 hover:scale-110 active:scale-95`} 
                                style={{backgroundColor: isFavorite ? 'rgba(251, 191, 36, 0.3)' : 'rgba(107, 114, 128, 0.7)', color: 'white'}} 
                                title={isFavorite ? "Remove from favorites" : "Add to favorites"}>
                                <StarIcon className="w-5 h-5" isFavorite={isFavorite} color="white" />
                            </button>
                        )}
                    </div>
                    <h2 className="text-3xl font-bold capitalize mt-2" style={{color: colors.text}}>{pokemon.name} <span style={{color: colors.textMuted}}>#{pokemon.id}</span></h2>
                    <div className="flex justify-center gap-2 mt-2">
                        {pokemon.types.map(type => <TypeBadge key={type} type={type} colors={colors} />)}
                    </div>
                </div>
                <div className="mt-4">
                    <h3 className="text-xl font-bold mb-3 text-center" style={{color: colors.text}}>Base Stats</h3>
                    <div className="space-y-2">
                        {pokemon.stats?.map(stat => <StatBar key={stat.name} stat={stat.name} value={stat.base_stat} colors={colors} />)}
                    </div>
                </div>
                 {evolutionDetails.length > 1 && (
                    <div className="mt-6">
                        <h3 className="text-xl font-bold  text-center" style={{ color: colors.text }}>Evolution Line</h3>
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
                <div className="mt-4 flex justify-center" >
                    {!isAlreadyOnTeam && onAdd && (
                        <button onClick={() => { onAdd(pokemon); onClose(); }} className="bg-primary hover:bg-purple-500/30 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95">
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
                        
                        {/* Base Stats Section */}
                        <div className="w-full mt-4">
                            <h3 className="text-lg font-bold mb-2" style={{color: colors.text}}>Base Stats</h3>
                            <div className="space-y-1.5">
                                {pokemon.stats?.map(stat => <StatBar key={stat.name} stat={stat.name} value={stat.base_stat} colors={colors} />)}
                            </div>
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
    recentTeams, onNavigateToTeams, handleToggleFavorite, handleEditTeam, handleShareTeam, requestDeleteTeam, handleExportToShowdown,
    teamAnalysis,
    searchInput, setSearchInput, selectedGeneration, setSelectedGeneration, generations,
    isInitialLoading,
    availablePokemons, handleAddPokemonToTeam, lastPokemonElementRef, isFetchingMore,
    selectedTypes, handleTypeSelection, showDetails,
    suggestedPokemonIds, colors, onEditTeamPokemon,
    favoritePokemons, onToggleFavoritePokemon,
    showOnlyFavorites, setShowOnlyFavorites
}) => {
    // Filter available pokemons based on favorites toggle
    const displayedPokemons = showOnlyFavorites 
        ? availablePokemons.filter(p => favoritePokemons.has(p.id))
        : availablePokemons;

    return (
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
                    <button onClick={handleSaveTeam} className="w-full flex items-center justify-center font-bold py-2 px-4 rounded-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]" style={{backgroundColor: colors.primary, color: colors.background}}> <SaveIcon /> {editingTeamId ? 'Update' : 'Save'} </button>
                    <button onClick={handleExportToShowdown} className="p-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95" style={{backgroundColor: colors.cardLight, color: colors.text}} title="Export to Showdown"><ShowdownIcon /></button>
                    <button onClick={handleShareTeam} className="p-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95" style={{backgroundColor: colors.cardLight, color: colors.text}} title="Share Team"><ShareIcon /></button>
                    <button onClick={handleClearTeam} className="p-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95" style={{backgroundColor: colors.cardLight, color: colors.text}} title="Clear Team"><ClearIcon /></button>
                </div>
            </section>
            
            <section className="p-6 rounded-xl shadow-lg backdrop-blur-sm" style={{backgroundColor: colors.card, borderTop: `1px solid ${colors.cardLight}`}}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-base md:text-lg font-bold" style={{fontFamily: "'Press Start 2P'", color: colors.text}}>Recent Teams</h2>
                    <button onClick={onNavigateToTeams} className="text-sm hover:underline transition-all duration-200 hover:scale-105" style={{color: colors.primary}}>View All</button>
                </div>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar" style={{'--scrollbar-track-color': colors.card, '--scrollbar-thumb-color': colors.primary, '--scrollbar-thumb-border-color': colors.card}}>
                    {recentTeams.length > 0 ? recentTeams.map(team => (
                        <div key={team.id} className="p-4 rounded-lg flex items-center justify-between transition-all duration-200 hover:shadow-md" style={{backgroundColor: colors.cardLight}}>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-lg truncate" style={{color: colors.text}}>{team.name}</p>
                                <div className="flex mt-1">
                                    {team.pokemons.map(p => <img key={p.id} src={p.sprite || POKEBALL_PLACEHOLDER_URL} onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL }} alt={p.name} className="h-8 w-8 -ml-2 border-2 rounded-full transition-transform duration-200 hover:scale-110 hover:z-10" style={{borderColor: colors.cardLight, backgroundColor: colors.card}} />)}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                <button onClick={() => handleToggleFavorite(team)} title="Favorite">
                                    <StarIcon isFavorite={team.isFavorite} color={colors.textMuted} />
                                </button>
                                <button onClick={() => handleEditTeam(team)} className="text-xs font-bold py-1 px-3 rounded-full transition-all duration-200 hover:scale-105 active:scale-95" style={{backgroundColor: colors.primary, color: colors.background}} >Edit</button>
                                <button onClick={() => requestDeleteTeam(team.id, team.name)} className="bg-red-600 p-1 hover:bg-red-700 text-white rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"><TrashIcon /></button>
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <input type="text" placeholder="Search Pokémon..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="w-full p-3 rounded-lg border-2 focus:outline-none" style={{backgroundColor: colors.cardLight, borderColor: 'transparent', color: colors.text}}/>
                        <select value={selectedGeneration} onChange={e => setSelectedGeneration(e.target.value)} className="w-full p-3 rounded-lg border-2 focus:outline-none appearance-none capitalize" style={{backgroundColor: colors.cardLight, borderColor: 'transparent', color: colors.text}}>
                            <option value="all" style={{color: colors.text}}>All Generations</option>
                            {generations.map(gen => <option key={gen} value={gen} className="capitalize" style={{color: colors.text}}>{gen.replace('-', ' ')}</option>)}
                        </select>
                        <button 
                            onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                            className={`w-full p-3 rounded-lg border-2 focus:outline-none flex items-center justify-center gap-2 font-semibold transition-all duration-200 ${showOnlyFavorites ? 'ring-2 ring-yellow-400' : ''}`}
                            style={{backgroundColor: showOnlyFavorites ? 'rgba(251, 191, 36, 0.2)' : colors.cardLight, borderColor: 'transparent', color: colors.text}}
                        >
                            <StarIcon className="w-5 h-5" isFavorite={showOnlyFavorites} color={colors.textMuted} />
                            {showOnlyFavorites ? 'Favorites' : 'Favorites'}
                        </button>
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
                            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-2 py-4">
                                {displayedPokemons.map((pokemon, index) => (
                                    <PokemonCard 
                                        key={pokemon.id} 
                                        details={pokemon} 
                                        onCardClick={handleAddPokemonToTeam} 
                                        lastRef={index === displayedPokemons.length - 1 ? lastPokemonElementRef : null} 
                                        isSuggested={suggestedPokemonIds.has(pokemon.id)} 
                                        colors={colors}
                                        isFavorite={favoritePokemons.has(pokemon.id)}
                                        onToggleFavorite={onToggleFavoritePokemon}
                                    />
                                ))}
                            </div>
                            {isFetchingMore && <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{borderColor: colors.primary}}></div></div>}
                            {displayedPokemons.length === 0 && !isInitialLoading && (
                                <p className="text-center py-8" style={{color: colors.textMuted}}>
                                    {showOnlyFavorites ? 'No favorite Pokémon found. Add some favorites!' : 'No Pokémon found with these filters. :('}
                                </p>
                            )}
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
};

const AllTeamsView = ({teams, onEdit, requestDelete, onToggleFavorite, searchTerm, setSearchTerm, colors}) => (
    <div className="p-6 rounded-xl shadow-lg" style={{backgroundColor: colors.card}}>
        <h2 className="text-2xl md:text-3xl font-bold mb-6" style={{color: colors.text}}>All Saved Teams</h2>
        <input type="text" placeholder="Search teams by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-3 mb-6 rounded-lg border-2 focus:outline-none" style={{backgroundColor: colors.cardLight, borderColor: 'transparent', color: colors.text}}/>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {teams.length > 0 ? teams.map(team => (
                <div key={team.id} className="p-4 rounded-lg flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:scale-[1.02]" style={{backgroundColor: colors.cardLight}}>
                    <div className="flex justify-between items-start">
                        <p className="font-bold text-xl truncate mb-2" style={{color: colors.text}}>{team.name}</p>
                        <button onClick={() => onToggleFavorite(team)} title="Favorite" className="transition-transform duration-200 hover:scale-110 active:scale-95">
                            <StarIcon isFavorite={team.isFavorite} color={colors.textMuted} />
                        </button>
                    </div>
                    <div className="flex my-2">
                        {team.pokemons.map(p => <img key={p.id} src={p.sprite || POKEBALL_PLACEHOLDER_URL} onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL }} alt={p.name} className="h-12 w-12 -ml-3 border-2 rounded-full transition-transform duration-200 hover:scale-110 hover:z-10" style={{borderColor: colors.cardLight, backgroundColor: colors.card}} />)}
                    </div>
                    <div className="flex items-center gap-2 mt-auto pt-2">
                        <button onClick={() => onEdit(team)} className="w-full bg-primary hover:bg-purple-500/30 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]">Edit</button>
                        <button onClick={() => requestDelete(team.id, team.name)} className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"><TrashIcon /></button>
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
    isInitialLoading, colors, showDetails,
    favoritePokemons, onToggleFavoritePokemon,
    showOnlyFavorites, setShowOnlyFavorites
}) => {
    // Filter pokemons based on favorites toggle
    const displayedPokemons = showOnlyFavorites 
        ? pokemons.filter(p => favoritePokemons.has(p.id))
        : pokemons;

    return (
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
             <div className="lg:col-span-9">
                 <section className="p-6 rounded-xl shadow-lg h-full flex flex-col" style={{backgroundColor: colors.card}}>
                     <div className="mb-4">
                         <h2 className="text-lg md:text-xl font-bold mb-4" style={{fontFamily: "'Press Start 2P'", color: colors.text}}>Pokédex</h2>
                         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                             <input type="text" placeholder="Search Pokémon..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="w-full p-3 rounded-lg border-2 focus:outline-none" style={{backgroundColor: colors.cardLight, borderColor: 'transparent', color: colors.text}}/>
                             <select value={selectedGeneration} onChange={e => setSelectedGeneration(e.target.value)} className="w-full p-3 rounded-lg border-2 focus:outline-none appearance-none capitalize" style={{backgroundColor: colors.cardLight, borderColor: 'transparent', color: colors.text}}>
                                 <option value="all" style={{color: colors.text}}>All Generations</option>
                                 {generations.map(gen => <option key={gen} value={gen} className="capitalize" style={{color: colors.text}}>{gen.replace('-', ' ')}</option>)}
                             </select>
                             <button 
                                onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                                className={`w-full p-3 rounded-lg border-2 focus:outline-none flex items-center justify-center gap-2 font-semibold transition-all duration-200 ${showOnlyFavorites ? 'ring-2 ring-yellow-400' : ''}`}
                                style={{backgroundColor: showOnlyFavorites ? 'rgba(251, 191, 36, 0.2)' : colors.cardLight, borderColor: 'transparent', color: colors.text}}
                             >
                                <StarIcon className="w-5 h-5" isFavorite={showOnlyFavorites} color={colors.textMuted} />
                                {showOnlyFavorites ? 'Showing Favorites' : 'Show Favorites'}
                             </button>
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
                                     {displayedPokemons.map((pokemon, index) => (
                                         <PokemonCard 
                                             key={pokemon.id} 
                                             details={pokemon} 
                                             onCardClick={showDetails} 
                                             lastRef={index === displayedPokemons.length - 1 ? lastPokemonElementRef : null} 
                                             colors={colors}
                                             isFavorite={favoritePokemons.has(pokemon.id)}
                                             onToggleFavorite={onToggleFavoritePokemon}
                                         />
                                     ))}
                                 </div>
                                 {isFetchingMore && <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{borderColor: colors.primary}}></div></div>}
                                 {displayedPokemons.length === 0 && !isInitialLoading && (
                                     <p className="text-center py-8" style={{color: colors.textMuted}}>
                                         {showOnlyFavorites ? 'No favorite Pokémon found. Add some favorites!' : 'No Pokémon found.'}
                                     </p>
                                 )}
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

// Favorite Pokemons View
const FavoritePokemonsView = ({
    allPokemons,
    favoritePokemons,
    onToggleFavoritePokemon,
    showDetails,
    colors,
    onAddToTeam,
    isLoading
}) => {
    const [searchInput, setSearchInput] = useState('');
    const [selectedType, setSelectedType] = useState('all');
    
    // Get favorite pokemon data from all pokemons
    const favoritePokemonsList = useMemo(() => {
        return allPokemons.filter(p => favoritePokemons.has(p.id));
    }, [allPokemons, favoritePokemons]);
    
    // Apply filters
    const filteredFavorites = useMemo(() => {
        let filtered = favoritePokemonsList;
        
        if (searchInput) {
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(searchInput.toLowerCase())
            );
        }
        
        if (selectedType !== 'all') {
            filtered = filtered.filter(p => p.types.includes(selectedType));
        }
        
        return filtered;
    }, [favoritePokemonsList, searchInput, selectedType]);

    return (
        <main className="space-y-6">
            <section className="p-6 rounded-xl shadow-lg" style={{ backgroundColor: colors.card }}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
                    <div>
                        <h2 className="text-lg md:text-xl font-bold" style={{ fontFamily: "'Press Start 2P'", color: colors.text }}>
                            Favorite Pokémon
                        </h2>
                        <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                            {favoritePokemons.size} Pokémon saved as favorites
                        </p>
                    </div>
                </div>
                
                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <input 
                        type="text" 
                        placeholder="Search favorites..." 
                        value={searchInput} 
                        onChange={(e) => setSearchInput(e.target.value)} 
                        className="w-full p-3 rounded-lg border-2 focus:outline-none" 
                        style={{backgroundColor: colors.cardLight, borderColor: 'transparent', color: colors.text}}
                    />
                    <select 
                        value={selectedType} 
                        onChange={e => setSelectedType(e.target.value)} 
                        className="w-full p-3 rounded-lg border-2 focus:outline-none appearance-none capitalize" 
                        style={{backgroundColor: colors.cardLight, borderColor: 'transparent', color: colors.text}}
                    >
                        <option value="all">All Types</option>
                        {Object.keys(typeColors).map(type => (
                            <option key={type} value={type} className="capitalize">{type}</option>
                        ))}
                    </select>
                </div>
                
                {/* Pokemon Grid */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{borderColor: colors.primary}}></div>
                    </div>
                ) : filteredFavorites.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                        {filteredFavorites.map(pokemon => (
                            <PokemonCard 
                                key={pokemon.id} 
                                details={pokemon} 
                                onCardClick={showDetails} 
                                colors={colors}
                                isFavorite={true}
                                onToggleFavorite={onToggleFavoritePokemon}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <div className="mb-4">
                            <StarIcon className="w-16 h-16 mx-auto" isFavorite={false} color={colors.textMuted} />
                        </div>
                        <h3 className="text-xl font-bold mb-2" style={{ color: colors.text }}>
                            {favoritePokemons.size === 0 ? 'No favorites yet!' : 'No matches found'}
                        </h3>
                        <p style={{ color: colors.textMuted }}>
                            {favoritePokemons.size === 0 
                                ? 'Start adding Pokémon to your favorites by clicking the star icon on any Pokémon card.'
                                : 'Try adjusting your search or filter criteria.'}
                        </p>
                    </div>
                )}
            </section>
        </main>
    );
};

// ============================================
// HOME VIEW 
// ============================================

// Dicas do dia - Fun facts sobre Pokémon
const POKEMON_TIPS = [
    "Did you know Pikachu was inspired by a squirrel, not a mouse? The name comes from 'pika' (sparkle) + 'chu' (squeak sound in Japan)!",
    "Ditto can transform into any Pokémon, but its eyes remain the same - a detail that helps identify it!",
    "Magikarp can leap over mountains with its Splash, but the move still deals no damage... ironic, right?",
    "Slowpoke takes 5 seconds to feel pain. If its tail is bitten, it won't notice until much later!",
    "Cubone wears the skull of its deceased mother as a helmet. No one has ever seen its true face.",
    "Gengar might be Clefable's shadow - they have almost identical silhouettes!",
    "Vaporeon is composed of molecules so similar to water that it can become invisible when submerged.",
    "Alakazam has an IQ of 5000, making it smarter than any supercomputer!",
    "Shedinja has only 1 HP, but its Wonder Guard ability makes it immune to non-super effective moves.",
    "Wobbuffet hides its true body - the black tail with eyes is the real Pokémon!",
    "Arcanine was originally planned to be a legendary Pokémon, which is why it's called the 'Legendary Pokémon' in the Pokédex.",
    "Rhydon was the first Pokémon ever created, not Bulbasaur!",
    "Espeon and Umbreon represent the sun and the moon, evolving according to the time of day.",
    "Mewtwo was cloned from Mew, but ended up becoming much more powerful than the original.",
    "Tyranitar can bring down whole mountains and change the landscape when it's furious!",
    "Eevee has the most possible evolutions of any Pokémon, currently totaling eight different forms!",
    "Porygon is the first artificial Pokémon, created entirely out of programming code.",
    "Dragonite can circle the globe in just 16 hours, flying at roughly 1,500 mph.",
    "Lapras is known for its high intelligence and can understand human speech.",
    "Snorlax's stomach is so strong it can digest rotten food without getting sick.",
    "Farfetch'd carries a leek stalk as a weapon, but it will also eat it if it gets hungry enough!",
    "Psyduck suffers from constant headaches. When the pain becomes too intense, it unleashes powerful psychic energy.",
    "Meowth is the only Pokémon in the anime that taught itself to speak human language to impress a female Meowth.",
    "Machamp can throw 500 punches in a single second with its four arms!",
    "Gyarados is known as the Atrocious Pokémon because of its violent temper, often destroying entire cities in a rage.",
    "Jigglypuff's song is so soothing that no one can stay awake to hear the whole thing.",
    "Haunter can lick you with its gaseous tongue to steal your life force. Spooky!",
    "Kangaskhan is never seen without its baby in its pouch until the baby is fully grown.",
    "Mr. Mime creates invisible walls by vibrating its fingertips at high speeds.",
    "Scyther moves so fast that it looks like there are several of them at once, creating a ninja-like illusion.",
    "Electabuzz loves to feed on electricity and can often be found near power plants causing blackouts.",
    "Magmar's body temperature is nearly 2,200 degrees Fahrenheit, making it a walking fireball.",
    "Tauros whips itself with its three tails to get pumped up for battle.",
    "Ditto cannot copy a Pokémon's HP stat, which is why it often transforms into high-HP Pokémon in competitive play.",
    "Eevee's genetic code is unstable, which is why it can evolve into so many different types.",
    "Kabutops was an ancient predator that swam in the oceans 300 million years ago.",
    "Aerodactyl was resurrected from DNA found in amber, much like the dinosaurs in Jurassic Park!",
    "Articuno's wings are said to be made of ice, and it can create blizzards just by flapping them.",
    "Zapdos is capable of controlling thunderstorms and gains power when struck by lightning.",
    "Moltres heals its wounds by dipping itself into the magma of an active volcano.",
    "Dratini was once considered a myth until a fishing colony found one underwater.",
    "Mew contains the DNA of every single Pokémon, making it the ancestor of all Pokémon.",
    "Chikorita uses the leaf on its head to check the temperature and humidity of the air.",
    "Cyndaquil flares the flames on its back when it is angry or startled.",
    "Totodile has a habit of biting anything it sees, including its trainer!",
    "Sentret stands on its tail to scout for danger from a distance.",
    "Hoothoot has an internal organ that senses the earth's rotation, keeping perfect time.",
    "Ledyba communicates with others using scents that change depending on its feelings.",
    "Spinarak spins a web that is strong enough to trap small prey, and it waits patiently for days.",
    "Pichu is not yet skilled at storing electricity and may accidentally discharge it when startled.",
    "Cleffa is often seen dancing in a ring on nights with a full moon.",
    "Igglybuff has a very soft and elastic body, allowing it to bounce like a ball.",
    "Togepi stores happiness inside its shell and shares it with those who treat it well.",
    "Natu cannot fly yet, so it hops around to get from place to place.",
    "Mareep's wool grows continuously and stores static electricity. Touching it can give you a shock!",
    "Bellossom is the only Pokémon that evolves from a dual-type (Gloom) into a single-type.",
    "Marill's tail functions like a float, keeping it above water even in strong currents.",
    "Sudowoodo pretends to be a tree to avoid being attacked, but it hates water!"
];

const HomeIcon = () => (<svg className="w-6 h-6 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>);

const HomeView = ({
    colors,
    navigate,
    savedTeams,
    favoritePokemons,
    allPokemons,
    recentTeams,
    showDetails,
    onToggleFavoritePokemon,
    handleEditTeam,
    greetingPokemonId,
    onOpenPokemonSelector,
    db,
    theme,
    onNavigateWithTypeFilter
}) => {
    const [greetingPokemonData, setGreetingPokemonData] = useState(null);
    const [isDailyPokemonLoading, setIsDailyPokemonLoading] = useState(true);
    
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) {
            return { text: "Good morning", emoji: "☀️", pokemon: "espeon", period: "morning" };
        } else if (hour >= 12 && hour < 18) {
            return { text: "Good afternoon", emoji: "🌤️", pokemon: "pikachu", period: "afternoon" };
        } else {
            return { text: "Good evening", emoji: "🌙", pokemon: "umbreon", period: "night" };
        }
    };
    const greeting = getGreeting();
    
    // Fetch greeting Pokemon data from Firestore
    useEffect(() => {
        const fetchGreetingPokemon = async () => {
            if (!db || !greetingPokemonId) {
                // Use default Pokemon if no custom selection
                const defaultNames = {
                    morning: 'espeon',
                    afternoon: 'pikachu',
                    night: 'umbreon'
                };
                const defaultPokemon = allPokemons.find(p => p.name === defaultNames[greeting.period]);
                setGreetingPokemonData(defaultPokemon || null);
                return;
            }
            
            try {
                const docRef = doc(db, 'artifacts/pokemonTeamBuilder/pokemons', String(greetingPokemonId));
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setGreetingPokemonData(docSnap.data());
                } else {
                    // Fallback to finding in loaded Pokemon
                    const fallback = allPokemons.find(p => p.id === greetingPokemonId);
                    setGreetingPokemonData(fallback || null);
                }
            } catch (error) {
                console.error('Error fetching greeting Pokemon:', error);
                // Fallback to loaded Pokemon
                const fallback = allPokemons.find(p => p.id === greetingPokemonId);
                setGreetingPokemonData(fallback || null);
            }
        };
        
        fetchGreetingPokemon();
    }, [db, greetingPokemonId, allPokemons, greeting.period]);

    // daily pokemon
    const getPokemonOfTheDay = () => {
        if (!allPokemons || allPokemons.length === 0) {
            return null;
        }
        
        const today = new Date();
        const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
        
        const seed = dayOfYear;
        const random = ((seed * 9301 + 49297) % 233280) / 233280; 
        const index = Math.floor(random * allPokemons.length);
        
        return allPokemons[index] || allPokemons[0];
    };
    const pokemonOfTheDay = getPokemonOfTheDay();
    
    useEffect(() => {
        if (allPokemons && allPokemons.length > 0) {
            setIsDailyPokemonLoading(false);
        } else {
            setIsDailyPokemonLoading(true);
        }
    }, [allPokemons]);

    // daily tip
    const getTipOfTheDay = () => {
        const today = new Date();
        const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
        return POKEMON_TIPS[dayOfYear % POKEMON_TIPS.length];
    };
    const tipOfTheDay = getTipOfTheDay();

    // trainer stats
    const getTrainerStats = () => {
        const allPokemonsInTeams = savedTeams.flatMap(t => t.pokemons);
        const typeCounts = {};
        
        allPokemonsInTeams.forEach(p => {
            const pokemon = allPokemons.find(ap => ap.id === p.id);
            if (pokemon?.types) {
                pokemon.types.forEach(type => {
                    typeCounts[type] = (typeCounts[type] || 0) + 1;
                });
            }
        });

        const favoriteType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
        
        return {
            totalTeams: savedTeams.length,
            favoriteTeams: savedTeams.filter(t => t.isFavorite).length,
            totalFavoritePokemons: favoritePokemons.size,
            favoriteType: favoriteType ? favoriteType[0] : null
        };
    };
    const stats = getTrainerStats();

    // favorites
    const featuredFavorites = useMemo(() => {
        return allPokemons.filter(p => favoritePokemons.has(p.id)).slice(0, 6);
    }, [allPokemons, favoritePokemons]);

    // last edited team
    const lastEditedTeam = recentTeams[0];
    
    const pokemonPrimaryColor = pokemonOfTheDay?.types?.[0] ? typeColors[pokemonOfTheDay.types[0]] : colors.primary;
    const pokemonSecondaryColor = pokemonOfTheDay?.types?.[1] ? typeColors[pokemonOfTheDay.types[1]] : pokemonPrimaryColor;
    
    const greetingPokemonColor = greetingPokemonData?.types?.[0] ? typeColors[greetingPokemonData.types[0]] : colors.primary;
    const greetingPokemonSecondaryColor = greetingPokemonData?.types?.[1] ? typeColors[greetingPokemonData.types[1]] : greetingPokemonColor;
    
    // Pokemon-themed motivational messages
    const motivationalMessages = [
        "Ready to be the very best!",
        "Your journey awaits, Trainer!",
        "Let's catch 'em all today!",
        "Adventure is out there!",
        "Time to build your dream team!",
        "Every Pokémon is unique!",
        "Gotta catch 'em all!",
        "Explore new possibilities!",
    ];
    const randomMessage = useMemo(() => {
        const today = new Date();
        const seed = today.getDate() + today.getMonth();
        return motivationalMessages[seed % motivationalMessages.length];
    }, []);

    return (
        <main className="space-y-6 pb-8">
             <section 
                className="relative overflow-hidden rounded-2xl p-6 md:p-8 group"
                style={{ 
                    background: `linear-gradient(135deg, ${greetingPokemonColor}25 0%, ${greetingPokemonSecondaryColor}10 50%, ${colors.card} 100%)`,
                    border: `2px solid ${greetingPokemonColor}40`,
                    boxShadow: theme === 'light' ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : 'none'
                }}
            >
                {/* background partner pokemon */}
                {greetingPokemonData && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none">
                        <img 
                            src={greetingPokemonData.animatedSprite || greetingPokemonData.sprite || POKEBALL_PLACEHOLDER_URL}
                            alt={greetingPokemonData.name}
                            className="w-48 h-48 md:w-64 md:h-64 object-contain"
                            onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                        />
                    </div>
                )}
                
                <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-4xl md:text-5xl">{greeting.emoji}</span>
                                <div>
                                    <h1 className="text-2xl md:text-4xl font-bold" style={{ color: colors.text }}>
                                        {greeting.text}, Trainer!
                                    </h1>
                                    <p className="text-sm md:text-base mt-1" style={{ color: colors.textMuted }}>
                                        {randomMessage}
                                    </p>
                                </div>
                            </div>
                            
                            {/* partner pokemon */}
                            {greetingPokemonData && (
                                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm" 
                                     style={{ backgroundColor: greetingPokemonColor + '20' }}>
                                    <img 
                                        src={greetingPokemonData.sprite || POKEBALL_PLACEHOLDER_URL}
                                        alt={greetingPokemonData.name}
                                        className="w-8 h-8"
                                        onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                    />
                                    <span className="text-sm font-semibold capitalize" style={{ color: colors.text }}>
                                        Partner: {greetingPokemonData.name}
                                    </span>
                                    {greetingPokemonData.types && (
                                        <div className="flex gap-1">
                                            {greetingPokemonData.types.map(type => (
                                                <img 
                                                    key={type}
                                                    src={typeIcons[type]} 
                                                    alt={type}
                                                    className="w-4 h-4"
                                                    title={type}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        {/* change button */}
                        <button
                            onClick={onOpenPokemonSelector}
                            className="p-3 rounded-xl transition-all hover:scale-110 active:scale-95 opacity-70 hover:opacity-100"
                            style={{ backgroundColor: colors.cardLight }}
                            title="Change partner Pokémon"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: colors.text }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                </div>
                
                <div 
                    className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none"
                    style={{ backgroundColor: greetingPokemonColor }}
                />
                <div 
                    className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-15 pointer-events-none"
                    style={{ backgroundColor: greetingPokemonSecondaryColor }}
                />
            </section> 

            {/* main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* left column */}
                <div className="lg:col-span-2 space-y-6">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* daily mon */}
                    {isDailyPokemonLoading ? (
                        <section 
                            className="rounded-2xl w-full p-6 relative overflow-hidden animate-pulse"
                            style={{ 
                                backgroundColor: colors.card,
                                borderLeft: `4px solid ${colors.primary}`,
                                boxShadow: theme === 'light' ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : 'none'
                            }}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="h-6 w-32 rounded-full" style={{ backgroundColor: colors.cardLight }}></div>
                                    </div>
                                    <div className="h-8 w-40 rounded mb-2" style={{ backgroundColor: colors.cardLight }}></div>
                                    <div className="h-4 w-16 rounded mb-3" style={{ backgroundColor: colors.cardLight }}></div>
                                    <div className="flex gap-2">
                                        <div className="h-6 w-16 rounded-full" style={{ backgroundColor: colors.cardLight }}></div>
                                        <div className="h-6 w-16 rounded-full" style={{ backgroundColor: colors.cardLight }}></div>
                                    </div>
                                </div>
                                <div className="relative">
                                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full" style={{ backgroundColor: colors.cardLight }}></div>
                                </div>
                            </div>
                        </section>
                    ) : pokemonOfTheDay && (
                        <section 
                            className="rounded-2xl w-full p-6 relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:shadow-xl"
                            style={{ 
                                backgroundColor: colors.card,
                                borderLeft: `4px solid ${typeColors[pokemonOfTheDay.types?.[0]] || colors.primary}`,
                                boxShadow: theme === 'light' ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : 'none'
                            }}
                            onClick={() => showDetails(pokemonOfTheDay)}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: colors.primary, color: 'white' }}>
                                            ⭐ DAILY POKÉMON
                                        </span>
                                    </div>
                                    <h2 className="text-2xl md:text-3xl font-bold capitalize mb-1" style={{ color: colors.text }}>
                                        {pokemonOfTheDay.name}
                                    </h2>
                                    <p className="text-sm mb-3" style={{ color: colors.textMuted }}>
                                        #{String(pokemonOfTheDay.id).padStart(3, '0')}
                                    </p>
                                    <div className="flex gap-2">
                                        {pokemonOfTheDay.types?.map(type => (
                                            <span 
                                                key={type}
                                                className="px-3 py-1 rounded-full text-xs font-bold text-white capitalize"
                                                style={{ backgroundColor: typeColors[type] }}
                                            >
                                                {type}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="relative">
                                    <img 
                                        src={pokemonOfTheDay.animatedSprite || POKEBALL_PLACEHOLDER_URL}
                                        alt={pokemonOfTheDay.name}
                                        className="w-24 h-24 md:w-32 md:h-32 object-contain hover:scale-110 transition-transform"
                                        onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                    />
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onToggleFavoritePokemon(pokemonOfTheDay.id); }}
                                        className="absolute top-0 right-0 p-2 rounded-full transition-all hover:scale-110"
                                        style={{ backgroundColor: favoritePokemons.has(pokemonOfTheDay.id) ? 'rgba(251, 191, 36, 0.3)' : colors.cardLight }}
                                    >
                                        <StarIcon className="w-5 h-5" isFavorite={favoritePokemons.has(pokemonOfTheDay.id)} color={colors.textMuted} />
                                    </button>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* daily tip */}
                    <section 
                        className="rounded-2xl w-full p-7"
                        style={{ 
                            backgroundColor: colors.card,
                            borderLeft: `4px solid ${colors.primary}`,
                            boxShadow: theme === 'light' ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : 'none'
                        }}
                    >
                        <h3 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: colors.text }}>
                            💡 Did you know?
                        </h3>
                        <p className="text-normal leading-relaxed" style={{ color: colors.textMuted }}>
                            {tipOfTheDay}
                        </p>
                    </section>
                    </div>

                    {/* quick options */}
                    <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { icon: <SwordsIcon />, label: "Create Team", path: "/builder", color: "#7d65e1" },
                            { icon: <PokeballIcon />, label: "Pokédex", path: "/pokedex", color: "#EE8130" },
                            { icon: <DiceIcon />, label: "Random", path: "/generator", color: "#6390F0" },
                            { icon: <StarIcon className="w-6 h-6" isFavorite={true} color="#FBBF24" />, label: "Favorites", path: "/favorites", color: "#FBBF24" }
                        ].map((shortcut, index) => (
                            <button
                                key={index}
                                onClick={() => navigate(shortcut.path)}
                                className="p-4 rounded-xl flex flex-col items-center gap-2 transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95"
                                style={{ 
                                    backgroundColor: colors.card, 
                                    border: `2px solid ${shortcut.color}20`,
                                    boxShadow: theme === 'light' ? '0 2px 4px -1px rgba(0, 0, 0, 0.08)' : 'none'
                                }}
                            >
                                <div 
                                    className="w-12 h-12 rounded-full flex items-center justify-center"
                                    style={{ backgroundColor: `${shortcut.color}20`, color: shortcut.color }}
                                >
                                    {shortcut.icon}
                                </div>
                                <span className="text-sm font-semibold" style={{ color: colors.text }}>
                                    {shortcut.label}
                                </span>
                            </button>
                        ))}
                    </section>

                    {/* favorites */}
                    <section 
                        className="rounded-2xl p-6" 
                        style={{ 
                            backgroundColor: colors.card,
                            boxShadow: theme === 'light' ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : 'none'
                        }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: colors.text }}>
                                ⭐ Your favorites
                            </h3>
                            {featuredFavorites.length > 0 && (
                                <button 
                                    onClick={() => navigate('/favorites')}
                                    className="text-sm hover:underline p-2 rounded-lg font-semibold transition-all hover:scale-105"
                                    style={{ color: colors.primary, backgroundColor: colors.primary + '30' }}
                                >
                                    Check all →
                                </button>
                            )}
                        </div>
                        {featuredFavorites.length > 0 ? (
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                                {featuredFavorites.map(pokemon => (
                                    <div 
                                        key={pokemon.id}
                                        onClick={() => showDetails(pokemon)}
                                        className="p-3 rounded-xl text-center cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg"
                                        style={{ backgroundColor: colors.cardLight }}
                                    >
                                        <img 
                                            src={pokemon.sprite || POKEBALL_PLACEHOLDER_URL}
                                            alt={pokemon.name}
                                            className="w-16 h-16 mx-auto"
                                            onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                        />
                                        <p className="text-xs capitalize truncate mt-1" style={{ color: colors.text }}>
                                            {pokemon.name}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="text-6xl mb-3 opacity-30">⭐</div>
                                <p className="text-sm mb-2" style={{ color: colors.textMuted }}>
                                    No favorite Pokémon yet!
                                </p>
                                <p className="text-xs mb-4" style={{ color: colors.textMuted }}>
                                    Click the star icon on any Pokémon to add them here
                                </p>
                                <button
                                    onClick={() => navigate('/pokedex')}
                                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105"
                                    style={{ backgroundColor: colors.primary, color: 'white' }}
                                >
                                    Browse Pokédex
                                </button>
                            </div>
                        )}
                    </section>
                </div>

                {/* right column */}
                <div className="space-y-6">
                    
                    {/* trainer stats */}
                    <section 
                        className="rounded-2xl p-6"
                        style={{ 
                            backgroundColor: colors.card,
                            background: `linear-gradient(135deg, ${colors.card} 0%, ${colors.primary}15 100%)`,
                            boxShadow: theme === 'light' ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : 'none'
                        }}
                    >
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: colors.text }}>
                            🎖️ Trainer Stats
                        </h3>
                        {stats.totalTeams > 0 ? (
                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-3 rounded-xl text-center" style={{ backgroundColor: colors.cardLight }}>
                                    <p className="text-2xl font-bold" style={{ color: colors.primary }}>{stats.totalTeams}</p>
                                    <p className="text-xs" style={{ color: colors.textMuted }}>Teams created</p>
                                </div>
                                <div className="p-3 rounded-xl text-center" style={{ backgroundColor: colors.cardLight }}>
                                    <p className="text-2xl font-bold" style={{ color: '#FBBF24' }}>{stats.favoriteTeams}</p>
                                    <p className="text-xs" style={{ color: colors.textMuted }}>Favorite Teams</p>
                                </div>
                                {stats.favoriteType && (
                                    <div className="p-3 rounded-xl text-center" style={{ backgroundColor: colors.cardLight }}>
                                        <div 
                                            className="w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-1"
                                            style={{ backgroundColor: typeColors[stats.favoriteType] }}
                                        >
                                            <img src={typeIcons[stats.favoriteType]} alt={stats.favoriteType} className="w-6 h-6" />
                                        </div>
                                        <p className="text-xs capitalize" style={{ color: colors.textMuted }}>Favorite type</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <div className="text-5xl mb-3 opacity-30">🎖️</div>
                                <p className="text-sm mb-2" style={{ color: colors.textMuted }}>
                                    No teams yet!
                                </p>
                                <p className="text-xs" style={{ color: colors.textMuted }}>
                                    Create your first team to start tracking stats
                                </p>
                            </div>
                        )}
                    </section>

                    {/* last edited team */}
                    <section 
                        className="rounded-2xl p-6" 
                        style={{ 
                            backgroundColor: colors.card,
                            boxShadow: theme === 'light' ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : 'none'
                        }}
                    >
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: colors.text }}>
                            ♟️ Your last team
                        </h3>
                        {lastEditedTeam ? (
                            <div 
                                className="p-4 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
                                style={{ backgroundColor: colors.cardLight }}
                                onClick={() => handleEditTeam(lastEditedTeam)}
                            >
                                <p className="font-bold truncate mb-2" style={{ color: colors.text }}>
                                    {lastEditedTeam.name}
                                </p>
                                <div className="flex -space-x-2">
                                    {lastEditedTeam.pokemons.slice(0, 6).map((p, i) => (
                                        <img 
                                            key={i}
                                            src={p.sprite || POKEBALL_PLACEHOLDER_URL}
                                            alt={p.name}
                                            className="w-10 h-10 rounded-full border-2"
                                            style={{ borderColor: colors.cardLight, backgroundColor: colors.card }}
                                            onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                        />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <div className="text-5xl mb-3 opacity-30">♟️</div>
                                <p className="text-sm mb-2" style={{ color: colors.textMuted }}>
                                    No teams created yet!
                                </p>
                                <p className="text-xs mb-4" style={{ color: colors.textMuted }}>
                                    Build your first dream team
                                </p>
                                <button
                                    onClick={() => navigate('/builder')}
                                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105"
                                    style={{ backgroundColor: colors.primary, color: 'white' }}
                                >
                                    Create Team
                                </button>
                            </div>
                        )}
                    </section>

                    {/* explore by type */}
                    <section 
                        className="rounded-2xl p-4" 
                        style={{ 
                            backgroundColor: colors.card,
                            boxShadow: theme === 'light' ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : 'none'
                        }}
                    >
                        <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: colors.text }}>
                            🔍 Explore by types!
                        </h3>
                        <div className="grid grid-cols-9 gap-1.5">
                            {Object.entries(typeColors).map(([type, color]) => (
                                <button
                                    key={type}
                                    onClick={() => onNavigateWithTypeFilter(type)}
                                    className="p-1.5 rounded-md transition-all duration-200 hover:scale-110 hover:shadow-md"
                                    
                                    title={type}
                                >
                                    <img 
                                        src={typeIcons[type]} 
                                        alt={type} 
                                        className="w-full h-auto"
                                    />
                                </button>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
};

// Pokemon Random Generator Data
const GENERATION_RANGES = {
    'all': { start: 1, end: 1025 },
    'generation-i': { start: 1, end: 151 },
    'generation-ii': { start: 152, end: 251 },
    'generation-iii': { start: 252, end: 386 },
    'generation-iv': { start: 387, end: 493 },
    'generation-v': { start: 494, end: 649 },
    'generation-vi': { start: 650, end: 721 },
    'generation-vii': { start: 722, end: 809 },
    'generation-viii': { start: 810, end: 905 },
    'generation-ix': { start: 906, end: 1025 }
};

const LEGENDARY_IDS = new Set([
    // Gen 1
    144, 145, 146, 150, 151,
    // Gen 2
    243, 244, 245, 249, 250, 251,
    // Gen 3
    377, 378, 379, 380, 381, 382, 383, 384, 385, 386,
    // Gen 4
    480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493,
    // Gen 5
    494, 638, 639, 640, 641, 642, 643, 644, 645, 646, 647, 648, 649,
    // Gen 6
    716, 717, 718, 719, 720, 721,
    // Gen 7
    785, 786, 787, 788, 789, 790, 791, 792, 793, 794, 795, 796, 797, 798, 799, 800, 801, 802, 803, 804, 805, 806, 807, 808, 809,
    // Gen 8
    888, 889, 890, 891, 892, 893, 894, 895, 896, 897, 898, 905,
    // Gen 9
    1001, 1002, 1003, 1004, 1007, 1008, 1009, 1010, 1014, 1015, 1016, 1017, 1024, 1025
]);

const NATURES_LIST = [
    { name: 'Hardy', plus: null, minus: null },
    { name: 'Lonely', plus: 'Attack', minus: 'Defense' },
    { name: 'Brave', plus: 'Attack', minus: 'Speed' },
    { name: 'Adamant', plus: 'Attack', minus: 'Sp. Atk' },
    { name: 'Naughty', plus: 'Attack', minus: 'Sp. Def' },
    { name: 'Bold', plus: 'Defense', minus: 'Attack' },
    { name: 'Docile', plus: null, minus: null },
    { name: 'Relaxed', plus: 'Defense', minus: 'Speed' },
    { name: 'Impish', plus: 'Defense', minus: 'Sp. Atk' },
    { name: 'Lax', plus: 'Defense', minus: 'Sp. Def' },
    { name: 'Timid', plus: 'Speed', minus: 'Attack' },
    { name: 'Hasty', plus: 'Speed', minus: 'Defense' },
    { name: 'Serious', plus: null, minus: null },
    { name: 'Jolly', plus: 'Speed', minus: 'Sp. Atk' },
    { name: 'Naive', plus: 'Speed', minus: 'Sp. Def' },
    { name: 'Modest', plus: 'Sp. Atk', minus: 'Attack' },
    { name: 'Mild', plus: 'Sp. Atk', minus: 'Defense' },
    { name: 'Quiet', plus: 'Sp. Atk', minus: 'Speed' },
    { name: 'Bashful', plus: null, minus: null },
    { name: 'Rash', plus: 'Sp. Atk', minus: 'Sp. Def' },
    { name: 'Calm', plus: 'Sp. Def', minus: 'Attack' },
    { name: 'Gentle', plus: 'Sp. Def', minus: 'Defense' },
    { name: 'Sassy', plus: 'Sp. Def', minus: 'Speed' },
    { name: 'Careful', plus: 'Sp. Def', minus: 'Sp. Atk' },
    { name: 'Quirky', plus: null, minus: null }
];

const RandomGeneratorView = ({ colors, generations }) => {
    const [generatedPokemon, setGeneratedPokemon] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [pokemonCount, setPokemonCount] = useState(3);
    const [selectedRegion, setSelectedRegion] = useState('all');
    const [selectedType, setSelectedType] = useState('all');
    const [legendaryFilter, setLegendaryFilter] = useState('all');
    const [fullyEvolvedFilter, setFullyEvolvedFilter] = useState('all');
    const [formsFilter, setFormsFilter] = useState('all');
    const [evolutionCache, setEvolutionCache] = useState({});

    const getGenerationName = (id) => {
        for (const [gen, range] of Object.entries(GENERATION_RANGES)) {
            if (gen !== 'all' && id >= range.start && id <= range.end) {
                return gen.replace('generation-', 'Gen ').toUpperCase();
            }
        }
        return 'Unknown';
    };

    const fetchEvolutionChain = useCallback(async (evolutionChainUrl, targetPokemonId = null) => {
        try {
            const cacheKey = targetPokemonId ? `${evolutionChainUrl}_${targetPokemonId}` : evolutionChainUrl;
            
            if (evolutionCache[cacheKey]) {
                return evolutionCache[cacheKey];
            }

            const evoRes = await fetch(evolutionChainUrl);
            const evoData = await evoRes.json();
            
            // Eevee and its evolutions list (IDs: 133-136, 196-197, 470-471, 700)
            const EEVEE_FAMILY = [133, 134, 135, 136, 196, 197, 470, 471, 700];
            
            const evolutions = [];
            
            // Check if this is Eevee family and we have a target Pokemon
            const isEeveeFamily = targetPokemonId && EEVEE_FAMILY.includes(parseInt(targetPokemonId));
            
            if (isEeveeFamily) {
                // Special handling for Eevee family: only show linear path
                const findPathToTarget = (chain, targetId, path = []) => {
                    const speciesId = chain.species.url.split('/').filter(Boolean).pop();
                    const currentPath = [...path, {
                        name: chain.species.name,
                        id: speciesId,
                        chain: chain
                    }];
                    
                    // If we found the target, return the path
                    if (parseInt(speciesId) === parseInt(targetId)) {
                        return currentPath;
                    }
                    
                    // Search in evolves_to branches
                    if (chain.evolves_to && chain.evolves_to.length > 0) {
                        for (const evo of chain.evolves_to) {
                            const result = findPathToTarget(evo, targetId, currentPath);
                            if (result) return result;
                        }
                    }
                    
                    return null;
                };
                
                const pathToTarget = findPathToTarget(evoData.chain, targetPokemonId);
                
                if (pathToTarget) {
                    pathToTarget.forEach((node, index) => {
                        const id = parseInt(node.id);
                        let genIntroduced = 'Unknown';
                        
                        for (const [gen, range] of Object.entries(GENERATION_RANGES)) {
                            if (gen !== 'all' && id >= range.start && id <= range.end) {
                                genIntroduced = gen.replace('generation-', 'Gen ').toUpperCase();
                                break;
                            }
                        }
                        
                        evolutions.push({
                            name: node.name,
                            id: node.id,
                            stage: index + 1,
                            genIntroduced: genIntroduced,
                            evolutionDetails: node.chain.evolution_details?.[0] || null
                        });
                    });
                }
            } else {
                // Normal processing for non-Eevee Pokemon
                const processChain = (chain, stage = 1) => {
                    const speciesId = chain.species.url.split('/').filter(Boolean).pop();
                    let genIntroduced = 'Unknown';
                    
                    // Determine generation based on ID
                    const id = parseInt(speciesId);
                    for (const [gen, range] of Object.entries(GENERATION_RANGES)) {
                        if (gen !== 'all' && id >= range.start && id <= range.end) {
                            genIntroduced = gen.replace('generation-', 'Gen ').toUpperCase();
                            break;
                        }
                    }

                    evolutions.push({
                        name: chain.species.name,
                        id: speciesId,
                        stage: stage,
                        genIntroduced: genIntroduced,
                        evolutionDetails: chain.evolution_details?.[0] || null
                    });
                    
                    if (chain.evolves_to && chain.evolves_to.length > 0) {
                        chain.evolves_to.forEach(evo => processChain(evo, stage + 1));
                    }
                };
                
                processChain(evoData.chain);
            }
            
            setEvolutionCache(prev => ({
                ...prev,
                [cacheKey]: evolutions
            }));
            
            return evolutions;
        } catch (error) {
            console.error('Error fetching evolution chain:', error);
            return [];
        }
    }, [evolutionCache]);

    const fetchPokemonForms = useCallback(async (pokemonId, speciesUrl) => {
        try {
            const speciesRes = await fetch(speciesUrl);
            const speciesData = await speciesRes.json();
            
            const forms = await Promise.all(
                speciesData.varieties
                    .filter(v => !v.is_default)
                    .slice(0, 5) // Limit to 5 forms for performance
                    .map(async (variety) => {
                        try {
                            const formRes = await fetch(variety.pokemon.url);
                            const formData = await formRes.json();
                            return {
                                name: variety.pokemon.name,
                                sprite: formData.sprites.front_default || formData.sprites.other?.['official-artwork']?.front_default
                            };
                        } catch {
                            return null;
                        }
                    })
            );
            
            return forms.filter(Boolean);
        } catch (error) {
            console.error('Error fetching forms:', error);
            return [];
        }
    }, []);

    const fetchFullPokemonData = useCallback(async (pokemonId) => {
        try {
            const [pokemonRes, speciesRes] = await Promise.all([
                fetch(`${POKEAPI_BASE_URL}/pokemon/${pokemonId}`),
                fetch(`${POKEAPI_BASE_URL}/pokemon-species/${pokemonId}`)
            ]);
            
            const pokemonData = await pokemonRes.json();
            const speciesData = await speciesRes.json();
            
            const evolutions = await fetchEvolutionChain(speciesData.evolution_chain.url, pokemonId);
            const forms = await fetchPokemonForms(pokemonId, `${POKEAPI_BASE_URL}/pokemon-species/${pokemonId}`);
            
            // Determine evolution stage
            const currentEvo = evolutions.find(e => parseInt(e.id) === pokemonId);
            const evolutionStage = currentEvo?.stage || 1;
            const isFullyEvolved = !evolutions.some(e => e.stage > evolutionStage);
            
            // Random nature if needed
            const randomNature = NATURES_LIST[Math.floor(Math.random() * NATURES_LIST.length)];
            
            // Random gender
            const genderRate = speciesData.gender_rate;
            let gender = 'Genderless';
            if (genderRate === -1) {
                gender = 'Genderless';
            } else if (genderRate === 0) {
                gender = 'Male';
            } else if (genderRate === 8) {
                gender = 'Female';
            } else {
                gender = Math.random() < (genderRate / 8) ? 'Female' : 'Male';
            }

            return {
                id: pokemonData.id,
                name: pokemonData.name,
                types: pokemonData.types.map(t => t.type.name),
                sprite: pokemonData.sprites.other?.['official-artwork']?.front_default || pokemonData.sprites.front_default,
                shinySprite: pokemonData.sprites.other?.['official-artwork']?.front_shiny || pokemonData.sprites.front_shiny,
                height: pokemonData.height / 10, // Convert to meters
                weight: pokemonData.weight / 10, // Convert to kg
                generation: getGenerationName(pokemonData.id),
                stats: pokemonData.stats.map(s => ({ name: s.stat.name, base_stat: s.base_stat })),
                abilities: pokemonData.abilities.map(a => a.ability.name),
                evolutions: evolutions,
                evolutionStage: evolutionStage,
                isFullyEvolved: isFullyEvolved,
                forms: forms,
                isLegendary: speciesData.is_legendary,
                isMythical: speciesData.is_mythical,
                habitat: speciesData.habitat?.name || 'Unknown',
                nature: randomNature,
                gender: gender,
                baseHappiness: speciesData.base_happiness,
                captureRate: speciesData.capture_rate,
                growthRate: speciesData.growth_rate?.name || 'Unknown'
            };
        } catch (error) {
            console.error(`Error fetching Pokemon ${pokemonId}:`, error);
            return null;
        }
    }, [fetchEvolutionChain, fetchPokemonForms]);

    const generateRandomPokemon = useCallback(async () => {
        setIsLoading(true);
        setGeneratedPokemon([]);
        
        try {
            // Build the pool of valid Pokemon IDs
            let validIds = [];
            const range = GENERATION_RANGES[selectedRegion] || GENERATION_RANGES['all'];
            
            for (let id = range.start; id <= range.end; id++) {
                validIds.push(id);
            }
            
            // Filter by legendary status
            if (legendaryFilter === 'legendary') {
                validIds = validIds.filter(id => LEGENDARY_IDS.has(id));
            } else if (legendaryFilter === 'non-legendary') {
                validIds = validIds.filter(id => !LEGENDARY_IDS.has(id));
            }
            
            // Shuffle and pick random IDs
            const shuffled = validIds.sort(() => Math.random() - 0.5);
            const selectedIds = shuffled.slice(0, Math.min(pokemonCount, validIds.length));
            
            // Fetch full data for selected Pokemon
            const pokemonPromises = selectedIds.map(id => fetchFullPokemonData(id));
            let results = await Promise.all(pokemonPromises);
            results = results.filter(Boolean);
            
            // Apply type filter
            if (selectedType !== 'all') {
                results = results.filter(p => p.types.includes(selectedType));
                // If we filtered out too many, fetch more
                if (results.length < pokemonCount) {
                    const remaining = pokemonCount - results.length;
                    const moreIds = shuffled.slice(pokemonCount, pokemonCount + remaining * 3);
                    const moreResults = await Promise.all(moreIds.map(id => fetchFullPokemonData(id)));
                    const filtered = moreResults.filter(p => p && p.types.includes(selectedType));
                    results = [...results, ...filtered].slice(0, pokemonCount);
                }
            }
            
            // Apply fully evolved filter
            if (fullyEvolvedFilter === 'fully-evolved') {
                results = results.filter(p => p.isFullyEvolved);
            } else if (fullyEvolvedFilter === 'not-fully-evolved') {
                results = results.filter(p => !p.isFullyEvolved);
            }
            
            setGeneratedPokemon(results);
        } catch (error) {
            console.error('Error generating Pokemon:', error);
        } finally {
            setIsLoading(false);
        }
    }, [pokemonCount, selectedRegion, selectedType, legendaryFilter, fullyEvolvedFilter, fetchFullPokemonData]);

    // Generate on mount
    useEffect(() => {
        generateRandomPokemon();
    }, []);

    const PokemonDetailCard = ({ pokemon }) => {
        const [evoSprites, setEvoSprites] = useState({});
        const [loadingSprites, setLoadingSprites] = useState(true);
        
        // Fetch sprites for evolution chain
        useEffect(() => {
            const fetchEvoSprites = async () => {
                if (!pokemon.evolutions || pokemon.evolutions.length === 0) {
                    setLoadingSprites(false);
                    return;
                }
                setLoadingSprites(true);
                const sprites = {};
                try {
                    await Promise.all(
                        pokemon.evolutions.map(async (evo) => {
                            try {
                                const res = await fetch(`${POKEAPI_BASE_URL}/pokemon/${evo.id}`);
                                const data = await res.json();
                                sprites[evo.id] = data.sprites.front_default;
                            } catch (e) {
                                sprites[evo.id] = null;
                            }
                        })
                    );
                } catch (e) {
                    console.error('Error fetching evo sprites:', e);
                }
                setEvoSprites(sprites);
                setLoadingSprites(false);
            };
            fetchEvoSprites();
        }, [pokemon.evolutions]);

        const primaryType = pokemon.types[0];
        
        // Split evolutions into pre and post
        const currentIndex = pokemon.evolutions?.findIndex(evo => parseInt(evo.id) === pokemon.id) ?? -1;
        const preEvolutions = currentIndex > 0 ? pokemon.evolutions.slice(0, currentIndex) : [];
        const postEvolutions = currentIndex >= 0 && currentIndex < (pokemon.evolutions?.length - 1) 
            ? pokemon.evolutions.slice(currentIndex + 1) 
            : [];

        const EvolutionSprite = ({ evo, isCurrent = false }) => (
            <div className="flex flex-col items-center">
                <div 
                    className={`rounded-xl p-1 ${isCurrent ? '' : 'opacity-70'}`}
                    style={{ 
                        backgroundColor: isCurrent ? typeColors[primaryType] + '20' : 'transparent',
                        border: isCurrent ? `3px solid ${typeColors[primaryType]}` : '2px solid transparent'
                    }}
                >
                    {loadingSprites ? (
                        <div className={`${isCurrent ? 'w-24 h-24' : 'w-16 h-16'} rounded-full animate-pulse`} style={{ backgroundColor: colors.cardLight }}></div>
                    ) : (isCurrent ? pokemon.sprite : evoSprites[evo.id]) ? (
                        <img 
                            src={isCurrent ? pokemon.sprite : evoSprites[evo.id]} 
                            alt={evo.name} 
                            className={`${isCurrent ? 'w-24 h-24' : 'w-16 h-16'} object-contain`}
                        />
                    ) : (
                        <div className={`${isCurrent ? 'w-24 h-24' : 'w-16 h-16'} rounded-full flex items-center justify-center text-lg`} style={{ backgroundColor: colors.cardLight }}>?</div>
                    )}
                </div>
                <p className={`capitalize font-semibold mt-1 text-center truncate ${isCurrent ? 'text-sm max-w-[96px]' : 'text-[11px] max-w-[64px]'}`}
                   style={{ color: isCurrent ? typeColors[primaryType] : colors.textMuted }}>
                    {evo.name.replace(/-/g, ' ')}
                </p>
                {!isCurrent && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full font-medium mt-0.5"
                        style={{ backgroundColor: colors.cardLight, color: colors.textMuted }}>
                        {evo.genIntroduced}
                    </span>
                )}
            </div>
        );

        return (
            <div 
                className="group rounded-2xl overflow-hidden"
                style={{ 
                    backgroundColor: colors.card,
                    border: `3px solid ${typeColors[primaryType]}`
                }}
            >
                {/* Header with Evolution Chain */}
                <div className="relative p-4" style={{ backgroundColor: typeColors[primaryType] + '10' }}>
                    {/* Name & Info Row */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: colors.card, color: colors.textMuted }}>
                                #{String(pokemon.id).padStart(3, '0')}
                            </span>
                            <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ backgroundColor: typeColors[primaryType] + '30', color: typeColors[primaryType] }}>
                                {pokemon.generation}
                            </span>
                        </div>
                        <div className="flex gap-1.5">
                            {pokemon.types.map(type => (
                                <span 
                                    key={type} 
                                    className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white uppercase"
                                    style={{ backgroundColor: typeColors[type] }}
                                >
                                    {type}
                                </span>
                            ))}
                        </div>
                    </div>
                    
                    {/* Pokemon Name */}
                    <h3 className="text-lg font-bold capitalize text-center mb-3" style={{ color: colors.text }}>
                        {pokemon.name.replace(/-/g, ' ')}
                    </h3>
                    
                    {/* Evolution Chain in Header */}
                    <div className="flex items-center justify-center gap-2">
                        {/* Pre-evolutions (left side) */}
                        {preEvolutions.length > 0 && (
                            <>
                                <div className="flex items-center gap-1">
                                    {preEvolutions.map((evo, idx) => (
                                        <React.Fragment key={evo.id}>
                                            <EvolutionSprite evo={evo} isCurrent={false} />
                                            {idx < preEvolutions.length - 1 && (
                                                <span className="text-sm" style={{ color: colors.textMuted }}>→</span>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                                <span className="text-lg mx-1" style={{ color: colors.textMuted }}>→</span>
                            </>
                        )}
                        
                        {/* Current Pokemon (center, larger) */}
                        {pokemon.evolutions && pokemon.evolutions.length > 0 ? (
                            <EvolutionSprite 
                                evo={pokemon.evolutions.find(e => parseInt(e.id) === pokemon.id) || { id: pokemon.id, name: pokemon.name }} 
                                isCurrent={true} 
                            />
                        ) : (
                            <div 
                                className="rounded-xl p-1"
                                style={{ 
                                    backgroundColor: typeColors[primaryType] + '20',
                                    border: `3px solid ${typeColors[primaryType]}`
                                }}
                            >
                                <img 
                                    src={pokemon.sprite || POKEBALL_PLACEHOLDER_URL} 
                                    alt={pokemon.name}
                                    className="w-24 h-24 object-contain"
                                    onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                />
                            </div>
                        )}
                        
                        {/* Post-evolutions (right side) */}
                        {postEvolutions.length > 0 && (
                            <>
                                <span className="text-lg mx-1" style={{ color: colors.textMuted }}>→</span>
                                <div className="flex items-center gap-1">
                                    {postEvolutions.map((evo, idx) => (
                                        <React.Fragment key={evo.id}>
                                            <EvolutionSprite evo={evo} isCurrent={false} />
                                            {idx < postEvolutions.length - 1 && (
                                                <span className="text-sm" style={{ color: colors.textMuted }}>→</span>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
                
                {/* Content - Compact */}
                <div className="px-4 pb-4 pt-3 space-y-3">
                    {/* Height & Weight - Compact Row */}
                    <div className="flex gap-2">
                        <div className="flex-1 p-2.5 rounded-xl text-center" style={{ backgroundColor: colors.cardLight }}>
                            <p className="text-[9px] uppercase tracking-wider font-medium" style={{ color: colors.textMuted }}>Height</p>
                            <p className="text-base font-bold" style={{ color: colors.text }}>
                                {pokemon.height}<span className="text-xs font-normal opacity-60">m</span>
                            </p>
                        </div>
                        <div className="flex-1 p-2.5 rounded-xl text-center" style={{ backgroundColor: colors.cardLight }}>
                            <p className="text-[9px] uppercase tracking-wider font-medium" style={{ color: colors.textMuted }}>Weight</p>
                            <p className="text-base font-bold" style={{ color: colors.text }}>
                                {pokemon.weight}<span className="text-xs font-normal opacity-60">kg</span>
                            </p>
                        </div>
                    </div>
                    
                    {/* Habitat & Legendary Status - New Row */}
                    <div className="flex gap-2">
                        <div className="flex-1 p-2.5 rounded-xl text-center" style={{ backgroundColor: colors.cardLight }}>
                            <p className="text-[9px] uppercase tracking-wider font-medium" style={{ color: colors.textMuted }}>Habitat</p>
                            <p className="text-sm font-bold capitalize" style={{ color: colors.text }}>
                                {pokemon.habitat?.replace(/-/g, ' ') || 'Unknown'}
                            </p>
                        </div>
                        <div className="flex-1 p-2.5 rounded-xl text-center" style={{ backgroundColor: colors.cardLight }}>
                            <p className="text-[9px] uppercase tracking-wider font-medium" style={{ color: colors.textMuted }}>Status</p>
                            <p className="text-sm font-bold" style={{ 
                                color: pokemon.isLegendary ? '#FFD700' : pokemon.isMythical ? '#DA70D6' : colors.text 
                            }}>
                                {pokemon.isLegendary ? '⭐ Legendary' : pokemon.isMythical ? '✨ Mythical' : 'Regular'}
                            </p>
                        </div>
                    </div>
                    
                    {/* Forms - Compact */}
                    {pokemon.forms && pokemon.forms.length > 0 && (formsFilter === 'all' || formsFilter === 'with-forms') && (
                        <div className="p-3 rounded-xl" style={{ backgroundColor: colors.cardLight }}>
                            <p className="text-[9px] uppercase tracking-wider text-center mb-2 font-medium" style={{ color: colors.textMuted }}>
                                Forms ({pokemon.forms.length})
                            </p>
                            <div className="flex flex-wrap justify-center gap-2">
                                {pokemon.forms.slice(0, 4).map(form => (
                                    <div key={form.name} className="text-center">
                                        {form.sprite && (
                                            <img src={form.sprite} alt={form.name} className="w-10 h-10 mx-auto"/>
                                        )}
                                        <p className="text-[9px] capitalize mt-0.5 max-w-[50px] truncate" style={{ color: colors.text }}>
                                            {form.name.replace(pokemon.name + '-', '').replace(/-/g, ' ')}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Abilities - Compact */}
                    <div className="p-3 rounded-xl" style={{ backgroundColor: colors.cardLight }}>
                        <p className="text-[9px] uppercase tracking-wider text-center mb-2 font-medium" style={{ color: colors.textMuted }}>
                            Abilities
                        </p>
                        <div className="flex flex-wrap justify-center gap-1.5">
                            {pokemon.abilities.map((ability, idx) => (
                                <span 
                                    key={ability} 
                                    className="text-[11px] px-2.5 py-1 rounded-full capitalize font-medium"
                                    style={{ backgroundColor: idx === 0 ? typeColors[primaryType] : colors.card, color: idx === 0 ? 'white' : colors.text }}
                                >
                                    {ability.replace(/-/g, ' ')}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <main className="space-y-6">
            {/* Filters Section */}
            <section className="p-6 rounded-xl shadow-lg" style={{ backgroundColor: colors.card }}>
                <h2 className="text-lg md:text-xl font-bold mb-4" style={{ fontFamily: "'Press Start 2P'", color: colors.text }}>
                    Random Pokémon Generator
                </h2>
                
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <label className="text-sm whitespace-nowrap" style={{ color: colors.text }}>Generate</label>
                        <select 
                            value={pokemonCount} 
                            onChange={(e) => setPokemonCount(parseInt(e.target.value))}
                            className="w-16 p-2 rounded-lg"
                            style={{ backgroundColor: colors.cardLight, color: colors.text }}
                        >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12].map(n => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                        <span className="text-sm" style={{ color: colors.text }}>Pokémon</span>
                    </div>
                    
                    <select 
                        value={selectedRegion} 
                        onChange={(e) => setSelectedRegion(e.target.value)}
                        className="p-2 rounded-lg capitalize"
                        style={{ backgroundColor: colors.cardLight, color: colors.text }}
                    >
                        <option value="all">All Regions</option>
                        {Object.keys(GENERATION_RANGES).filter(g => g !== 'all').map(gen => (
                            <option key={gen} value={gen} className="capitalize">
                                {gen.replace('generation-', 'Gen ').replace('-', ' ')}
                            </option>
                        ))}
                    </select>
                    
                    <select 
                        value={selectedType} 
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="p-2 rounded-lg capitalize"
                        style={{ backgroundColor: colors.cardLight, color: colors.text }}
                    >
                        <option value="all">All Types</option>
                        {Object.keys(typeColors).map(type => (
                            <option key={type} value={type} className="capitalize">{type}</option>
                        ))}
                    </select>
                    
                    <select 
                        value={legendaryFilter} 
                        onChange={(e) => setLegendaryFilter(e.target.value)}
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: colors.cardLight, color: colors.text }}
                    >
                        <option value="all">All Legendaries</option>
                        <option value="legendary">Legendaries Only</option>
                        <option value="non-legendary">No Legendaries</option>
                    </select>
                    
                    <select 
                        value={fullyEvolvedFilter} 
                        onChange={(e) => setFullyEvolvedFilter(e.target.value)}
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: colors.cardLight, color: colors.text }}
                    >
                        <option value="all">Fully Evolved or Not</option>
                        <option value="fully-evolved">Fully Evolved Only</option>
                        <option value="not-fully-evolved">Not Fully Evolved</option>
                    </select>
                    
                    <select 
                        value={formsFilter} 
                        onChange={(e) => setFormsFilter(e.target.value)}
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: colors.cardLight, color: colors.text }}
                    >
                        <option value="all">All Forms</option>
                        <option value="with-forms">Show Forms</option>
                        <option value="no-forms">Hide Forms</option>
                    </select>
                    
                    <button 
                        onClick={generateRandomPokemon}
                        disabled={isLoading}
                        className="px-6 py-2 rounded-lg font-bold text-white transition-colors hover:opacity-90 disabled:opacity-50"
                        style={{ backgroundColor: colors.primary }}
                    >
                        {isLoading ? 'Generating...' : 'Generate'}
                    </button>
                </div>
            </section>
            
            {/* Results Section */}
            <section className="p-6 rounded-xl shadow-lg" style={{ backgroundColor: colors.card }}>
                {isLoading ? (
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: pokemonCount }).map((_, i) => (
                            <div key={i} className="rounded-2xl overflow-hidden animate-pulse" style={{ backgroundColor: colors.cardLight }}>
                                <div className="h-40 relative" style={{ backgroundColor: colors.card }}>
                                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                                </div>
                                <div className="p-4 space-y-3">
                                    <div className="h-4 rounded w-2/3 mx-auto" style={{ backgroundColor: colors.card }}></div>
                                    <div className="flex gap-2 justify-center">
                                        <div className="h-6 w-16 rounded-full" style={{ backgroundColor: colors.card }}></div>
                                        <div className="h-6 w-16 rounded-full" style={{ backgroundColor: colors.card }}></div>
                                    </div>
                                    <div className="h-20 rounded" style={{ backgroundColor: colors.card }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : generatedPokemon.length > 0 ? (
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        {generatedPokemon.map(pokemon => (
                            <PokemonDetailCard key={pokemon.id} pokemon={pokemon} />
                        ))}
                    </div>
                ) : (
                    <p className="text-center py-8" style={{ color: colors.textMuted }}>
                        No Pokémon found with the selected filters. Try adjusting your criteria.
                    </p>
                )}
            </section>
        </main>
    );
};

export default function App() {
    // React Router hooks
    const navigate = useNavigate();
    const location = useLocation();
    
    // Theme State
    const [theme, setTheme] = useState('light');
    const colors = THEMES[theme];
    
    // Greeting Pokemon State
    const [greetingPokemonId, setGreetingPokemonId] = useState(null);
    const [showGreetingPokemonSelector, setShowGreetingPokemonSelector] = useState(false);

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
    
    // Favorite Pokemons State
    const [favoritePokemons, setFavoritePokemons] = useState(new Set());
    const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
    const [pokedexShowOnlyFavorites, setPokedexShowOnlyFavorites] = useState(false);
    
    // UI States (revisados para nova lógica de loading)
    const [isLoading, setIsLoading] = useState(true); // Loading inicial ou de filtro
    const [isFetchingMore, setIsFetchingMore] = useState(false); // Loading do scroll infinito
    const [toasts, setToasts] = useState([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [teamSearchTerm, setTeamSearchTerm] = useState('');
    const [modalPokemon, setModalPokemon] = useState(null);
    const [editingTeamMember, setEditingTeamMember] = useState(null);
    const [maxToasts, setMaxToasts] = useState(3);
    const [suggestedPokemonIds, setSuggestedPokemonIds] = useState(new Set());
    const [sharedTeamLoaded, setSharedTeamLoaded] = useState(false);
    const [showPatchNotes, setShowPatchNotes] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, teamId: null, teamName: '' });
    
    // Check if patch notes should be shown (only once per version)
    useEffect(() => {
        const seenVersion = localStorage.getItem('patchNotesVersion');
        if (seenVersion !== PATCH_NOTES_VERSION) {
            setShowPatchNotes(true);
        }
    }, []);

    const handleClosePatchNotes = useCallback(() => {
        localStorage.setItem('patchNotesVersion', PATCH_NOTES_VERSION);
        setShowPatchNotes(false);
    }, []);
    
    // Derive currentPage from URL path for backward compatibility
    const currentPage = useMemo(() => {
        const path = location.pathname;
        if (path.includes('/pokedex')) return 'pokedex';
        if (path.includes('/teams')) return 'allTeams';
        if (path.includes('/generator')) return 'randomGenerator';
        if (path.includes('/favorites')) return 'favorites';
        if (path.includes('/builder')) return 'builder';
        return 'home';
    }, [location.pathname]);

    // Get page title and subtitle based on current route
    const pageInfo = useMemo(() => {
        const pages = {
            'home': { title: 'Home', icon: '', subtitle: 'Welcome back, Trainer!' },
            'builder': { title: 'Pokémon Team Builder', icon: '', subtitle: 'Build your perfect team' },
            'pokedex': { title: 'Pokédex', icon: '', subtitle: 'Explore all Pokémon' },
            'allTeams': { title: 'Saved Teams', icon: '', subtitle: 'Your team collection' },
            'randomGenerator': { title: 'Random Generator', icon: '', subtitle: 'Discover new Pokémon' },
            'favorites': { title: 'Favorite Pokémon', icon: '', subtitle: 'Your favorite collection' }
        };
        return pages[currentPage] || pages['home'];
    }, [currentPage]);

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

    // Listener para Pokémons favoritos
    useEffect(() => {
        if (!db || !userId) return;

        const favoritesDocRef = doc(db, `artifacts/${appId}/users/${userId}/favorites`, 'pokemons');

        const unsubscribe = onSnapshot(favoritesDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setFavoritePokemons(new Set(data.ids || []));
            } else {
                setFavoritePokemons(new Set());
            }
        }, (error) => {
            console.error("Error listening to favorite pokemons:", error);
        });

        return () => unsubscribe();

    }, [db, userId]);    

    // Busca dados estáticos (gens, items, natures) uma vez no início
    useEffect(() => {
        const fetchStaticData = async () => {
             try {
                const genRes = await fetch(`${POKEAPI_BASE_URL}/generation`);
                const genData = await genRes.json();
                setGenerations(genData.results.map(g => g.name));

                const itemRes = await fetch(`${POKEAPI_BASE_URL}/item?limit=2000`);
                const itemData = await itemRes.json();
                setItems(itemData.results);
                
                const natureRes = await fetch(`${POKEAPI_BASE_URL}/nature`);
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
        if(!db || sharedTeamLoaded) return;
        setSharedTeamLoaded(true);
        showToast("Loading shared team...", "info");
        const teamDocRef = doc(db, `artifacts/${appId}/public/data/teams`, teamId);
        try {
            const teamDoc = await getDoc(teamDocRef);
            if (teamDoc.exists()) {
                const teamData = teamDoc.data();
                const detailsPromises = teamData.pokemons.map(p => fetchPokemonDetails(p.id));
                const teamPokemonDetails = await Promise.all(detailsPromises);
                
                const customizedTeam = teamPokemonDetails.map((detail, i) => ({
                    ...detail,
                    instanceId: teamData.pokemons[i].instanceId, // Make sure instanceId is loaded
                    customization: teamData.pokemons[i].customization
                }));

                setCurrentTeam(customizedTeam.filter(Boolean));
                setTeamName(teamData.name);
                setEditingTeamId(null);
                showToast(`Loaded team: ${teamData.name}`, "success");
            } else {
                showToast("Shared team not found.", "error");
            }
        } catch (error) {
            showToast("Failed to load shared team.", "error");
        }
    }, [db, showToast, sharedTeamLoaded]);

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
        navigate('/builder');
        setIsSidebarOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [fetchPokemonDetails, showToast, navigate]);

    // Request delete confirmation
    const requestDeleteTeam = useCallback((teamId, teamName) => {
        setDeleteConfirmation({ isOpen: true, teamId, teamName });
    }, []);

    // Actually delete the team (called after confirmation)
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

    const handleToggleFavoritePokemon = useCallback(async (pokemonId) => {
        if (!db || !userId) return;
        
        const favoritesDocRef = doc(db, `artifacts/${appId}/users/${userId}/favorites`, 'pokemons');
        
        try {
            const newFavorites = new Set(favoritePokemons);
            if (newFavorites.has(pokemonId)) {
                newFavorites.delete(pokemonId);
                showToast("Removed from favorites!", "info");
            } else {
                newFavorites.add(pokemonId);
                showToast("Added to favorites!", "success");
            }
            
            await setDoc(favoritesDocRef, { 
                ids: Array.from(newFavorites),
                updatedAt: new Date().toISOString()
            });
        } catch (e) { 
            console.error("Error toggling favorite pokemon:", e);
            showToast("Could not update favorite status.", 'error'); 
        }
    }, [db, userId, favoritePokemons, showToast]);

    const handleTypeSelection = useCallback((type) => {
        const typeStateSetter = currentPage === 'pokedex' ? setPokedexSelectedTypes : setSelectedTypes;
        typeStateSetter(prev => {
            const newTypes = new Set(prev);
            newTypes.has(type) ? newTypes.delete(type) : newTypes.add(type);
            return newTypes;
        });
    }, [currentPage]);

    const handleNavigateWithTypeFilter = useCallback((type) => {
        setPokedexSelectedTypes(new Set([type]));
        // Navigate to pokedex
        navigate('/pokedex');
    }, [navigate]);
    
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
    
    const setGreetingPokemon = useCallback((pokemonId) => {
        setGreetingPokemonId(pokemonId);
        if (pokemonId) {
            localStorage.setItem('greetingPokemon', pokemonId.toString());
        } else {
            localStorage.removeItem('greetingPokemon');
        }
        setShowGreetingPokemonSelector(false);
    }, []);
    
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            setTheme(savedTheme); 
        }
        
        const savedGreetingPokemon = localStorage.getItem('greetingPokemon');
        if (savedGreetingPokemon) {
            setGreetingPokemonId(parseInt(savedGreetingPokemon, 10));
        }
    }, []);

    const renderRoutes = () => {
        return (
            <Routes>
                <Route path="/teams" element={
                    <AllTeamsView 
                        teams={savedTeams} 
                        onEdit={handleEditTeam} 
                        requestDelete={requestDeleteTeam} 
                        onToggleFavorite={handleToggleFavorite} 
                        searchTerm={teamSearchTerm} 
                        setSearchTerm={setTeamSearchTerm} 
                        colors={colors} 
                    />
                } />
                <Route path="/pokedex" element={
                    <PokedexView 
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
                        favoritePokemons={favoritePokemons}
                        onToggleFavoritePokemon={handleToggleFavoritePokemon}
                        showOnlyFavorites={pokedexShowOnlyFavorites}
                        setShowOnlyFavorites={setPokedexShowOnlyFavorites}
                    />
                } />
                <Route path="/favorites" element={
                    <FavoritePokemonsView 
                        allPokemons={pokemons}
                        favoritePokemons={favoritePokemons}
                        onToggleFavoritePokemon={handleToggleFavoritePokemon}
                        showDetails={showDetails}
                        colors={colors}
                        onAddToTeam={handleAddPokemonToTeam}
                        isLoading={isLoading}
                    />
                } />
                <Route path="/generator" element={
                    <RandomGeneratorView 
                        colors={colors}
                        generations={generations}
                    />
                } />
                <Route path="/builder" element={
                    <TeamBuilderView
                        currentTeam={currentTeam}
                        teamName={teamName}
                        setTeamName={setTeamName}
                        handleRemoveFromTeam={handleRemoveFromTeam}
                        handleSaveTeam={handleSaveTeam}
                        editingTeamId={editingTeamId}
                        handleClearTeam={handleClearTeam}
                        recentTeams={recentTeams}
                        onNavigateToTeams={() => navigate('/teams')}
                        handleToggleFavorite={handleToggleFavorite}
                        handleEditTeam={handleEditTeam}
                        requestDeleteTeam={requestDeleteTeam}
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
                        favoritePokemons={favoritePokemons}
                        onToggleFavoritePokemon={handleToggleFavoritePokemon}
                        showOnlyFavorites={showOnlyFavorites}
                        setShowOnlyFavorites={setShowOnlyFavorites}
                    />
                } />
                <Route path="/" element={
                    <HomeView
                        colors={colors}
                        navigate={navigate}
                        savedTeams={savedTeams}
                        favoritePokemons={favoritePokemons}
                        allPokemons={pokemons}
                        recentTeams={recentTeams}
                        showDetails={showDetails}
                        onToggleFavoritePokemon={handleToggleFavoritePokemon}
                        handleEditTeam={handleEditTeam}
                        greetingPokemonId={greetingPokemonId}
                        onOpenPokemonSelector={() => setShowGreetingPokemonSelector(true)}
                        db={db}
                        theme={theme}
                        onNavigateWithTypeFilter={handleNavigateWithTypeFilter}
                    />
                } />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        );
    };
    
    return (
      <div className="min-h-screen font-sans" style={{ backgroundColor: colors.background, color: colors.text }}>
        {modalPokemon && <PokemonDetailModal pokemon={modalPokemon} onClose={() => setModalPokemon(null)} onAdd={currentPage === 'builder' ? handleAddPokemonToTeam : null} currentTeam={currentTeam} colors={colors} showPokemonDetails={showDetails} pokemonDetailsCache={pokemonDetailsCache} db={db} isFavorite={favoritePokemons.has(modalPokemon.id)} onToggleFavorite={handleToggleFavoritePokemon} />}
        {editingTeamMember && <TeamPokemonEditorModal pokemon={editingTeamMember} onClose={() => setEditingTeamMember(null)} onSave={handleUpdateTeamMember} colors={colors} items={items} natures={natures} moveDetailsCache={moveDetailsCache}/>}
        {showPatchNotes && <PatchNotesModal onClose={handleClosePatchNotes} colors={colors} />}
        {showGreetingPokemonSelector && <GreetingPokemonSelectorModal onClose={() => setShowGreetingPokemonSelector(false)} onSelect={setGreetingPokemon} allPokemons={pokemons} currentPokemonId={greetingPokemonId} colors={colors} db={db} />}
        
        {/* Delete Confirmation Dialog */}
        <ConfirmDialog 
            isOpen={deleteConfirmation.isOpen}
            onClose={() => setDeleteConfirmation({ isOpen: false, teamId: null, teamName: '' })}
            onConfirm={() => handleDeleteTeam(deleteConfirmation.teamId)}
            title="Erase the Team? 😢"
            message={`Are you sure you want to delete "${deleteConfirmation.teamName}"? They could be so great...`}
            confirmText="Yeah don't care"
            colors={colors}
        />
        
        <div className="fixed top-5 right-5 z-50 space-y-2">{toasts.slice(0, maxToasts).map(toast => ( <div key={toast.id} className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg text-white animate-fade-in-out ${toast.type === 'success' ? 'bg-green-600' : toast.type === 'warning' ? 'bg-yellow-600' : toast.type === 'info' ? 'bg-blue-600' : 'bg-red-600'}`}>{toast.type === 'success' && <SuccessToastIcon />}{toast.type === 'error' && <ErrorToastIcon />}{toast.type === 'warning' && <WarningToastIcon />}{toast.message}</div> ))}</div>
        <div className="flex min-h-screen">
            <aside 
                className={`fixed lg:relative lg:translate-x-0 inset-y-0 left-0 z-40 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'lg:w-20' : 'w-64'} ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} 
                style={{
                    backgroundColor: colors.card,
                    borderRight: theme === 'light' ? '1px solid #E5E7EB' : 'none'
                }}
            >
                <div className="flex flex-col h-full">
                  <div className={`flex items-center h-16 p-4 ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
                    <h2 className={`text-xl font-bold transition-opacity duration-200 whitespace-nowrap ${isSidebarCollapsed ? 'lg:opacity-0 lg:hidden' : 'opacity-100'}`} style={{fontFamily: "'Press Start 2P'", color: colors.primary}}>Menu</h2>
                    <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-1 rounded-lg hidden lg:block transition-colors hover:opacity-80" style={{color: colors.textMuted}}>{isSidebarCollapsed ? <CollapseRightIcon /> : <CollapseLeftIcon />}</button>
                  </div>
                  <nav className="px-4 flex-grow">
                    <ul>
                      <li>
                        <button onClick={() => { navigate('/'); setIsSidebarOpen(false); }} className={`w-full p-3 rounded-lg font-bold flex items-center transition-colors hover:bg-purple-500/60 ${currentPage === 'home' ? 'bg-primary' : ''} ${isSidebarCollapsed ? 'justify-center' : ''}`} style={{color: currentPage === 'home' ? 'white' : colors.text}}>
                          <HomeIcon />
                          <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-0 lg:ml-0 opacity-0' : 'w-auto ml-3 opacity-100'}`}>Home</span>
                        </button>
                      </li>
                      <li className="mt-2">
                        <button onClick={() => { navigate('/builder'); setIsSidebarOpen(false); }} className={`w-full p-3 rounded-lg font-bold flex items-center transition-colors hover:bg-purple-500/60 ${currentPage === 'builder' ? 'bg-primary' : ''} ${isSidebarCollapsed ? 'justify-center' : ''}`} style={{color: currentPage === 'builder' ? 'white' : colors.text}}>
                          <SwordsIcon />
                          <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-0 lg:ml-0 opacity-0' : 'w-auto ml-3 opacity-100'}`}>Team Builder</span>
                        </button>
                      </li>
                       <li className="mt-2">
                        <button onClick={() => { navigate('/pokedex'); setIsSidebarOpen(false); }} className={`w-full p-3 rounded-lg font-bold flex items-center transition-colors hover:bg-purple-500/60 ${currentPage === 'pokedex' ? 'bg-primary' : ''} ${isSidebarCollapsed ? 'justify-center' : ''}`} style={{color: currentPage === 'pokedex' ? 'white' : colors.text}}>
                            <PokeballIcon />
                          <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-0 lg:ml-0 opacity-0' : 'w-auto ml-3 opacity-100'}`}>Pokédex</span>
                        </button>
                      </li>
                      <li className="mt-2">
                        <button onClick={() => { navigate('/generator'); setIsSidebarOpen(false); }} className={`w-full p-3 rounded-lg font-bold flex items-center transition-colors hover:bg-purple-500/60 ${currentPage === 'randomGenerator' ? 'bg-primary' : ''} ${isSidebarCollapsed ? 'justify-center' : ''}`} style={{color: currentPage === 'randomGenerator' ? 'white' : colors.text}}>
                            <DiceIcon />
                          <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-0 lg:ml-0 opacity-0' : 'w-auto ml-3 opacity-100'}`}>Random Generator</span>
                        </button>
                      </li>
                      <li className="mt-2">
                        <button onClick={() => { navigate('/favorites'); setIsSidebarOpen(false); }} className={`w-full p-3 rounded-lg font-bold flex items-center transition-colors hover:bg-purple-500/60 ${currentPage === 'favorites' ? 'bg-primary' : ''} ${isSidebarCollapsed ? 'justify-center' : ''}`} style={{color: currentPage === 'favorites' ? 'white' : colors.text}}>
                            <StarsIcon className="w-6 h-6 shrink-0" isFavorite={true} color={currentPage === 'favorites' ? 'white' : colors.text} />
                          <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-0 lg:ml-0 opacity-0' : 'w-auto ml-3 opacity-100'}`}>Favorites</span>
                        </button>
                      </li>
                      <li className="mt-2">
                        <button onClick={() => { navigate('/teams'); setIsSidebarOpen(false); }} className={`w-full p-3 mt-2 rounded-lg font-bold flex items-center transition-colors hover:bg-purple-500/60 ${currentPage === 'allTeams' ? 'bg-primary' : ''} ${isSidebarCollapsed ? 'justify-center' : ''}`} style={{color: currentPage === 'allTeams' ? 'white' : colors.text}}>
                          <SavedTeamsIcon/>
                          <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-0 lg:ml-0 opacity-0' : 'w-auto ml-3 opacity-100'}`}>Saved Teams</span>
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
            </aside>
            <div className="flex-1 min-w-0">
                <header 
                    className="relative flex items-center justify-between pt-4 px-4 h-24"
                    style={{
                        borderBottom: theme === 'light' ? '1px solid #E5E7EB' : 'none'
                    }}
                >
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="lg:hidden p-2 rounded-md"
                    style={{ backgroundColor: colors.cardLight, color: colors.text }}
                >
                    {isSidebarOpen ? <CloseIcon /> : <MenuIcon />}
                </button>

                <div className="flex-1 text-center px-2 marginLeft">
                    <div className="flex items-center justify-center gap-2">
                        <span className="text-xl sm:text-2xl lg:text-3xl">{pageInfo.icon}</span>
                        <h1
                        className="text-xs sm:text-base lg:text-2xl font-bold tracking-wider truncate"
                        style={{ fontFamily: "'Press Start 2P'", color: colors.primary }}
                        >
                        {pageInfo.title}
                        </h1>
                    </div>
                    <p
                    className="text-[10px] sm:text-xs md:text-sm mt-1 truncate opacity-70"
                    style={{ color: colors.textMuted }}
                    >
                    {pageInfo.subtitle}
                    </p>
                </div>

                <div className="flex items-center gap-2 lg:mr-4 sm:mr-0">
                    <button onClick={toggleTheme} className="p-2 rounded-md" style={{ backgroundColor: colors.cardLight, color: colors.text }}>
                        {theme === 'dark' ? <SunIcon color={colors.text} /> : <MoonIcon color={colors.text} />}
                    </button>
                </div>

                </header>
                <div className="p-4 sm:p-6 lg:p-8 lg:py-4">{renderRoutes()}</div>
                <footer className="text-center mt-8 py-6 border-t" style={{borderColor: colors.cardLight}}>
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
        <style>{` 
            @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap'); 
            
            .custom-scrollbar::-webkit-scrollbar { width: 12px; } 
            .custom-scrollbar::-webkit-scrollbar-track { background: var(--scrollbar-track-color); } 
            .custom-scrollbar::-webkit-scrollbar-thumb { background-color: var(--scrollbar-thumb-color); border-radius: 20px; border: 3px solid var(--scrollbar-thumb-border-color); } 
            
            @keyframes fade-in { 
                from { opacity: 0; transform: scale(0.95); } 
                to { opacity: 1; transform: scale(1); } 
            } 
            
            @keyframes scale-in { 
                from { opacity: 0; transform: scale(0.9); } 
                to { opacity: 1; transform: scale(1); } 
            }
            
            @keyframes slide-up { 
                from { opacity: 0; transform: translateY(20px); } 
                to { opacity: 1; transform: translateY(0); } 
            }
            
            @keyframes shimmer {
                100% { transform: translateX(100%); }
            }
            
            .animate-fade-in { animation: fade-in 0.2s ease-out forwards; } 
            .animate-scale-in { animation: scale-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
            .animate-slide-up { animation: slide-up 0.3s ease-out forwards; }
            
            .image-pixelated { image-rendering: pixelated; } 
            .bg-primary { background-color: ${colors.primary}; } 
            
            input[type="checkbox"]:checked + div + div { transform: translateX(100%); background-color: ${colors.primary}; }
            
            /* Glassmorphism card effect */
            .glass-card {
                background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.1);
            }
            
            /* Button hover effects */
            .btn-interactive {
                transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            .btn-interactive:hover {
                transform: scale(1.03);
            }
            .btn-interactive:active {
                transform: scale(0.97);
            }
        `}</style>
      </div>
    );
}
