import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, setDoc, onSnapshot, deleteDoc, query } from 'firebase/firestore';
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
const COLORS = { primary: '#7d65e1', background: '#111827', card: '#1F2937', cardLight: '#374151', text: '#FFFFFF', textMuted: '#9CA3AF' };
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
const GithubIcon = () => (<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.168 6.839 9.492.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.031-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.378.203 2.398.1 2.651.64.7 1.03 1.595 1.03 2.688 0 3.848-2.338 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.001 10.001 0 0022 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" /></svg>);
const LinkedinIcon = () => (<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>);
const StarIcon = ({ className = "w-6 h-6", isFavorite }) => ( <svg className={className} fill={isFavorite ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: isFavorite ? '#FBBF24' : COLORS.textMuted }}> <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.95-.69l1.519-4.674z" /> </svg> );
const TrashIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"> <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /> </svg> );
const ClearIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"> <path fillRule="evenodd" clipRule="evenodd" d="M10 8.586l3.95-3.95a1 1 0 111.414 1.414L11.414 10l3.95 3.95a1 1 0 01-1.414 1.414L10 11.414l-3.95 3.95a1 1 0 01-1.414-1.414L8.586 10l-3.95-3.95a1 1 0 011.414-1.414L10 8.586z" /></svg>);
const SaveIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /> </svg> );
const PlusIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"> <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /> </svg> );
const MenuIcon = () => (<svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>);
const CloseIcon = () => (<svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>);
const InfoIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>);
const PokeballIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24"  height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-pokeball shrink-0"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /><path d="M3 12h6" /><path d="M15 12h6" /></svg>);
const AllTeamsIcon = () => (<svg className="w-6 h-6 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>);
const CollapseLeftIcon = () => (<svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>);
const CollapseRightIcon = () => (<svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>);
const ShareIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.35a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" /></svg>);
const SuccessToastIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 7.2a2.2 2.2 0 0 1 2.2 -2.2h1a2.2 2.2 0 0 0 1.55 -.64l.7 -.7a2.2 2.2 0 0 1 3.12 0l.7 .7c.412 .41 .97 .64 1.55 .64h1a2.2 2.2 0 0 1 2.2 2.2v1c0 .58 .23 1.138 .64 1.55l.7 .7a2.2 2.2 0 0 1 0 3.12l-.7 .7a2.2 2.2 0 0 0 -.64 1.55v1a2.2 2.2 0 0 1 -2.2 2.2h-1a2.2 2.2 0 0 0 -1.55 .64l-.7 .7a2.2 2.2 0 0 1 -3.12 0l-.7 -.7a2.2 2.2 0 0 0 -1.55 -.64h-1a2.2 2.2 0 0 1 -2.2 -2.2v-1a2.2 2.2 0 0 0 -.64 -1.55l-.7 -.7a2.2 2.2 0 0 1 0 -3.12l.7 -.7a2.2 2.2 0 0 0 .64 -1.55v-1" /><path d="M9 12l2 2l4 -4" /></svg>);
const ErrorToastIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" ><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572" /><path d="M12 6l-2 4l4 3l-2 4v3" /></svg>);
const WarningToastIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>);
const TypeBadge = ({ type }) => ( <span className="text-xs font-semibold mr-1 mb-1 px-2.5 py-1 rounded-full text-white shadow-sm" style={{ backgroundColor: typeColors[type] || '#777' }}> {type.toUpperCase()} </span> );

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
const PokemonCard = React.memo(({ onAdd, onShowDetails, details, lastRef, isSuggested }) => {
    const handleCardClick = (e) => {
        e.stopPropagation();
        onAdd(details);
    };

    const handleInfoClick = (e) => {
        e.stopPropagation();
        onShowDetails(details);
    };

    if (!details) {
        return (
            <div ref={lastRef} className="rounded-lg p-3 text-center h-[172px]" style={{backgroundColor: COLORS.cardLight}}>
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
        style={{ backgroundColor: COLORS.cardLight }}
        >
        {isSuggested && <div className="absolute -top-2 -right-2 text-xs bg-green-500 text-white font-bold py-1 px-2 rounded-full z-10">Suggested</div>}
        <img
            src={details.sprite || POKEBALL_PLACEHOLDER_URL}
            onError={(e) => {
            e.currentTarget.src = POKEBALL_PLACEHOLDER_URL;
            }}
            alt={details.name}
            className="mx-auto h-24 w-24 group-hover:scale-110 transition-transform"
        />
        <p className="mt-2 text-sm font-semibold capitalize">{details.name}</p>
        <div className="flex justify-center items-center mt-1 gap-1">
            {details.types.map((type) => (
            <img key={type} src={typeIcons[type]} alt={type} className="w-5 h-5" />
            ))}
        </div>
        <button
            onClick={handleInfoClick}
            className={`
            absolute top-2 left-2 text-gray-400 hover:text-white transition-colors
            opacity-100     
            lg:opacity-0    
            lg:group-hover:opacity-100 
            lg:transition-opacity
            `}
        >
            <InfoIcon />
        </button>
        </div>
    );
});

const StatBar = ({ stat, value }) => {
    const statColors = { hp: 'bg-red-500', attack: 'bg-orange-500', defense: 'bg-yellow-500', 'special-attack': 'bg-blue-500', 'special-defense': 'bg-green-500', speed: 'bg-pink-500' };
    const width = (value / 255) * 100;
    return (
        <div className="flex items-center gap-2">
            <p className="w-1/3 text-sm font-semibold capitalize text-right">{stat.replace('-', ' ')}</p>
            <div className="w-2/3 bg-gray-600 rounded-full h-4">
                <div className={`${statColors[stat]} h-4 rounded-full text-xs text-white flex items-center justify-end pr-2`} style={{ width: `${width}%` }}>{value}</div>
            </div>
        </div>
    );
};

const PokemonDetailModal = ({ pokemon, onClose, onAdd, currentTeam }) => {
    if (!pokemon) return null;
    
    const isAlreadyOnTeam = currentTeam.some(p => p.id === pokemon.id);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg p-6 relative animate-fade-in" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"><CloseIcon /></button>
                <div className="text-center">
                    <img src={pokemon.animatedSprite || pokemon.sprite} alt={pokemon.name} className="mx-auto h-32 w-32 image-pixelated"/>
                    <h2 className="text-3xl font-bold capitalize mt-2">{pokemon.name} <span className="text-gray-400">#{pokemon.id}</span></h2>
                    <div className="flex justify-center gap-2 mt-2">
                        {pokemon.types.map(type => <TypeBadge key={type} type={type} />)}
                    </div>
                </div>
                <div className="mt-6">
                    <h3 className="text-xl font-bold mb-3 text-center">Base Stats</h3>
                    <div className="space-y-2">
                        {pokemon.stats?.map(stat => <StatBar key={stat.stat.name} stat={stat.stat.name} value={stat.base_stat} />)}
                    </div>
                </div>
                 <div className="mt-6">
                    <h3 className="text-xl font-bold mb-3 text-center">Abilities</h3>
                    <div className="text-center space-x-2">
                        {pokemon.abilities?.map(ability => <span key={ability.ability.name} className="capitalize inline-block bg-gray-700 px-3 py-1 rounded-full text-sm">{ability.ability.name.replace('-', ' ')}</span>)}
                    </div>
                </div>
                <div className="mt-8 flex justify-center" >
                     {!isAlreadyOnTeam && (
                        <button onClick={() => { onAdd(pokemon); onClose(); }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transition-colors">
                            <PlusIcon /> Add to Team
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const TeamBuilderView = ({
    currentTeam, teamName, setTeamName, handleRemoveFromTeam, handleSaveTeam, editingTeamId, handleClearTeam,
    recentTeams, setCurrentPage, handleToggleFavorite, handleEditTeam, handleShareTeam, handleDeleteTeam,
    teamAnalysis,
    searchInput, setSearchInput, selectedGeneration, setSelectedGeneration, generations,
    isInitialLoading, isFiltering,
    availablePokemons, pokemonDetailsCache, handleAddPokemonToTeam, lastPokemonElementRef, isFetchingMore, visibleCount,
    selectedTypes, handleTypeSelection, showDetails,
    suggestedPokemonIds
}) => (
    <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-3 space-y-8"> 
          <section className="p-6 rounded-xl shadow-lg" style={{backgroundColor: COLORS.card}}>
            <h2 className="text-base md:text-lg font-bold mb-4 border-b-2 pb-2" style={{fontFamily: "'Press Start 2P'", borderColor: COLORS.primary}}>Current Team</h2>
            <input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Team Name" className="w-full text-white p-3 rounded-lg border-2 focus:outline-none" style={{backgroundColor: COLORS.cardLight, borderColor: 'transparent'}}/>
            <div className="grid grid-cols-3 gap-4 min-h-[120px] p-4 rounded-lg mt-4 " style={{backgroundColor: 'rgba(0,0,0,0.2)'}}>
                {currentTeam.map(p => (
                    <div key={p.id} className="text-center relative group cursor-pointer" onClick={(e) => { e.stopPropagation(); handleRemoveFromTeam(p.id); }}>
                        <img
                        src={p.animatedSprite || p.sprite || POKEBALL_PLACEHOLDER_URL}
                        onError={(e) => { e.currentTarget.src = p.sprite || POKEBALL_PLACEHOLDER_URL }}
                        alt={p.name}
                        className="mx-auto h-20 w-20"
                        />
                        <p className="text-xs capitalize truncate">{p.name}</p>

                        <button
                        onClick={(e) => { e.stopPropagation(); showDetails(p); }}
                        className="absolute top-1 left-1 bg-gray-700 bg-opacity-50 text-white rounded-full h-5 w-5 flex items-center justify-center transition-opacity text-sm"
                        >
                        <InfoIcon />
                        </button>

                        <button
                        onClick={(e) => { e.stopPropagation(); handleRemoveFromTeam(p.id); }}
                        className="
                            absolute top-1 right-1 bg-red-600 text-white rounded-full h-5 w-5 flex items-center justify-center text-sm
                            opacity-100 visible
                            lg:opacity-0 lg:invisible
                            lg:group-hover:opacity-100 lg:group-hover:visible
                            transition-opacity duration-200
                        "
                        >
                        X
                        </button>
                    </div>
                    ))}

                {Array.from({ length: 6 - currentTeam.length }).map((_, i) => (<div key={i} className="flex items-center justify-center"><img src={POKEBALL_PLACEHOLDER_URL} alt="Empty team slot" className="w-12 h-12 opacity-40"/></div>))}
              </div>
            <div className="flex items-center gap-2 mt-4">
              <button onClick={handleSaveTeam} className="w-full flex items-center justify-center font-bold py-2 px-4 rounded-lg" style={{backgroundColor: COLORS.primary, color: COLORS.background}}> <SaveIcon /> {editingTeamId ? 'Update' : 'Save'} </button>
              <button onClick={handleShareTeam} className="p-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white" title="Share Team"><ShareIcon /></button>
              <button onClick={handleClearTeam} className="p-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white" title="Clear Team"><ClearIcon /></button>
            </div>
          </section>
          
          <section className="p-6 rounded-xl shadow-lg" style={{backgroundColor: COLORS.card}}><div className="flex justify-between items-center mb-4">
            <h2 className="text-base md:text-lg font-bold" style={{fontFamily: "'Press Start 2P'",}}>Recent Teams</h2>
            <button onClick={() => setCurrentPage('allTeams')} className="text-sm text-purple-400 hover:underline">View All</button>
            </div>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">{recentTeams.length > 0 ? recentTeams.map(team => (<div key={team.id} className="p-4 rounded-lg flex items-center justify-between transition-colors" style={{backgroundColor: COLORS.cardLight}}>
                    <div className="flex-1 min-w-0"><p className="font-bold text-lg truncate">{team.name}</p><div className="flex mt-1">{team.pokemons.map(p => <img key={p.id} src={p.sprite || POKEBALL_PLACEHOLDER_URL} onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL }} alt={p.name} className="h-8 w-8 -ml-2 border-2 rounded-full" style={{borderColor: COLORS.cardLight, backgroundColor: COLORS.card}} />)}</div>
                    </div><div className="flex items-center gap-2 flex-shrink-0 ml-2"><button onClick={() => handleToggleFavorite(team)} title="Favorite"><StarIcon isFavorite={team.isFavorite} />
                </button>
                <button onClick={() => handleEditTeam(team)} className="text-white text-xs font-bold py-1 px-3 rounded-full" style={{backgroundColor: COLORS.primary, color: COLORS.background}} >Edit</button>
            <button onClick={() => handleDeleteTeam(team.id)} className="bg-red-600 hover:bg-red-700 text-white rounded-lg"><TrashIcon /></button>
            </div>
            </div>)) : <p className="text-center py-4" style={{color: COLORS.textMuted}}>No recent teams yet.</p>}</div></section>
        </div>

        <div className="lg:col-span-6">
          <section className="p-6 rounded-xl shadow-lg h-full flex flex-col" style={{backgroundColor: COLORS.card}}>
            <div className="mb-4"><h2 className="text-lg md:text-xl font-bold mb-4" style={{fontFamily: "'Press Start 2P'",}}>Choose your Pokémon!</h2><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><input type="text" placeholder="Search Pokémon..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="w-full p-3 rounded-lg border-2 focus:outline-none" style={{backgroundColor: COLORS.cardLight, borderColor: 'transparent'}}/><select value={selectedGeneration} onChange={e => setSelectedGeneration(e.target.value)} className="w-full p-3 rounded-lg border-2 focus:outline-none appearance-none capitalize" style={{backgroundColor: COLORS.cardLight, borderColor: 'transparent'}}><option value="all">All Generations</option>{generations.map(gen => <option key={gen.name} value={gen.name} className="capitalize">{gen.name.replace('-', ' ')}</option>)}</select></div></div>
            <div className="relative flex-grow h-[60vh]">
              {isInitialLoading ? (<div className="absolute inset-0 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{borderColor: COLORS.primary}}></div></div>) : 
              (<>
                {isFiltering && <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-lg"><div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{borderColor: COLORS.primary}}></div></div>}
                <div className="h-full overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-2">
                      {availablePokemons.slice(0, visibleCount).map((pokemon, index) => <PokemonCard key={pokemon.id} details={pokemonDetailsCache[pokemon.id]} onAdd={handleAddPokemonToTeam} onShowDetails={showDetails} lastRef={index === visibleCount - 1 ? lastPokemonElementRef : null} isSuggested={suggestedPokemonIds.has(pokemon.id)} />)}
                  </div>
                  {isFetchingMore && <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{borderColor: COLORS.primary}}></div></div>}
                  {availablePokemons.length === 0 && !isFiltering && <p className="text-center py-8" style={{color: COLORS.textMuted}}>No Pokémon found with these filters. :(</p>}
                </div>
              </>)}
            </div>
          </section>
        </div>

        <div className="lg:col-span-3 space-y-8">
          <section className="p-6 rounded-xl shadow-lg" style={{backgroundColor: COLORS.card}}><h3 className="text-base md:text-lg font-bold mb-3 text-center" style={{fontFamily: "'Press Start 2P'",}}>Filter by Type</h3><div className="grid grid-cols-5 lg:grid-cols-5 gap-1.5">{Object.keys(typeColors).map(type => (<button key={type} onClick={() => handleTypeSelection(type)} className={`p-1.5 rounded-lg bg-transparent transition-colors hover:bg-gray-700/50 ${selectedTypes.has(type) ? 'ring-2 ring-white' : ''}`} title={type}><img src={typeIcons[type]} alt={type} className="w-full h-full object-contain" /></button>))}</div></section>
          {currentTeam.length > 0 && (<section className="p-6 rounded-xl shadow-lg" style={{ backgroundColor: COLORS.card }}><h3 className="text-lg md:text-xl font-bold mb-4">Team Analysis</h3><div><h4 className="font-semibold mb-2 text-green-400">Offensive Coverage:</h4><div className="flex flex-wrap gap-1">{teamAnalysis.strengths.size > 0 ? Array.from(teamAnalysis.strengths).sort().map(type => <TypeBadge key={type} type={type} />) : <p className="text-sm" style={{color: COLORS.textMuted}}>No type advantages found.</p>}</div></div><div className="mt-4"><h4 className="font-semibold mb-2 text-red-400">Defensive Weaknesses:</h4><div className="flex flex-wrap gap-1">{Object.keys(teamAnalysis.weaknesses).length > 0 ? Object.entries(teamAnalysis.weaknesses).sort(([,a],[,b]) => b-a).map(([type, score]) => (<div key={type} className="flex items-center"><TypeBadge type={type} /><span className="text-xs text-red-300">({score}x)</span></div>)) : <p className="text-sm" style={{color: COLORS.textMuted}}>Your team is rock solid!</p>}</div></div></section>)}
        </div>
      </main>
);

const AllTeamsView = ({teams, onEdit, onDelete, onToggleFavorite, searchTerm, setSearchTerm}) => (<div className="p-6 rounded-xl shadow-lg" style={{backgroundColor: COLORS.card}}><h2 className="text-2xl md:text-3xl font-bold mb-6">All Saved Teams</h2><input type="text" placeholder="Search teams by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-3 mb-6 rounded-lg border-2 focus:outline-none" style={{backgroundColor: COLORS.cardLight, borderColor: 'transparent'}}/><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">{teams.length > 0 ? teams.map(team => (<div key={team.id} className="p-4 rounded-lg flex flex-col justify-between" style={{backgroundColor: COLORS.cardLight}}><div className="flex justify-between items-start"><p className="font-bold text-xl truncate mb-2">{team.name}</p><button onClick={() => onToggleFavorite(team)} title="Favorite"><StarIcon isFavorite={team.isFavorite} /></button></div><div className="flex my-2">{team.pokemons.map(p => <img key={p.id} src={p.sprite || POKEBALL_PLACEHOLDER_URL} onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL }} alt={p.name} className="h-12 w-12 -ml-3 border-2 rounded-full" style={{borderColor: COLORS.cardLight, backgroundColor: COLORS.card}} />)}</div><div className="flex items-center gap-2 mt-auto pt-2"><button onClick={() => onEdit(team)} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">Edit</button><button onClick={() => onDelete(team.id)} className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"><TrashIcon /></button></div></div>)) : <p className="col-span-full text-center py-8" style={{color: COLORS.textMuted}}>No teams found.</p>}</div></div>);

// --- Main App Component ---
export default function App() {
    // Firebase States
    const [userId, setUserId] = useState(null);
    const [db, setDb] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false); // --- CHANGE: Added state to track auth readiness ---
    
    // Pokémon and Filter States
    const [allPokemons, setAllPokemons] = useState([]);
    const [filteredPokemons, setFilteredPokemons] = useState([]);
    const [pokemonDetailsCache, setPokemonDetailsCache] = useState({});
    const [evolutionChainCache, setEvolutionChainCache] = useState({});
    
    // Filter Controls
    const [generations, setGenerations] = useState([]);
    const [selectedGeneration, setSelectedGeneration] = useState('all');
    const [selectedTypes, setSelectedTypes] = useState(new Set());
    const [searchInput, setSearchInput] = useState('');
    const debouncedSearchTerm = useDebounce(searchInput, 300);
    
    // Team States
    const [currentTeam, setCurrentTeam] = useState([]);
    const [savedTeams, setSavedTeams] = useState([]);
    const [teamName, setTeamName] = useState('');
    const [editingTeamId, setEditingTeamId] = useState(null);
    const [teamAnalysis, setTeamAnalysis] = useState({ strengths: new Set(), weaknesses: {} });
    
    // UI States
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isFiltering, setIsFiltering] = useState(false);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [toasts, setToasts] = useState([]);
    const [currentPage, setCurrentPage] = useState('builder');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [teamSearchTerm, setTeamSearchTerm] = useState('');
    const [visibleCount, setVisibleCount] = useState(50);
    const [modalPokemon, setModalPokemon] = useState(null);
    const [maxToasts, setMaxToasts] = useState(3);
    const [suggestedPokemonIds, setSuggestedPokemonIds] = useState(new Set());
    const [likeCount, setLikeCount] = useState(0);
    const [hasLiked, setHasLiked] = useState(false);
    const [sharedTeamLoaded, setSharedTeamLoaded] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setMaxToasts(2);
            } else {
                setMaxToasts(3);
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const showToast = useCallback((message, type = 'info') => {
        const id = Date.now();
        setToasts(prevToasts => [...prevToasts, { id, message, type }]);
        setTimeout(() => setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id)), 3000);
    }, []);
    
    const availablePokemons = useMemo(() => {
        const teamIds = new Set(currentTeam.map(p => p.id));
        const available = filteredPokemons.filter(p => !teamIds.has(p.id));
        
        return available.sort((a, b) => {
            const aIsSuggested = suggestedPokemonIds.has(a.id);
            const bIsSuggested = suggestedPokemonIds.has(b.id);
            if (aIsSuggested && !bIsSuggested) return -1;
            if (!aIsSuggested && bIsSuggested) return 1;
            return a.id - b.id; 
        });
    }, [filteredPokemons, currentTeam, suggestedPokemonIds]);

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
    
    const fetchAndSetSharedTeam = useCallback(async (teamId) => {
        if(!db || sharedTeamLoaded) return;
        setSharedTeamLoaded(true); 
        showToast("Loading shared team...", "info");
        const teamDocRef = doc(db, `artifacts/${appId}/public/data/teams`, teamId);
        try {
            const teamDoc = await getDoc(teamDocRef);
            if (teamDoc.exists()) {
                const teamData = teamDoc.data();
                const detailsPromises = teamData.pokemons.map(async (p) => {
                    if (pokemonDetailsCache[p.id]) return pokemonDetailsCache[p.id];
                    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${p.id}`);
                    const d = await res.json();
                    return { id: d.id, name: d.name, sprite: d.sprites?.front_default, types: d.types.map(t => t.type.name), animatedSprite: d.sprites?.versions?.['generation-v']?.['black-white']?.animated?.front_default, stats: d.stats, abilities: d.abilities };
                });
                const teamPokemonDetails = await Promise.all(detailsPromises);
                
                setPokemonDetailsCache(prev => ({...prev, ...teamPokemonDetails.reduce((acc, p) => ({...acc, [p.id]: p}), {})}));
                setCurrentTeam(teamPokemonDetails.filter(Boolean));
                setTeamName(teamData.name);
                setEditingTeamId(null); 
                showToast(`Loaded team: ${teamData.name}`, "success");
            } else {
                showToast("Shared team not found.", "error");
            }
        } catch (error) {
            showToast("Failed to load shared team.", "error");
        }
    }, [db, pokemonDetailsCache, showToast, sharedTeamLoaded]);

    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const auth = getAuth(app);
            setDb(getFirestore(app));

            // --- CHANGE: Updated auth flow to use isAuthReady state ---
            const unsubscribe = onAuthStateChanged(auth, async (user) => {
                if (user) {
                    setUserId(user.uid);
                    setIsAuthReady(true); 
                } else {
                    try {
                        const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
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
    }, []);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const speciesListRes = await fetch('https://pokeapi.co/api/v2/pokemon-species?limit=1025');
                const speciesListData = await speciesListRes.json();

                const allVarietyPromises = speciesListData.results.map(species => 
                    fetch(species.url).then(res => res.json())
                );
                
                const allSpeciesData = await Promise.all(allVarietyPromises);
                
                const allPokemonUrls = allSpeciesData.flatMap(species => 
                    species.varieties.map(variety => ({
                        name: variety.pokemon.name,
                        url: variety.pokemon.url
                    }))
                );

                const uniqueUrls = Array.from(new Map(allPokemonUrls.map(item => [item.url, item])).values());
                const pokemonData = uniqueUrls.map(p => ({ id: parseInt(p.url.split('/')[6]), name: p.name, url: p.url }));

                setAllPokemons(pokemonData);
                setFilteredPokemons(pokemonData);
                
                const genRes = await fetch('https://pokeapi.co/api/v2/generation');
                const genData = await genRes.json();
                setGenerations(genData.results);

            } catch (e) {
                showToast("Failed to load Pokémon data.", "error");
            } finally {
                setIsInitialLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (!db || isInitialLoading || !isAuthReady) return; // --- CHANGE: Guard added for auth readiness ---
        const urlParams = new URLSearchParams(window.location.search);
        const teamId = urlParams.get('team');
        if (teamId) {
            fetchAndSetSharedTeam(teamId);
        }
    }, [db, isInitialLoading, isAuthReady, fetchAndSetSharedTeam]);


    useEffect(() => {
        const applyFilters = async () => {
            if (isInitialLoading) return;
            setIsFiltering(true);
            
            let pokemonListResult = [...allPokemons];
            const generationRanges = { 'generation-i': [1, 151], 'generation-ii': [152, 251], 'generation-iii': [252, 386], 'generation-iv': [387, 493], 'generation-v': [494, 649], 'generation-vi': [650, 721], 'generation-vii': [722, 809], 'generation-viii': [810, 905], 'generation-ix': [906, 1025] };
            
            if (selectedGeneration !== 'all' && generationRanges[selectedGeneration]) {
                const [start, end] = generationRanges[selectedGeneration];
                pokemonListResult = pokemonListResult.filter(p => p.id >= start && p.id <= end);
            }
            
            if (debouncedSearchTerm) {
                pokemonListResult = pokemonListResult.filter(p => p.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
            }

            if (selectedTypes.size > 0) {
                try {
                    const typePromises = Array.from(selectedTypes).map(type =>
                        fetch(`https://pokeapi.co/api/v2/type/${type.toLowerCase()}`).then(res => res.json())
                        .then(data => new Set(data.pokemon.map(p => p.pokemon.name)))
                    );
                    const pokemonSets = await Promise.all(typePromises);
                    const intersection = pokemonSets.reduce((acc, currentSet) => new Set([...acc].filter(name => currentSet.has(name))));
                    pokemonListResult = pokemonListResult.filter(p => intersection.has(p.name));
                } catch(e) { showToast("Failed to apply type filter.", "error"); }
            }
            
            setFilteredPokemons(pokemonListResult);
            setVisibleCount(50);
            setIsFiltering(false);
        };
        applyFilters();
    }, [selectedGeneration, selectedTypes, debouncedSearchTerm, allPokemons, isInitialLoading]);

    useEffect(() => {
        let isActive = true;
        const fetchVisiblePokemonDetails = async () => {
            const pokemonToFetch = availablePokemons.slice(0, visibleCount);
            const missingDetails = pokemonToFetch.filter(p => !pokemonDetailsCache[p.id] || !pokemonDetailsCache[p.id].evolution_chain_url);

            if (missingDetails.length === 0) return;
            setIsFetchingMore(true);

            try {
                const newDetailedPokemons = await Promise.all(missingDetails.map(p => fetch(p.url).then(res => res.json())));
                const speciesPromises = newDetailedPokemons.map(p => fetch(p.species.url).then(res => res.json()));
                const speciesData = await Promise.all(speciesPromises);

                if (!isActive) return;

                const newCacheEntries = newDetailedPokemons.reduce((acc, p, index) => {
                    acc[p.id] = { 
                        id: p.id, name: p.name, sprite: p.sprites?.front_default, 
                        animatedSprite: p.sprites?.versions?.['generation-v']?.['black-white']?.animated?.front_default,
                        types: p.types.map(t => t.type.name),
                        stats: p.stats, abilities: p.abilities,
                        evolution_chain_url: speciesData[index].evolution_chain.url
                    };
                    return acc;
                }, {});
                setPokemonDetailsCache(prevCache => ({ ...prevCache, ...newCacheEntries }));
            } catch (e) { /* silent fail */ }
            finally {
                if(isActive) setIsFetchingMore(false);
            }
        };
        
        if (availablePokemons.length > 0) fetchVisiblePokemonDetails();
        return () => { isActive = false };
    }, [availablePokemons, visibleCount, pokemonDetailsCache]);

    useEffect(() => {
        if (!userId || !db) return;
        const q = query(collection(db, `artifacts/${appId}/users/${userId}/teams`));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setSavedTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, () => showToast("Could not load saved teams.", "error"));
        return unsubscribe;
    }, [userId, db]);

    useEffect(() => {
        const teamDetails = currentTeam.map(p => pokemonDetailsCache[p.id]).filter(Boolean);
        if (teamDetails.length < currentTeam.length || teamDetails.length === 0) {
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
            
            if (weakCount > 0 && weakCount > resistanceCount) {
                teamWeaknessCounts[attackingType] = weakCount;
            }
        });
        setTeamAnalysis({ strengths: offensiveCoverage, weaknesses: teamWeaknessCounts });

        const generateSuggestions = async () => {
            const weaknessTypes = Object.keys(teamWeaknessCounts);
            if (weaknessTypes.length === 0 || allPokemons.length === 0) {
                setSuggestedPokemonIds(new Set());
                return;
            }

            const findFinalEvolution = async (chainUrl) => {
                if (evolutionChainCache[chainUrl]) {
                    return evolutionChainCache[chainUrl];
                }
                try {
                    const res = await fetch(chainUrl);
                    const data = await res.json();
                    let evoData = data.chain;
                    while (evoData && evoData.evolves_to.length > 0) {
                        evoData = evoData.evolves_to[0];
                    }
                    const finalEvoName = evoData.species.name;
                    setEvolutionChainCache(prev => ({ ...prev, [chainUrl]: finalEvoName }));
                    return finalEvoName;
                } catch {
                    return null;
                }
            };
            
            const potentialSuggestions = allPokemons.filter(p => {
                const details = pokemonDetailsCache[p.id];
                if (!details) return false;

                return weaknessTypes.some(weakType => {
                    const capitalizedWeakType = weakType.charAt(0).toUpperCase() + weakType.slice(1);
                    const typeMultiplier = details.types.reduce((multiplier, pokemonType) => {
                        return multiplier * (typeChart[pokemonType]?.damageTaken[capitalizedWeakType] ?? 1);
                    }, 1);
                    return typeMultiplier < 1;
                });
            });

            const finalEvoPromises = potentialSuggestions.map(async p => {
                const details = pokemonDetailsCache[p.id];
                return details?.evolution_chain_url ? await findFinalEvolution(details.evolution_chain_url) : null;
            });

            const finalEvoNames = await Promise.all(finalEvoPromises);
            const uniqueFinalEvoNames = [...new Set(finalEvoNames.filter(Boolean))];

            const finalEvoIds = new Set(
                uniqueFinalEvoNames
                    .map(name => allPokemons.find(p => p.name === name)?.id)
                    .filter(Boolean)
            );

            const missingSuggestionDetails = Array.from(finalEvoIds).filter(id => !pokemonDetailsCache[id]);
            if(missingSuggestionDetails.length > 0) {
                const urlsToFetch = missingSuggestionDetails.map(id => `https://pokeapi.co/api/v2/pokemon/${id}/`);
                try {
                    const newDetailedPokemons = await Promise.all(urlsToFetch.map(url => fetch(url).then(res => res.json())));
                     const newCacheEntries = newDetailedPokemons.reduce((acc, p) => {
                        acc[p.id] = { 
                            id: p.id, name: p.name, sprite: p.sprites?.front_default, 
                            animatedSprite: p.sprites?.versions?.['generation-v']?.['black-white']?.animated?.front_default,
                            types: p.types.map(t => t.type.name),
                            stats: p.stats, abilities: p.abilities,
                            evolution_chain_url: p.species.url 
                        };
                        return acc;
                    }, {});
                    setPokemonDetailsCache(prevCache => ({ ...prevCache, ...newCacheEntries }));
                } catch (e) {
                    console.error("Failed to fetch suggestion details:", e);
                }
            }
            
            setSuggestedPokemonIds(finalEvoIds);
        };

        generateSuggestions();

    }, [currentTeam, pokemonDetailsCache, allPokemons, evolutionChainCache]);

    useEffect(() => {
        if (!db || !isAuthReady) return; 
        
        const likesDocRef = doc(db, "artifacts", appId, "public", "data", "app-metadata", "likes");
        
        const unsubscribe = onSnapshot(likesDocRef, (doc) => {
            if (doc.exists()) {
                setLikeCount(doc.data().count);
            } else {
                setDoc(likesDocRef, { count: 0 });
            }
        }, (error) => {
             console.error("Like listener error:", error);
        });

        if (sessionStorage.getItem('hasLikedPokemonBuilder')) {
            setHasLiked(true);
        }

        return () => unsubscribe();
    }, [db, isAuthReady]); // --- CHANGE: Dependency added ---


    const observer = useRef();
    const lastPokemonElementRef = useCallback(node => {
        if (isFetchingMore || isFiltering) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && availablePokemons.length > visibleCount) {
                setVisibleCount(prevCount => prevCount + 50);
            }
        });
        if (node) observer.current.observe(node);
    }, [isFetchingMore, isFiltering, availablePokemons, visibleCount]);

    const handleAddPokemonToTeam = useCallback((pokemon) => {
        if (currentTeam.length >= 6) return showToast("Your team is full (6 Pokémon)!", 'warning');
        if (currentTeam.find(p => p.id === pokemon.id)) return showToast("This Pokémon is already on your team.", 'warning');
        setCurrentTeam(prev => [...prev, pokemon]);
    }, [currentTeam, showToast]);

    const handleRemoveFromTeam = useCallback((pokemonId) => {
        setCurrentTeam(prev => prev.filter(p => p.id !== pokemonId));
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
        const teamData = { name: teamName, pokemons: currentTeam.map(p => ({id: p.id, name: p.name, sprite: p.sprite})), isFavorite: savedTeams.find(t => t.id === editingTeamId)?.isFavorite || false, createdAt: savedTeams.find(t => t.id === editingTeamId)?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
        
        try {
            await setDoc(doc(db, `artifacts/${appId}/users/${userId}/teams`, teamId), teamData);
            showToast(`Team "${teamName}" saved!`, 'success');
            handleClearTeam();
        } catch (e) { showToast("Error saving team.", 'error'); }
    }, [db, userId, currentTeam, teamName, editingTeamId, savedTeams, showToast, handleClearTeam]);

    const handleLike = useCallback(async () => {
        if (!db || hasLiked || !isAuthReady) return; 
        
        const likesDocRef = doc(db, "artifacts", appId, "public", "data", "app-metadata", "likes");
        
        try {
            await setDoc(likesDocRef, { count: increment(1) }, { merge: true });
            sessionStorage.setItem('hasLikedPokemonBuilder', 'true');
            setHasLiked(true);
            showToast("Thanks for the like!", "success");
        } catch (error) {
            showToast("Could not register like.", "error");
        }
    }, [db, hasLiked, showToast, isAuthReady]);

    const handleShareTeam = useCallback(async () => {
        if (!db || !isAuthReady) return showToast("Database not ready.", "error"); 
        if (currentTeam.length === 0) return showToast("Cannot share an empty team!", "warning");
        
        const teamId = doc(collection(db, `artifacts/${appId}/public/data/teams`)).id;
        const teamData = { name: teamName || "Unnamed Team", pokemons: currentTeam.map(p => ({id: p.id, name: p.name, sprite: p.sprite || ''})) };

        try {
            await setDoc(doc(db, `artifacts/${appId}/public/data/teams`, teamId), teamData);
            const shareUrl = `${window.location.origin}${window.location.pathname}?team=${teamId}`;
            
            const textArea = document.createElement("textarea");
            textArea.value = shareUrl;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    showToast("Share link copied to clipboard!", "success");
                } else {
                    showToast("Failed to copy link.", "error");
                }
            } catch (err) {
                showToast("Failed to copy link.", "error");
            }
            document.body.removeChild(textArea);

        } catch (error) {
            showToast("Could not generate share link.", "error");
        }
    }, [db, currentTeam, teamName, showToast, isAuthReady]);

    const handleEditTeam = useCallback(async (team) => {
        const detailsPromises = team.pokemons.map(async (p) => {
            if (pokemonDetailsCache[p.id]) return pokemonDetailsCache[p.id];
            const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${p.id}`);
            const d = await res.json();
            return { id: d.id, name: d.name, sprite: d.sprites?.front_default, types: d.types.map(t => t.type.name), animatedSprite: d.sprites?.versions?.['generation-v']?.['black-white']?.animated?.front_default, stats: d.stats, abilities: d.abilities };
        });
        const teamPokemonDetails = await Promise.all(detailsPromises);
        setPokemonDetailsCache(prev => ({...prev, ...teamPokemonDetails.reduce((acc, p) => ({...acc, [p.id]: p}), {})}));
        setCurrentTeam(teamPokemonDetails.filter(Boolean));
        setTeamName(team.name);
        setEditingTeamId(team.id);
        setCurrentPage('builder');
        setIsSidebarOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [pokemonDetailsCache]);

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
        try { await setDoc(doc(db, `artifacts/${appId}/users/${userId}/teams`, team.id), { ...team, isFavorite: !team.isFavorite }); }
        catch (e) { showToast("Could not update favorite status.", 'error'); }
    }, [db, userId, showToast]);

    const handleTypeSelection = useCallback((type) => {
        setSelectedTypes(prev => {
            const newTypes = new Set(prev);
            newTypes.has(type) ? newTypes.delete(type) : newTypes.add(type);
            return newTypes;
        });
    }, []);
    
    const showDetails = useCallback((pokemon) => {
        setModalPokemon(pokemon);
    }, []);
    
    const renderPage = () => {
        switch (currentPage) {
            case 'allTeams':
                return <AllTeamsView teams={allFilteredTeams} onEdit={handleEditTeam} onDelete={handleDeleteTeam} onToggleFavorite={handleToggleFavorite} searchTerm={teamSearchTerm} setSearchTerm={setTeamSearchTerm} />;
            default:
                return <TeamBuilderView 
                    currentTeam={currentTeam} teamName={teamName} setTeamName={setTeamName}
                    handleRemoveFromTeam={handleRemoveFromTeam} handleSaveTeam={handleSaveTeam} editingTeamId={editingTeamId}
                    handleClearTeam={handleClearTeam} recentTeams={recentTeams} setCurrentPage={setCurrentPage}
                    handleToggleFavorite={handleToggleFavorite} handleEditTeam={handleEditTeam} handleDeleteTeam={handleDeleteTeam} handleShareTeam={handleShareTeam}
                    teamAnalysis={teamAnalysis} searchInput={searchInput} setSearchInput={setSearchInput}
                    selectedGeneration={selectedGeneration} setSelectedGeneration={setSelectedGeneration} generations={generations}
                    isInitialLoading={isInitialLoading} isFiltering={isFiltering} availablePokemons={availablePokemons}
                    pokemonDetailsCache={pokemonDetailsCache} handleAddPokemonToTeam={handleAddPokemonToTeam} lastPokemonElementRef={lastPokemonElementRef}
                    isFetchingMore={isFetchingMore} visibleCount={visibleCount} selectedTypes={selectedTypes}
                    handleTypeSelection={handleTypeSelection} showDetails={showDetails} suggestedPokemonIds={suggestedPokemonIds}
                />;
        }
    }
    
    return (
      <div className="min-h-screen text-white font-sans" style={{ backgroundColor: COLORS.background }}>
        <PokemonDetailModal pokemon={modalPokemon} onClose={() => setModalPokemon(null)} onAdd={handleAddPokemonToTeam} currentTeam={currentTeam}/>
        <div className="fixed top-5 right-5 z-50 space-y-2">{toasts.slice(0, maxToasts).map(toast => ( <div key={toast.id} className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg text-white animate-fade-in-out ${toast.type === 'success' ? 'bg-green-600' : toast.type === 'warning' ? 'bg-yellow-600' : 'bg-red-600'}`}>{toast.type === 'success' && <SuccessToastIcon />}{toast.type === 'error' && <ErrorToastIcon />}{toast.type === 'warning' && <WarningToastIcon />}{toast.message}</div> ))}</div>
        <div className="flex min-h-screen">
          <aside className={`fixed lg:relative lg:translate-x-0 inset-y-0 left-0 z-40 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'lg:w-20' : 'w-64'} ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} style={{backgroundColor: COLORS.card}}><div className="flex flex-col h-full"><div className={`flex items-center h-16 p-4 ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}><h2 className={`text-xl font-bold transition-opacity duration-200 whitespace-nowrap ${isSidebarCollapsed ? 'lg:opacity-0 lg:hidden' : 'opacity-100'}`} style={{fontFamily: "'Press Start 2P'", color: COLORS.primary}}>Menu</h2><button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-1 rounded-lg hidden lg:block transition-colors hover:bg-purple-500/20" style={{color: COLORS.textMuted}}>{isSidebarCollapsed ? <CollapseRightIcon /> : <CollapseLeftIcon />}</button></div><nav className="px-4 flex-grow"><ul><li><button onClick={() => { setCurrentPage('builder'); setIsSidebarOpen(false); }} className={`w-full p-3 rounded-lg font-bold flex items-center transition-colors hover:bg-purple-500/20 ${currentPage === 'builder' ? 'bg-purple-500/30' : ''} ${isSidebarCollapsed ? 'justify-center' : ''}`}><PokeballIcon /> <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-0 lg:ml-0 opacity-0' : 'w-auto ml-3 opacity-100'}`}>Team Builder</span></button></li><li><button onClick={() => { setCurrentPage('allTeams'); setIsSidebarOpen(false); }} className={`w-full p-3 mt-2 rounded-lg font-bold flex items-center transition-colors hover:bg-purple-500/20 ${currentPage === 'allTeams' ? 'bg-purple-500/30' : ''} ${isSidebarCollapsed ? 'justify-center' : ''}`}><AllTeamsIcon /> <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-0 lg:ml-0 opacity-0' : 'w-auto ml-3 opacity-100'}`}>All Teams</span></button></li></ul></nav></div></aside>
            <div className="flex-1 min-w-0">
                <header className="relative flex items-center justify-between pt-4 px-4 h-24">
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="lg:hidden p-2 rounded-md"
                    style={{ backgroundColor: COLORS.cardLight }}
                >
                    {isSidebarOpen ? <CloseIcon /> : <MenuIcon />}
                </button>

                <div className="flex-1 text-center px-2 overflow-hidden">
                    <h1
                    className="text-sm sm:text-base lg:text-3xl font-bold tracking-wider truncate"
                    style={{ fontFamily: "'Press Start 2P'", color: COLORS.primary }}
                    >
                    Pokémon Team Builder
                    </h1>
                    <p
                    className="text-xs sm:text-sm md:text-base mt-1 truncate"
                    style={{ fontFamily: "'Press Start 2P'", color: COLORS.primary }}
                    >
                    By: Enzo Esmeraldo
                    </p>
                </div>

                <div className="w-10 lg:hidden" />
                </header>
                <div className="p-4 sm:p-6 lg:p-8">{renderPage()}</div>
                <footer className="text-center mt-12 py-6 border-t" style={{borderColor: COLORS.cardLight}}><p className="text-sm" style={{color: COLORS.textMuted}}>Developed and built by <a href="https://github.com/ensinho" target="_blank" rel="noopener noreferrer" className="underline hover:text-white" >Enzo Esmeraldo</a> </p><div className="flex justify-center gap-4 mt-4"><button onClick={handleLike} disabled={hasLiked} className={`flex items-center gap-2 px-2 py-1 rounded-full transition-colors ${hasLiked ? 'bg-pink-500/50 text-white cursor-not-allowed' : 'bg-gray-700 hover:bg-pink-500'}`}><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg><span>{likeCount}</span></button><a href="https://github.com/ensinho" target="_blank" rel="noopener noreferrer" className="hover:text-white" style={{color: COLORS.textMuted}}><GithubIcon /></a><a href="https://www.linkedin.com/in/enzoesmeraldo/" target="_blank" rel="noopener noreferrer" className="hover:text-white" style={{color: COLORS.textMuted}}><LinkedinIcon /></a></div><p className="text-xs mt-2" style={{color: COLORS.textMuted}}>Using the <a href="https://pokeapi.co/" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">PokéAPI</a>. Pokémon and their names are trademarks of Nintendo.</p></footer>
            </div>
        </div>
        <style>{` @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap'); .custom-scrollbar::-webkit-scrollbar { width: 12px; } .custom-scrollbar::-webkit-scrollbar-track { background: ${COLORS.card}; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: ${COLORS.primary}; border-radius: 20px; border: 3px solid ${COLORS.card}; } @keyframes fade-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } } .animate-fade-in { animation: fade-in 0.2s ease-out forwards; } .image-pixelated { image-rendering: pixelated; } `}</style>
      </div>
    );
}
