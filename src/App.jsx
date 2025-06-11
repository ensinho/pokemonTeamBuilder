import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, deleteDoc, query, setLogLevel } from 'firebase/firestore';

// --- Constantes e Dados ---

const COLORS = {
  primary: '#7d65e1',
  primaryHover: '#6f5ccb',
  background: '#111827',
  card: '#1F2937',
  cardLight: '#374151',
  text: '#FFFFFF',
  textMuted: '#9CA3AF',
};

const typeChart = {
    normal: { "damageTaken": { "Fighting": 2, "Ghost": 0, }, "damageDealt": { "Rock": 0.5, "Steel": 0.5, } },
    fire: { "damageTaken": { "Fire": 0.5, "Grass": 0.5, "Ice": 0.5, "Bug": 0.5, "Steel": 0.5, "Fairy": 0.5, "Water": 2, "Ground": 2, "Rock": 2, }, "damageDealt": { "Fire": 0.5, "Water": 0.5, "Rock": 0.5, "Dragon": 0.5, "Grass": 2, "Ice": 2, "Bug": 2, "Steel": 2, } },
    water: { "damageTaken": { "Fire": 0.5, "Water": 0.5, "Ice": 0.5, "Steel": 0.5, "Grass": 2, "Electric": 2, }, "damageDealt": { "Water": 0.5, "Grass": 0.5, "Dragon": 0.5, "Fire": 2, "Ground": 2, "Rock": 2, } },
    grass: { "damageTaken": { "Water": 0.5, "Grass": 0.5, "Electric": 0.5, "Ground": 0.5, "Fire": 2, "Ice": 2, "Poison": 2, "Flying": 2, "Bug": 2, }, "damageDealt": { "Fire": 0.5, "Grass": 0.5, "Poison": 0.5, "Flying": 0.5, "Bug": 0.5, "Rock": 2, "Steel": 0.5, "Dragon": 0.5, "Water": 2, "Ground": 2, } },
    electric: { "damageTaken": { "Electric": 0.5, "Flying": 0.5, "Steel": 0.5, "Ground": 2, }, "damageDealt": { "Grass": 0.5, "Electric": 0.5, "Dragon": 0.5, "Ground": 0, "Water": 2, "Flying": 2, } },
    ice: { "damageTaken": { "Ice": 0.5, "Fire": 2, "Fighting": 2, "Rock": 2, "Steel": 2, }, "damageDealt": { "Fire": 0.5, "Water": 0.5, "Ice": 0.5, "Steel": 0.5, "Grass": 2, "Ground": 2, "Flying": 2, "Dragon": 2, } },
    fighting: { "damageTaken": { "Bug": 0.5, "Rock": 0.5, "Dark": 0.5, "Flying": 2, "Psychic": 2, "Fairy": 2, }, "damageDealt": { "Poison": 0.5, "Flying": 0.5, "Psychic": 0.5, "Bug": 0.5, "Fairy": 0.5, "Ghost": 0, "Normal": 2, "Ice": 2, "Rock": 2, "Dark": 2, "Steel": 2, } },
    poison: { "damageTaken": { "Grass": 0.5, "Fighting": 0.5, "Poison": 0.5, "Bug": 0.5, "Fairy": 0.5, "Ground": 2, "Psychic": 2, }, "damageDealt": { "Poison": 0.5, "Ground": 0.5, "Rock": 0.5, "Ghost": 0.5, "Steel": 0, "Grass": 2, "Fairy": 2, } },
    ground: { "damageTaken": { "Poison": 0.5, "Rock": 0.5, "Electric": 0, "Water": 2, "Grass": 2, "Ice": 2, }, "damageDealt": { "Grass": 0.5, "Bug": 0.5, "Flying": 0, "Fire": 2, "Electric": 2, "Poison": 2, "Rock": 2, "Steel": 2, } },
    flying: { "damageTaken": { "Grass": 0.5, "Fighting": 0.5, "Bug": 0.5, "Ground": 0, "Electric": 2, "Ice": 2, "Rock": 2, }, "damageDealt": { "Electric": 0.5, "Rock": 0.5, "Steel": 0.5, "Grass": 2, "Fighting": 2, "Bug": 2, } },
    psychic: { "damageTaken": { "Fighting": 0.5, "Psychic": 0.5, "Bug": 2, "Ghost": 2, "Dark": 2, }, "damageDealt": { "Psychic": 0.5, "Steel": 0.5, "Dark": 0, "Fighting": 2, "Poison": 2, } },
    bug: { "damageTaken": { "Grass": 0.5, "Fighting": 0.5, "Ground": 0.5, "Fire": 2, "Flying": 2, "Rock": 2, }, "damageDealt": { "Fire": 0.5, "Fighting": 0.5, "Poison": 0.5, "Flying": 0.5, "Ghost": 0.5, "Steel": 0.5, "Fairy": 0.5, "Grass": 2, "Psychic": 2, "Dark": 2, } },
    rock: { "damageTaken": { "Normal": 0.5, "Fire": 0.5, "Poison": 0.5, "Flying": 0.5, "Water": 2, "Grass": 2, "Fighting": 2, "Ground": 2, "Steel": 2, }, "damageDealt": { "Fighting": 0.5, "Ground": 0.5, "Steel": 0.5, "Fire": 2, "Ice": 2, "Flying": 2, "Bug": 2, } },
    ghost: { "damageTaken": { "Poison": 0.5, "Bug": 0.5, "Normal": 0, "Fighting": 0, "Ghost": 2, "Dark": 2, }, "damageDealt": { "Dark": 0.5, "Steel": 0.5, "Normal": 0, "Psychic": 2, "Ghost": 2, } },
    dragon: { "damageTaken": { "Fire": 0.5, "Water": 0.5, "Grass": 0.5, "Electric": 0.5, "Ice": 2, "Dragon": 2, "Fairy": 2, }, "damageDealt": { "Steel": 0.5, "Fairy": 0, "Dragon": 2, } },
    dark: { "damageTaken": { "Ghost": 0.5, "Dark": 0.5, "Psychic": 0, "Fighting": 2, "Bug": 2, "Fairy": 2, }, "damageDealt": { "Fighting": 0.5, "Dark": 0.5, "Fairy": 0.5, "Psychic": 2, "Ghost": 2, } },
    steel: { "damageTaken": { "Normal": 0.5, "Grass": 0.5, "Ice": 0.5, "Flying": 0.5, "Psychic": 0.5, "Bug": 0.5, "Rock": 0.5, "Dragon": 0.5, "Steel": 0.5, "Fairy": 0.5, "Poison": 0, "Fire": 2, "Fighting": 2, "Ground": 2, }, "damageDealt": { "Fire": 0.5, "Water": 0.5, "Electric": 0.5, "Steel": 0.5, "Ice": 2, "Rock": 2, "Fairy": 2, } },
    fairy: { "damageTaken": { "Fighting": 0.5, "Bug": 0.5, "Dark": 0.5, "Dragon": 0, "Poison": 2, "Steel": 2, }, "damageDealt": { "Fire": 0.5, "Poison": 0.5, "Steel": 0.5, "Fighting": 2, "Dragon": 2, "Dark": 2, } }
};
const typeColors = { normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C', grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1', ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A', rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705746', steel: '#B7B7CE', fairy: '#D685AD' };


// --- Ícones SVG ---
const GithubIcon = () => (<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.168 6.839 9.492.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.031-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.378.203 2.398.1 2.651.64.7 1.03 1.595 1.03 2.688 0 3.848-2.338 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.001 10.001 0 0022 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" /></svg>);
const LinkedinIcon = () => (<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>);
const StarIcon = ({ className = "w-6 h-6", isFavorite }) => ( <svg className={className} fill={isFavorite ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: isFavorite ? '#FBBF24' : COLORS.textMuted }}> <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.95-.69l1.519-4.674z" /> </svg> );
const TrashIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"> <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /> </svg> );
const SaveIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /> </svg> );
const PlusIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"> <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /> </svg> );
const TypeBadge = ({ type }) => ( <span className="text-xs font-bold mr-1 mb-1 px-2.5 py-0.5 rounded-full text-white" style={{ backgroundColor: typeColors[type] || '#777' }}> {type.toUpperCase()} </span> );


// --- Configuração do Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyARU0ZFaHQhC3Iz2v48MMugAx5LwhDAFaM",
  authDomain: "pokemonbuilder-8f80d.firebaseapp.com",
  projectId: "pokemonbuilder-8f80d",
  storageBucket: "pokemonbuilder-8f80d.appspot.com",
  messagingSenderId: "514902448758",
  appId: "1:514902448758:web:818f024a8ce15bffa65d57",
  measurementId: "G-MLY0EFTHDK"
};
const appId = 'pokemonTeamBuilder';

// --- Componente Principal: App ---
export default function App() {
    // Estados
    const [userId, setUserId] = useState(null);
    const [db, setDb] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [pokemons, setPokemons] = useState([]);
    const [filteredPokemons, setFilteredPokemons] = useState([]);
    const [gameVersions, setGameVersions] = useState([]);
    const [selectedGame, setSelectedGame] = useState('all');
    const [selectedType, setSelectedType] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentTeam, setCurrentTeam] = useState([]);
    const [savedTeams, setSavedTeams] = useState([]);
    const [teamName, setTeamName] = useState('');
    const [editingTeamId, setEditingTeamId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modal, setModal] = useState({ isOpen: false, message: '', onConfirm: null });
    const [pokemonDetailsCache, setPokemonDetailsCache] = useState({});
    const [teamAnalysis, setTeamAnalysis] = useState({ strengths: new Set(), weaknesses: {} });

    // Efeito para inicializar Firebase
    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const authInstance = getAuth(app);
            const dbInstance = getFirestore(app);
            setLogLevel('debug');
            setDb(dbInstance);
            const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
                if (user) {
                    setUserId(user.uid);
                } else {
                    await signInAnonymously(authInstance);
                }
                setIsAuthReady(true);
            });
            return () => unsubscribe();
        } catch (e) {
            setError("Falha ao conectar com os serviços.");
            setIsLoading(false);
        }
    }, []);

    // Efeito para buscar dados da PokéAPI
    useEffect(() => {
        const fetchPokemonData = async () => {
            setIsLoading(true);
            try {
                const pokemonResponse = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1025');
                const pokemonData = await pokemonResponse.json();
                const pokemonsWithSprites = pokemonData.results.map((p) => {
                    const id = p.url.split('/')[6];
                    return { name: p.name, id: id, sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png` };
                });
                setPokemons(pokemonsWithSprites);

                const versionsResponse = await fetch('https://pokeapi.co/api/v2/version-group?limit=25');
                const versionsData = await versionsResponse.json();
                setGameVersions(versionsData.results);
            } catch (e) {
                setError(e.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPokemonData();
    }, []);
    
    // Efeito para filtrar Pokémon
    useEffect(() => {
        const filterPokemons = async () => {
            setIsLoading(true);
            let pokemonList = [...pokemons];

            // Filtro por tipo
            if (selectedType !== 'all') {
                try {
                    const response = await fetch(`https://pokeapi.co/api/v2/type/${selectedType}`);
                    const typeData = await response.json();
                    const typePokemonNames = new Set(typeData.pokemon.map(p => p.pokemon.name));
                    pokemonList = pokemonList.filter(p => typePokemonNames.has(p.name));
                } catch (e) {
                    setError('Não foi possível filtrar por tipo.');
                    pokemonList = [];
                }
            }
            
            // Filtro por termo de busca
            if (searchTerm) {
                pokemonList = pokemonList.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
            }

            setFilteredPokemons(pokemonList);
            setIsLoading(false);
        };
        
        if (pokemons.length > 0) {
            filterPokemons();
        }
    }, [searchTerm, selectedType, pokemons]);

    // Efeito para buscar times salvos
    useEffect(() => {
        if (!isAuthReady || !db || !userId) return;
        const q = query(collection(db, `artifacts/${appId}/users/${userId}/teams`));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const teamsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSavedTeams(teamsData);
        }, () => setError("Não foi possível carregar os times salvos."));
        return () => unsubscribe();
    }, [isAuthReady, db, userId]);

    // Efeito para buscar detalhes dos pokemons no time
    useEffect(() => {
        currentTeam.forEach(pokemon => {
            if (!pokemonDetailsCache[pokemon.name]) {
                fetch(`https://pokeapi.co/api/v2/pokemon/${pokemon.id}`)
                    .then(res => res.json())
                    .then(data => {
                        const types = data.types.map(t => t.type.name);
                        setPokemonDetailsCache(prev => ({ ...prev, [pokemon.name]: { types } }));
                    })
                    .catch(console.error);
            }
        });
    }, [currentTeam, pokemonDetailsCache]);

    // Efeito para analisar o time
    useEffect(() => {
        if (currentTeam.length === 0) {
            setTeamAnalysis({ strengths: new Set(), weaknesses: {} });
            return;
        }

        const teamDetails = currentTeam.map(p => pokemonDetailsCache[p.name]).filter(Boolean);
        if (teamDetails.length !== currentTeam.length) return;

        const offensiveCoverage = new Set();
        const defensiveProfile = {};
        const allTypes = Object.keys(typeChart);

        allTypes.forEach(type => { defensiveProfile[type] = 0; });
        
        teamDetails.flatMap(details => details.types).forEach(attackerType => {
            Object.entries(typeChart[attackerType]?.damageDealt || {}).forEach(([defenderType, multiplier]) => {
                if (multiplier > 1) offensiveCoverage.add(defenderType);
            });
        });

        allTypes.forEach(attackingType => {
            let teamVulnerabilityScore = 0;
            teamDetails.forEach(pokemon => {
                let pokemonMultiplier = 1;
                pokemon.types.forEach(defendingType => {
                    pokemonMultiplier *= typeChart[defendingType]?.damageTaken[attackingType] ?? 1;
                });
                if (pokemonMultiplier > 1) {
                    teamVulnerabilityScore++;
                }
            });
            if (teamVulnerabilityScore > 0) {
                defensiveProfile[attackingType] = teamVulnerabilityScore;
            }
        });
        
        const finalWeaknesses = Object.entries(defensiveProfile)
            .filter(([, score]) => score > 0) // Lógica corrigida aqui
            .reduce((acc, [type, score]) => ({...acc, [type]: score}), {});

        setTeamAnalysis({ strengths: offensiveCoverage, weaknesses: finalWeaknesses });
    }, [currentTeam, pokemonDetailsCache]);


    // Funções de manipulação
    const showModal = (message, onConfirm = null) => setModal({ isOpen: true, message, onConfirm });
    const handleAddPokemonToTeam = (pokemon) => {
        if (currentTeam.length < 6 && !currentTeam.find(p => p.id === pokemon.id)) {
            setCurrentTeam([...currentTeam, pokemon]);
        } else if (currentTeam.length >= 6) {
            showModal("Seu time já está cheio (6 Pokémon)!");
        } else {
            showModal("Este Pokémon já está no seu time.");
        }
    };
    const handleRemoveFromTeam = (pokemonId) => setCurrentTeam(currentTeam.filter(p => p.id !== pokemonId));
    const handleClearTeam = () => { setCurrentTeam([]); setTeamName(''); setEditingTeamId(null); };
    const handleSaveTeam = async () => {
        if (!db || !userId) return showModal("Conexão não está pronta.");
        if (currentTeam.length === 0) return showModal("Seu time está vazio!");
        if (!teamName.trim()) return showModal("Por favor, dê um nome ao seu time.");
        const teamId = editingTeamId || doc(collection(db, `artifacts/${appId}/users/${userId}/teams`)).id;
        const teamData = { name: teamName, pokemons: currentTeam, isFavorite: savedTeams.find(t => t.id === editingTeamId)?.isFavorite || false, createdAt: new Date().toISOString() };
        try {
            await setDoc(doc(db, `artifacts/${appId}/users/${userId}/teams`, teamId), teamData);
            showModal(`Time "${teamName}" salvo!`);
            handleClearTeam();
        } catch (e) { showModal("Ocorreu um erro ao salvar o time."); }
    };
    const handleLoadTeam = (team) => { setCurrentTeam(team.pokemons); setTeamName(team.name); setEditingTeamId(team.id); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    const handleDeleteTeam = (teamId) => {
        showModal("Você tem certeza que quer deletar este time?", async () => {
            if (!db || !userId) return;
            try {
                await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/teams`, teamId));
                if (editingTeamId === teamId) handleClearTeam();
            } catch (e) { showModal("Ocorreu um erro ao deletar."); }
        });
    };
    const handleToggleFavorite = async (team) => {
        if (!db || !userId) return;
        try { await setDoc(doc(db, `artifacts/${appId}/users/${userId}/teams`, team.id), { ...team, isFavorite: !team.isFavorite }); }
        catch (e) { showModal("Não foi possível atualizar o favorito."); }
    };
    const sortedTeams = useMemo(() => [...savedTeams].sort((a, b) => (b.isFavorite ? 1 : -1) - (a.isFavorite ? 1 : -1) || new Date(b.createdAt) - new Date(a.createdAt)), [savedTeams]);
    
    if (error) return <div className="h-screen w-full flex items-center justify-center bg-red-100 text-red-700 p-4">{error}</div>;

    return (
      <div className="min-h-screen text-white font-sans p-4 sm:p-6 lg:p-8" style={{ backgroundColor: COLORS.background }}>
        {modal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
            <div className="rounded-lg p-8 shadow-2xl w-full max-w-sm text-center" style={{backgroundColor: COLORS.card}}>
              <p className="mb-6 text-lg">{modal.message}</p>
              <div className="flex justify-center gap-4">
                {modal.onConfirm && <button onClick={() => setModal({ isOpen: false })} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg">Cancel</button>}
                <button onClick={() => { modal.onConfirm?.(); setModal({ isOpen: false }); }} style={{backgroundColor: COLORS.primary, color: COLORS.background}} className="font-bold py-2 px-6 rounded-lg">OK</button>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto">
          <header className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-wider" style={{ fontFamily: "'Press Start 2P', cursive", color: COLORS.primary }}>Pokémon Team Builder</h1>
            {userId && <p className="text-xs mt-2" style={{color: COLORS.textMuted}}>User ID: {userId}</p>}
          </header>

          <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-8">
              <section className="p-6 rounded-xl shadow-lg sticky top-8" style={{backgroundColor: COLORS.card}}>
                <h2 className="text-2xl font-bold mb-4 border-b-2 pb-2" style={{borderColor: COLORS.primary}}>Current Team</h2>
                <input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Team Name" className="w-full text-white p-3 rounded-lg border-2 focus:outline-none" style={{backgroundColor: COLORS.cardLight, borderColor: 'transparent'}}/>
                <div className="grid grid-cols-3 gap-4 min-h-[120px] p-4 rounded-lg mt-4" style={{backgroundColor: 'rgba(0,0,0,0.2)'}}>
                  {currentTeam.map(pokemon => (
                    <div key={pokemon.id} className="text-center relative group">
                      <img src={pokemon.sprite} alt={pokemon.name} className="mx-auto h-20 w-20" />
                      <p className="text-xs capitalize truncate">{pokemon.name}</p>
                      <button onClick={() => handleRemoveFromTeam(pokemon.id)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full h-6 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-sm">X</button>
                    </div>
                  ))}
                  {Array.from({ length: 6 - currentTeam.length }).map((_, i) => <div key={i} className="border-2 border-dashed rounded-lg flex items-center justify-center" style={{borderColor: COLORS.cardLight, backgroundColor: 'transparent'}}><span className="text-3xl font-bold" style={{color: COLORS.textMuted}}>?</span></div>)}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <button onClick={handleSaveTeam} className="w-full flex items-center justify-center font-bold py-2 px-4 rounded-lg" style={{backgroundColor: COLORS.primary, color: COLORS.background}}> <SaveIcon /> {editingTeamId ? 'Update' : 'Save'} Team </button>
                  <button onClick={handleClearTeam} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Clear</button>
                </div>
              </section>

              {currentTeam.length > 0 && (
              <section className="p-6 rounded-xl shadow-lg" style={{ backgroundColor: COLORS.card }}>
                  <h3 className="text-xl font-bold mb-4">Team Analysis</h3>
                  <div>
                    <h4 className="font-semibold mb-2 text-green-400">Offensive Coverage:</h4>
                    <div className="flex flex-wrap">
                      {Array.from(teamAnalysis.strengths).sort().map(type => <TypeBadge key={type} type={type} />)}
                    </div>
                  </div>
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2 text-red-400">Defensive Weaknesses:</h4>
                    <div className="flex flex-wrap">
                      {Object.keys(teamAnalysis.weaknesses).length > 0 ? Object.entries(teamAnalysis.weaknesses).sort(([,a],[,b]) => b-a).map(([type, score]) => (
                        <div key={type} className="flex items-center mr-2 mb-1">
                          <TypeBadge type={type} />
                          <span className="text-xs text-red-300">({score}x)</span>
                        </div>
                      )) : <p className="text-sm" style={{color: COLORS.textMuted}}>Your team is solid as a rock!</p>}
                    </div>
                  </div>
                </section>
              )}

              <section className="p-6 rounded-xl shadow-lg" style={{backgroundColor: COLORS.card}}>
                <h2 className="text-2xl font-bold mb-4 border-b-2 pb-2" style={{borderColor: COLORS.primary}}>Saved Teams</h2>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                   {sortedTeams.length > 0 ? sortedTeams.map(team => (
                    <div key={team.id} className="p-4 rounded-lg flex items-center justify-between transition-colors" style={{backgroundColor: COLORS.cardLight}}>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-lg truncate">{team.name}</p>
                        <div className="flex mt-1">
                          {team.pokemons.map(p => <img key={p.id} src={p.sprite} alt={p.name} className="h-8 w-8 -ml-2 border-2 rounded-full" style={{borderColor: COLORS.cardLight, backgroundColor: COLORS.card}} />)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <button onClick={() => handleToggleFavorite(team)} title="Favorite"><StarIcon isFavorite={team.isFavorite} /></button>
                        <button onClick={() => handleLoadTeam(team)} className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold py-1 px-3 rounded-full">Load</button>
                        <button onClick={() => handleDeleteTeam(team.id)} className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full"><TrashIcon /></button>
                      </div>
                    </div>
                  )) : <p className="text-center py-4" style={{color: COLORS.textMuted}}>No teams saved yet.</p>}
                </div>
              </section>
            </div>

            <div className="lg:col-span-2">
              <section className="p-6 rounded-xl shadow-lg" style={{backgroundColor: COLORS.card}}>
                <h2 className="text-2xl font-bold mb-4">Choose your Pokémon!</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <input type="text" placeholder="Search Pokémon..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-3 rounded-lg border-2 focus:outline-none" style={{backgroundColor: COLORS.cardLight, borderColor: 'transparent'}}/>
                  <select value={selectedType} onChange={e => setSelectedType(e.target.value)} className="w-full p-3 rounded-lg border-2 focus:outline-none appearance-none capitalize" style={{backgroundColor: COLORS.cardLight, borderColor: 'transparent'}}>
                    <option value="all">All Types</option>
                    {Object.keys(typeColors).map(type => <option key={type} value={type} className="capitalize">{type}</option>)}
                  </select>
                </div>
                
                {isLoading ? (
                   <div className="text-center p-10">
                     <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{borderColor: COLORS.primary}}></div>
                     <p className="mt-4">Loading Pokémon...</p>
                   </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-[80vh] overflow-y-auto p-2 custom-scrollbar">
                    {filteredPokemons.length > 0 ? filteredPokemons.map(pokemon => (
                      <div key={pokemon.id} className="rounded-lg p-3 text-center cursor-pointer hover:shadow-xl transform hover:-translate-y-1 transition-all group relative" style={{backgroundColor: COLORS.cardLight}} onClick={() => handleAddPokemonToTeam(pokemon)}>
                        <img src={pokemon.sprite} alt={pokemon.name} className="mx-auto h-24 w-24 group-hover:scale-110 transition-transform" />
                        <p className="mt-2 text-sm font-semibold capitalize">{pokemon.name}</p>
                         <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-blue-500 text-white rounded-full p-1"><PlusIcon/></div>
                        </div>
                      </div>
                    )) : <p className="col-span-full text-center py-8" style={{color: COLORS.textMuted}}>No Pokémon found :/ </p>}
                  </div>
                )}
              </section>
            </div>
          </main>

          <footer className="text-center mt-12 py-6 border-t" style={{borderColor: COLORS.cardLight}}>
            <p className="text-sm" style={{color: COLORS.textMuted}}>Developed by Enzo Esmeraldo</p>
            <p className="text-xs mt-2" style={{color: COLORS.textMuted}}>
              Using the <a href="https://pokeapi.co/" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">PokéAPI</a>. Pokémon and their names are trademarks of Nintendo.
            </p>
            <div className="flex justify-center gap-4 mt-4">
              <a href="https://github.com/ensinho" target="_blank" rel="noopener noreferrer" className="hover:text-white" style={{color: COLORS.textMuted}}><GithubIcon /></a>
              <a href="https://www.linkedin.com/in/enzo-esmeraldo-458327244/" target="_blank" rel="noopener noreferrer" className="hover:text-white" style={{color: COLORS.textMuted}}><LinkedinIcon /></a>
            </div>
          </footer>
        </div>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
          .custom-scrollbar::-webkit-scrollbar { width: 8px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: ${COLORS.card}; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background-color: ${COLORS.primary}; border-radius: 20px; border: 3px solid ${COLORS.card}; }
        `}</style>
      </div>
    );
}
