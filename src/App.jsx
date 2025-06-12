import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, deleteDoc, query } from 'firebase/firestore';

// --- Assets & Data ---
const COLORS = { primary: '#7d65e1', background: '#111827', card: '#1F2937', cardLight: '#374151', text: '#FFFFFF', textMuted: '#9CA3AF' };
const typeColors = { normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C', grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1', ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A', rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705746', steel: '#B7B7CE', fairy: '#D685AD' };
const typeIcons = {
    normal: "https://archives.bulbagarden.net/media/upload/c/cb/Normal_icon_LA.png?20220213053429", fire: "https://archives.bulbagarden.net/media/upload/4/48/Fire_icon_LA.png?20220213053749", water: "https://archives.bulbagarden.net/media/upload/5/5e/Water_icon_LA.png?20220213053800", electric: "https://archives.bulbagarden.net/media/upload/7/75/Electric_icon_LA.png?20220213053826", grass: "https://archives.bulbagarden.net/media/upload/1/1b/Grass_icon_LA.png?20220213053815", ice: "https://archives.bulbagarden.net/media/upload/7/70/Ice_icon_LA.png?20220213053853", fighting: "https://archives.bulbagarden.net/media/upload/6/68/Fighting_icon_LA.png?20220213053440", poison: "https://archives.bulbagarden.net/media/upload/b/b4/Poison_icon_LA.png?20220213053545", ground: "https://archives.bulbagarden.net/media/upload/4/45/Ground_icon_LA.png?20220213053610", flying: "https://archives.bulbagarden.net/media/upload/d/de/Flying_icon_LA.png?20220213053533", psychic: "https://archives.bulbagarden.net/media/upload/4/45/Psychic_icon_LA.png?20220213053708", bug: "https://archives.bulbagarden.net/media/upload/2/26/Bug_icon_LA.png?20220213053628", rock: "https://archives.bulbagarden.net/media/upload/8/85/Rock_icon_LA.png?20220213053620", ghost: "https://archives.bulbagarden.net/media/upload/b/b5/Ghost_icon_LA.png?20220213053637", dragon: "https://archives.bulbagarden.net/media/upload/2/28/Dragon_icon_LA.png?20220213053915", dark: "https://archives.bulbagarden.net/media/upload/7/7f/Dark_icon_LA.png?20220213053921", steel: "https://archives.bulbagarden.net/media/upload/f/f9/Steel_icon_LA.png?20220213053740", fairy: "https://archives.bulbagarden.net/media/upload/b/b1/Fairy_icon_LA.png?20220213053936"
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
const SaveIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /> </svg> );
const PlusIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"> <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /> </svg> );
const MenuIcon = () => (<svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>);
const CloseIcon = () => (<svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>);
const BuilderIcon = () => ( <svg className="w-6 h-6 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>);
const AllTeamsIcon = () => (<svg className="w-6 h-6 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>);
const CollapseLeftIcon = () => (<svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>);
const CollapseRightIcon = () => (<svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>);
const TypeBadge = ({ type }) => ( <span className="text-xs font-semibold mr-1 mb-1 px-2.5 py-1 rounded-full text-white shadow-sm" style={{ backgroundColor: typeColors[type] || '#777' }}> {type.toUpperCase()} </span> );

// --- Firebase Config ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-pokemon-app';

// --- Helper Components ---
const PokemonCard = React.memo(({ pokemon, onAdd, details, lastRef }) => {
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
        <div ref={lastRef} className="rounded-lg p-3 text-center cursor-pointer hover:shadow-xl transform hover:-translate-y-1 transition-all group relative" style={{backgroundColor: COLORS.cardLight}} onClick={() => onAdd(details)}>
            <img src={details.sprite} alt={details.name} className="mx-auto h-24 w-24 group-hover:scale-110 transition-transform" />
            <p className="mt-2 text-sm font-semibold capitalize">{details.name}</p>
            <div className="flex justify-center items-center mt-1 gap-1">
                {details.types.map(type => <img key={type} src={typeIcons[type]} alt={type} className="w-5 h-5"/>)}
            </div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-blue-500 text-white rounded-full p-1"><PlusIcon/></div>
            </div>
        </div>
    );
});


// --- Main App Component ---
export default function App() {
    // Firebase States
    const [userId, setUserId] = useState(null);
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    
    // Pokémon and Filter States
    const [allPokemons, setAllPokemons] = useState([]);
    const [filteredPokemons, setFilteredPokemons] = useState([]);
    const [pokemonDetailsCache, setPokemonDetailsCache] = useState({});
    
    // Filter Controls
    const [generations, setGenerations] = useState([]);
    const [selectedGeneration, setSelectedGeneration] = useState('all');
    const [selectedTypes, setSelectedTypes] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    
    // Team States
    const [currentTeam, setCurrentTeam] = useState([]);
    const [savedTeams, setSavedTeams] = useState([]);
    const [teamName, setTeamName] = useState('');
    const [editingTeamId, setEditingTeamId] = useState(null);
    const [teamAnalysis, setTeamAnalysis] = useState({ strengths: new Set(), weaknesses: {} });
    
    // UI States
    const [isLoading, setIsLoading] = useState(true);
    const [toasts, setToasts] = useState([]);
    const [currentPage, setCurrentPage] = useState('builder');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [teamSearchTerm, setTeamSearchTerm] = useState('');
    const [visibleCount, setVisibleCount] = useState(40);

    // Toast Notification Handler
    const showToast = useCallback((message, type = 'info') => {
        const id = Date.now();
        setToasts(prevToasts => [...prevToasts, { id, message, type }]);
        setTimeout(() => setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id)), 3000);
    }, []);
    
    // Derived states
    const availablePokemons = useMemo(() => {
        const teamIds = new Set(currentTeam.map(p => p.id));
        return filteredPokemons.filter(p => !teamIds.has(p.id));
    }, [filteredPokemons, currentTeam]);

    const favoriteTeams = useMemo(() => {
        return savedTeams.filter(team => team.isFavorite).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0,5);
    }, [savedTeams]);
    
    const allFilteredTeams = useMemo(() => {
        let teams = [...savedTeams].sort((a,b) => (b.isFavorite - a.isFavorite) || new Date(b.createdAt) - new Date(a.createdAt));
        if (teamSearchTerm) {
            teams = teams.filter(team => team.name.toLowerCase().includes(teamSearchTerm.toLowerCase()));
        }
        return teams;
    }, [savedTeams, teamSearchTerm]);

    // Firebase Initialization Effect
    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const authInstance = getAuth(app);
            setDb(getFirestore(app));
            setAuth(authInstance);

            onAuthStateChanged(authInstance, async (user) => {
                if (user) {
                    setUserId(user.uid);
                    setIsAuthReady(true);
                } else {
                    try {
                      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                          await signInWithCustomToken(authInstance, __initial_auth_token);
                      } else {
                          await signInAnonymously(authInstance);
                      }
                      setIsAuthReady(true);
                    } catch (authError) {
                      showToast("Authentication failed.", "error");
                    }
                }
            });
        } catch (e) { 
            showToast("Failed to connect to services.", "error"); 
        }
    }, []);

    // Initial Data Fetching (basic list only)
    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoading(true);
            try {
                const [genRes, pokeListRes] = await Promise.all([
                    fetch('https://pokeapi.co/api/v2/generation'),
                    fetch('https://pokeapi.co/api/v2/pokemon?limit=1025')
                ]);
                
                const genData = await genRes.json();
                setGenerations(genData.results);

                const pokeListData = await pokeListRes.json();
                const pokemonData = pokeListData.results.map(p => {
                    const urlParts = p.url.split('/');
                    const id = parseInt(urlParts[urlParts.length - 2]);
                    return { id, name: p.name, url: p.url };
                });
                
                setAllPokemons(pokemonData);
                setFilteredPokemons(pokemonData);
            } catch (e) {
                showToast("Failed to load Pokémon data.", "error");
            } finally {
                setIsLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    // Main Filtering Logic Effect
    useEffect(() => {
        if (allPokemons.length === 0) return;

        const applyFilters = async () => {
            setIsLoading(true);
            let pokemonListResult = [...allPokemons];

            const generationRanges = {
                'generation-i': [1, 151], 'generation-ii': [152, 251], 'generation-iii': [252, 386],
                'generation-iv': [387, 493], 'generation-v': [494, 649], 'generation-vi': [650, 721],
                'generation-vii': [722, 809], 'generation-viii': [810, 905], 'generation-ix': [906, 1025],
            };
            if (selectedGeneration !== 'all') {
                const range = generationRanges[selectedGeneration];
                if(range){
                    pokemonListResult = pokemonListResult.filter(p => p.id >= range[0] && p.id <= range[1]);
                }
            }
            
            if (selectedTypes.size > 0) {
                try {
                    const typePromises = Array.from(selectedTypes).map(type =>
                        fetch(`https://pokeapi.co/api/v2/type/${type.toLowerCase()}`).then(res => res.json())
                        .then(data => new Set(data.pokemon.map(p => p.pokemon.name)))
                    );
                    const pokemonSets = await Promise.all(typePromises);
                    if (pokemonSets.length > 0) {
                         const intersection = pokemonSets.reduce((acc, currentSet) => {
                            if (acc === null) return currentSet;
                            return new Set([...acc].filter(name => currentSet.has(name)));
                        }, new Set(allPokemons.map(p => p.name)));
                        pokemonListResult = pokemonListResult.filter(p => intersection.has(p.name));
                    }
                } catch(e) { showToast("Failed to apply type filter.", "error"); }
            }

            if (searchTerm) {
                pokemonListResult = pokemonListResult.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
            }
            
            setFilteredPokemons(pokemonListResult);
            setVisibleCount(40);
            setIsLoading(false);
        };
        applyFilters();
    }, [selectedGeneration, selectedTypes, searchTerm, allPokemons]);


    // Fetch details for visible Pokémon
    useEffect(() => {
        const fetchVisiblePokemonDetails = async () => {
            const pokemonToFetch = availablePokemons.slice(0, visibleCount);
            const missingDetails = pokemonToFetch.filter(p => !pokemonDetailsCache[p.id]);

            if (missingDetails.length === 0) return;

            try {
                const detailPromises = missingDetails.map(p => fetch(p.url).then(res => res.json()));
                const newDetailedPokemons = await Promise.all(detailPromises);
                const newCacheEntries = newDetailedPokemons.reduce((acc, p) => {
                    acc[p.id] = {
                        id: p.id, name: p.name, sprite: p.sprites?.front_default || 'https://via.placeholder.com/96',
                        types: p.types.map(t => t.type.name),
                    };
                    return acc;
                }, {});
                setPokemonDetailsCache(prevCache => ({ ...prevCache, ...newCacheEntries }));
            } catch (e) { /* silent fail */ }
        };
        
        if (availablePokemons.length > 0) {
            fetchVisiblePokemonDetails();
        }
    }, [availablePokemons, visibleCount]);

    // Infinite scroll observer
    const observer = useRef();
    const lastPokemonElementRef = useCallback(node => {
        if (isLoading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && availablePokemons.length > visibleCount) {
                setVisibleCount(prevCount => prevCount + 40);
            }
        });
        if (node) observer.current.observe(node);
    }, [isLoading, availablePokemons, visibleCount]);

    // Firestore Listener for Saved Teams
    useEffect(() => {
        if (!isAuthReady || !db || !userId) return;
        const q = query(collection(db, `artifacts/${appId}/users/${userId}/teams`));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSavedTeams(teamsData);
        }, () => showToast("Could not load saved teams.", "error"));
        return () => unsubscribe();
    }, [isAuthReady, db, userId]);

    // Team Analysis Effect
    useEffect(() => {
        const teamDetails = currentTeam.map(p => pokemonDetailsCache[p.id]).filter(Boolean);
        if (teamDetails.length === 0 || teamDetails.length < currentTeam.length) {
            setTeamAnalysis({ strengths: new Set(), weaknesses: {} });
            return;
        }
        
        const allTypesInChart = Object.keys(typeChart);
        const teamWeaknessCounts = {};
        const offensiveCoverage = new Set();
        
        teamDetails.flatMap(d => d.types).forEach(type => {
            if (typeChart[type] && typeChart[type].damageDealt) {
                Object.entries(typeChart[type].damageDealt).forEach(([vs, mult]) => { if (mult > 1) offensiveCoverage.add(vs); });
            }
        });

        allTypesInChart.forEach(attackingType => {
            const weakCount = teamDetails.filter(pokemon => {
                const multi = pokemon.types.reduce((acc, T) => acc * (typeChart[T]?.damageTaken[attackingType] ?? 1), 1);
                return multi > 1;
            }).length;
            if (weakCount > 0) teamWeaknessCounts[attackingType] = weakCount;
        });
        
        setTeamAnalysis({ strengths: offensiveCoverage, weaknesses: teamWeaknessCounts });
    }, [currentTeam, pokemonDetailsCache]);
    

    // Handlers
    const handleAddPokemonToTeam = (pokemon) => {
        if (currentTeam.length >= 6) return showToast("Your team is full (6 Pokémon)!", 'warning');
        if (currentTeam.find(p => p.id === pokemon.id)) return showToast("This Pokémon is already on your team.", 'warning');
        setCurrentTeam([...currentTeam, pokemon]);
    };
    const handleRemoveFromTeam = (pokemonId) => setCurrentTeam(currentTeam.filter(p => p.id !== pokemonId));
    const handleClearTeam = () => { setCurrentTeam([]); setTeamName(''); setEditingTeamId(null); };
    const handleSaveTeam = async () => {
        if (!db || !userId) return showToast("Database connection not ready.", 'error');
        if (currentTeam.length === 0) return showToast("Your team is empty!", 'warning');
        if (!teamName.trim()) return showToast("Please name your team.", 'warning');
        
        const teamPokemons = currentTeam.map(p => ({id: p.id, name: p.name, sprite: p.sprite}));
        const teamId = editingTeamId || doc(collection(db, `artifacts/${appId}/users/${userId}/teams`)).id;
        const teamData = { name: teamName, pokemons: teamPokemons, isFavorite: savedTeams.find(t => t.id === editingTeamId)?.isFavorite || false, createdAt: new Date().toISOString() };
        
        try {
            await setDoc(doc(db, `artifacts/${appId}/users/${userId}/teams`, teamId), teamData);
            showToast(`Team "${teamName}" saved!`, 'success');
            handleClearTeam();
        } catch (e) { showToast("Error saving team.", 'error'); }
    };

    const handleEditTeam = async (team) => {
        const teamPokemonDetails = await Promise.all(team.pokemons.map(async (p) => {
            if (pokemonDetailsCache[p.id]) return pokemonDetailsCache[p.id];
            try {
                const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${p.id}`);
                const details = await res.json();
                const formattedDetails = { id: details.id, name: details.name, sprite: details.sprites?.front_default || 'https://via.placeholder.com/96', types: details.types.map(t => t.type.name) };
                setPokemonDetailsCache(prev => ({...prev, [p.id]: formattedDetails}));
                return formattedDetails;
            } catch (e) { return null; }
        }));
        
        setCurrentTeam(teamPokemonDetails.filter(Boolean));
        setTeamName(team.name);
        setEditingTeamId(team.id);
        setCurrentPage('builder');
        setIsSidebarOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteTeam = async (teamId) => {
        if (!db || !userId) return;
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/teams`, teamId));
            if (editingTeamId === teamId) handleClearTeam();
            showToast("Team deleted.", 'info');
        } catch (e) { showToast("Error deleting team.", 'error'); }
    };
    const handleToggleFavorite = async (team) => {
        if (!db || !userId) return;
        try { await setDoc(doc(db, `artifacts/${appId}/users/${userId}/teams`, team.id), { ...team, isFavorite: !team.isFavorite }); }
        catch (e) { showToast("Could not update favorite status.", 'error'); }
    };
     const handleTypeSelection = (type) => {
        setSelectedTypes(prev => {
            const newTypes = new Set(prev);
            if (newTypes.has(type)) newTypes.delete(type);
            else newTypes.add(type);
            return newTypes;
        });
    };
    
    // Page Render
    const renderPage = () => {
        switch (currentPage) {
            case 'allTeams':
                return <AllTeamsView teams={allFilteredTeams} onEdit={handleEditTeam} onDelete={handleDeleteTeam} onToggleFavorite={handleToggleFavorite} searchTerm={teamSearchTerm} setSearchTerm={setTeamSearchTerm} />;
            case 'builder':
            default:
                return <TeamBuilderView />;
        }
    }
    
    const TeamBuilderView = () => (
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-3 space-y-8"> 
              <section className="p-6 rounded-xl shadow-lg" style={{backgroundColor: COLORS.card}}>
                <h2 className="text-xl md:text-2xl font-bold mb-4 border-b-2 pb-2" style={{fontFamily: "'Press Start 2P'", borderColor: COLORS.primary}}>Current Team</h2>
                <input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Team Name" className="w-full text-white p-3 rounded-lg border-2 focus:outline-none" style={{backgroundColor: COLORS.cardLight, borderColor: 'transparent'}}/>
                <div className="grid grid-cols-3 gap-4 min-h-[120px] p-4 rounded-lg mt-4" style={{backgroundColor: 'rgba(0,0,0,0.2)'}}>
                  {currentTeam.map(pokemon => (<div key={pokemon.id} className="text-center relative group"><img src={pokemon.sprite} alt={pokemon.name} className="mx-auto h-20 w-20" /><p className="text-xs capitalize truncate">{pokemon.name}</p><button onClick={() => handleRemoveFromTeam(pokemon.id)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full h-6 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-sm">X</button></div>))}
                  {Array.from({ length: 6 - currentTeam.length }).map((_, i) => <div key={i} className="border-2 border-dashed rounded-lg flex items-center justify-center" style={{borderColor: COLORS.cardLight, backgroundColor: 'transparent'}}><span className="text-3xl font-bold" style={{color: COLORS.textMuted}}>?</span></div>)}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <button onClick={handleSaveTeam} className="w-full flex items-center justify-center font-bold py-2 px-4 rounded-lg" style={{backgroundColor: COLORS.primary, color: COLORS.background}}> <SaveIcon /> {editingTeamId ? 'Update' : 'Save'} Team </button>
                  <button onClick={handleClearTeam} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Clear</button>
                </div>
              </section>
              
              {currentTeam.length > 0 && (<section className="p-6 rounded-xl shadow-lg" style={{ backgroundColor: COLORS.card }}><h3 className="text-lg md:text-xl font-bold mb-4">Team Analysis</h3><div><h4 className="font-semibold mb-2 text-green-400">Offensive Coverage:</h4><div className="flex flex-wrap gap-1">{teamAnalysis.strengths.size > 0 ? Array.from(teamAnalysis.strengths).sort().map(type => <TypeBadge key={type} type={type} />) : <p className="text-sm" style={{color: COLORS.textMuted}}>No type advantages found.</p>}</div></div><div className="mt-4"><h4 className="font-semibold mb-2 text-red-400">Defensive Weaknesses:</h4><div className="flex flex-wrap gap-1">{Object.keys(teamAnalysis.weaknesses).length > 0 ? Object.entries(teamAnalysis.weaknesses).sort(([,a],[,b]) => b-a).map(([type, score]) => (<div key={type} className="flex items-center"><TypeBadge type={type} /><span className="text-xs text-red-300">({score}x)</span></div>)) : <p className="text-sm" style={{color: COLORS.textMuted}}>Your team has no common weaknesses!</p>}</div></div></section>)}
              <section className="p-6 rounded-xl shadow-lg" style={{backgroundColor: COLORS.card}}>
                <div className="flex justify-between items-center mb-4"><h2 className="text-xl md:text-2xl font-bold" style={{fontFamily: "'Press Start 2P'",}}>Favorite Teams</h2><button onClick={() => setCurrentPage('allTeams')} className="text-sm text-purple-400 hover:underline">View All</button></div>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                    {favoriteTeams.length > 0 ? favoriteTeams.map(team => (<div key={team.id} className="p-4 rounded-lg flex items-center justify-between transition-colors" style={{backgroundColor: COLORS.cardLight}}><div className="flex-1 min-w-0"><p className="font-bold text-lg truncate">{team.name}</p><div className="flex mt-1">{team.pokemons.map(p => <img key={p.id} src={p.sprite} alt={p.name} className="h-8 w-8 -ml-2 border-2 rounded-full" style={{borderColor: COLORS.cardLight, backgroundColor: COLORS.card}} />)}</div></div><div className="flex items-center gap-2 flex-shrink-0 ml-2"><button onClick={() => handleToggleFavorite(team)} title="Favorite"><StarIcon isFavorite={team.isFavorite} /></button><button onClick={() => handleEditTeam(team)} className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold py-1 px-3 rounded-full">Edit</button></div></div>)) : <p className="text-center py-4" style={{color: COLORS.textMuted}}>No favorite teams yet.</p>}
                </div>
              </section>
            </div>

            <div className="lg:col-span-6">
              <section className="p-6 rounded-xl shadow-lg h-full flex flex-col" style={{backgroundColor: COLORS.card}}>
                <div className="mb-4">
                  <h2 className="text-xl md:text-2xl font-bold mb-4" style={{fontFamily: "'Press Start 2P'",}}>Choose your Pokémon!</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input type="text" placeholder="Search Pokémon..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-3 rounded-lg border-2 focus:outline-none" style={{backgroundColor: COLORS.cardLight, borderColor: 'transparent'}}/>
                    <select value={selectedGeneration} onChange={e => setSelectedGeneration(e.target.value)} className="w-full p-3 rounded-lg border-2 focus:outline-none appearance-none capitalize" style={{backgroundColor: COLORS.cardLight, borderColor: 'transparent'}}>
                      <option value="all">All Generations</option>
                      {generations.map(gen => <option key={gen.name} value={gen.name} className="capitalize">{gen.name.replace('-', ' ')}</option>)}
                    </select>
                  </div>
                </div>
                
                <div className="flex-grow h-[52vh] overflow-y-auto custom-scrollbar">
                    {(isLoading) ? (<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{borderColor: COLORS.primary}}></div></div>) : 
                    (<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-2">
                        {availablePokemons.slice(0, visibleCount).map((pokemon, index) => {
                            const isLastElement = index === visibleCount - 1 || index === availablePokemons.length - 1;
                            return <PokemonCard key={pokemon.id} pokemon={pokemon} details={pokemonDetailsCache[pokemon.id]} onAdd={handleAddPokemonToTeam} lastRef={isLastElement ? lastPokemonElementRef : null} />
                        })}
                        {availablePokemons.length === 0 && <p className="col-span-full text-center py-8" style={{color: COLORS.textMuted}}>No Pokémon found with these filters. :(</p>}
                    </div>)}
                </div>
              </section>
            </div>

            <div className="lg:col-span-3">
              <section className="p-6 rounded-xl shadow-lg top-8" style={{backgroundColor: COLORS.card}}>
                 <h3 className="text-lg md:text-xl font-bold mb-3 text-center" style={{fontFamily: "'Press Start 2P'",}}>Filter by Type</h3>
                  <div className="grid grid-cols-4 gap-2">
                      {Object.keys(typeColors).map(type => (<button key={type} onClick={() => handleTypeSelection(type)} className={`p-2 rounded-lg bg-transparent transition-colors hover:bg-gray-700/50 ${selectedTypes.has(type) ? 'ring-2 ring-white' : ''}`} title={type}><img src={typeIcons[type]} alt={type} className="w-full h-full object-contain" /></button>))}
                  </div>
              </section>
            </div>
          </main>
    );
    
    const AllTeamsView = ({teams, onEdit, onDelete, onToggleFavorite, searchTerm, setSearchTerm}) => (
        <div className="p-6 rounded-xl shadow-lg" style={{backgroundColor: COLORS.card}}>
            <h2 className="text-2xl md:text-3xl font-bold mb-6">All Saved Teams</h2>
            <input type="text" placeholder="Search teams by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-3 mb-6 rounded-lg border-2 focus:outline-none" style={{backgroundColor: COLORS.cardLight, borderColor: 'transparent'}}/>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {teams.length > 0 ? teams.map(team => (
                    <div key={team.id} className="p-4 rounded-lg flex flex-col justify-between" style={{backgroundColor: COLORS.cardLight}}>
                        <div className="flex justify-between items-start">
                           <p className="font-bold text-xl truncate mb-2">{team.name}</p>
                           <button onClick={() => onToggleFavorite(team)} title="Favorite"><StarIcon isFavorite={team.isFavorite} /></button>
                        </div>
                        <div className="flex my-2">
                            {team.pokemons.map(p => <img key={p.id} src={p.sprite} alt={p.name} className="h-12 w-12 -ml-3 border-2 rounded-full" style={{borderColor: COLORS.cardLight, backgroundColor: COLORS.card}} />)}
                        </div>
                        <div className="flex items-center gap-2 mt-auto pt-2">
                            <button onClick={() => onEdit(team)} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">Edit</button>
                            <button onClick={() => onDelete(team.id)} className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"><TrashIcon /></button>
                        </div>
                    </div>
                )) : <p className="col-span-full text-center py-8" style={{color: COLORS.textMuted}}>No teams found.</p>}
            </div>
        </div>
    );

    return (
      <div className="min-h-screen text-white font-sans" style={{ backgroundColor: COLORS.background }}>
        <div className="fixed top-5 right-5 z-50 space-y-2">
            {toasts.map(toast => ( <div key={toast.id} className={`px-4 py-2 rounded-lg shadow-lg text-white animate-fade-in-out ${toast.type === 'success' ? 'bg-green-600' : toast.type === 'warning' ? 'bg-yellow-600' : 'bg-red-600'}`}>{toast.message}</div> ))}
        </div>
        
        <div className="flex min-h-screen">
            <aside className={`fixed lg:relative lg:translate-x-0 inset-y-0 left-0 z-40 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'lg:w-20' : 'w-58'} ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} style={{backgroundColor: COLORS.card}}>
                <div className="flex flex-col h-full">
                    <div className={`flex items-center p-5 ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
                        <h2 className={`text-xl font-bold transition-opacity duration-200 whitespace-nowrap ${isSidebarCollapsed ? 'lg:opacity-0 lg:hidden' : 'opacity-100'}`} style={{fontFamily: "'Press Start 2P'", color: COLORS.primary}}>Menu</h2>
                        <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-1 rounded-lg hidden lg:block transition-colors hover:bg-purple-500/20" style={{color: COLORS.textMuted}}>
                            {isSidebarCollapsed ? <CollapseRightIcon /> : <CollapseLeftIcon />}
                        </button>
                    </div>
                    <nav className="px-5 flex-grow">
                        <ul>
                            <li><button onClick={() => { setCurrentPage('builder'); setIsSidebarOpen(false); }} className={`w-full text-left p-3 rounded-lg font-bold flex items-center transition-colors hover:bg-purple-500/20 ${currentPage === 'builder' ? 'bg-purple-500/30' : ''} ${isSidebarCollapsed ? 'justify-center' : ''}`}><BuilderIcon /> <span className={`ml-3 whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'lg:opacity-0 lg:max-w-0' : 'opacity-100 lg:max-w-xs'}`}>Team Builder</span></button></li>
                            <li><button onClick={() => { setCurrentPage('allTeams'); setIsSidebarOpen(false); }} className={`w-full text-left p-3 mt-2 rounded-lg font-bold flex items-center transition-colors hover:bg-purple-500/20 ${currentPage === 'allTeams' ? 'bg-purple-500/30' : ''} ${isSidebarCollapsed ? 'justify-center' : ''}`}><AllTeamsIcon /> <span className={`ml-3 whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'lg:opacity-0 lg:max-w-0' : 'opacity-100 lg:max-w-xs'}`}>All Teams</span></button></li>
                        </ul>
                    </nav>
                </div>
            </aside>
            
            <div className="flex-1 min-w-0">
                <header className="text-center py-4 px-4">
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden absolute top-5 left-5 p-2 rounded-md" style={{backgroundColor: COLORS.cardLight}}>
                       {isSidebarOpen ? <CloseIcon/> : <MenuIcon />}
                    </button>
                    <h1 className="text-xl sm:text-3xl lg:text-5xl font-bold tracking-wider" style={{ fontFamily: "'Press Start 2P', cursive", color: COLORS.primary }}>Pokémon Team Builder</h1>
                     <p className="text-sm sm:text-base md:text-lg mt-2"  style={{ fontFamily: "'Press Start 2P', cursive", color: COLORS.primary }}>By: Enzo Esmeraldo</p>
                </header>

                <div className="p-4 sm:p-6 lg:p-8">
                    {renderPage()}
                </div>

                <footer className="text-center mt-12 py-6 border-t" style={{borderColor: COLORS.cardLight}}>
                    <p className="text-sm" style={{color: COLORS.textMuted}}>Developed by Enzo Esmeraldo</p>
                    <p className="text-xs mt-2" style={{color: COLORS.textMuted}}>
                    Using the <a href="https://pokeapi.co/" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">PokéAPI</a>. Pokémon and their names are trademarks of Nintendo.
                    </p>
                    <div className="flex justify-center gap-4 mt-4">
                        <a href="https://github.com/ensinho" target="_blank" rel="noopener noreferrer" className="hover:text-white" style={{color: COLORS.textMuted}}><GithubIcon /></a>
                        <a href="https://www.linkedin.com/in/enzoesmeraldo/" target="_blank" rel="noopener noreferrer" className="hover:text-white" style={{color: COLORS.textMuted}}><LinkedinIcon /></a>
                    </div>
                </footer>
            </div>
        </div>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
          .custom-scrollbar::-webkit-scrollbar { width: 12px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: ${COLORS.card}; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background-color: ${COLORS.primary}; border-radius: 20px; border: 3px solid ${COLORS.card}; }
          @keyframes fade-in-out { 0% { opacity: 0; transform: translateY(-10px); } 10% { opacity: 1; transform: translateY(0); } 90% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-10px); } }
          .animate-fade-in-out { animation: fade-in-out 3s forwards; }
        `}</style>
      </div>
    );
}
