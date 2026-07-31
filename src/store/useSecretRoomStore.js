import { create } from 'zustand';
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    onSnapshot,
    deleteDoc,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { appId } from '../constants/firebase';
import { useAuthStore } from './useAuthStore';
import { useToastStore } from './useToastStore';
import {
    loadPokemonIndex,
    getPokemonApiData,
    getPokemonSpeciesData,
    getEvolutionChainData,
} from '../services/pokemonDataCache';
import { evaluateAttributeQuestion, comparePokemonGuess, getPokemonGeneration } from '../utils/pokemonQuestionEvaluator';

const pokeroomsPath = () => `artifacts/${appId}/pokerooms`;

let roomUnsub = null;

/** Depth of `speciesName` within an evolution chain node (1-based), or null. */
const findChainDepth = (node, speciesName, depth = 1) => {
    if (!node) return null;
    if (node.species?.name === speciesName) return depth;
    for (const next of node.evolves_to || []) {
        const found = findChainDepth(next, speciesName, depth + 1);
        if (found) return found;
    }
    return null;
};

/** Longest path through an evolution chain, i.e. how many stages the line has. */
const chainMaxDepth = (node, depth = 1) => {
    const children = node?.evolves_to || [];
    if (!children.length) return depth;
    return Math.max(...children.map((child) => chainMaxDepth(child, depth + 1)));
};

/**
 * Build the record the room stores as its secret.
 *
 * The Pokémon index carries only id/name/types/generation/baseStats, so
 * questions about height, weight or evolution stage had no data to read and
 * every one of them was answered "no". This resolves those once — when the
 * secret is drawn — so all clients evaluate against the same complete record
 * without any per-question fetching.
 *
 * Every field is explicitly null-defaulted: Firestore rejects `undefined`.
 */
const buildSecretRecord = async (entry) => {
    const base = {
        id: Number(entry.id),
        name: entry.name,
        types: Array.isArray(entry.types) ? entry.types : [],
        generation: entry.generation || null,
        baseStats: entry.baseStats || null,
        heightDm: null,
        weightHg: null,
        evolutionStage: null,
        evolutionStageCount: null,
        isBaby: false,
    };

    try {
        const detail = await getPokemonApiData(base.id);
        if (Number.isFinite(Number(detail?.height))) base.heightDm = Number(detail.height);
        if (Number.isFinite(Number(detail?.weight))) base.weightHg = Number(detail.weight);
    } catch (_) {
        // Offline / API down — height & weight questions will report "unknown"
        // rather than a wrong "no".
    }

    try {
        const species = await getPokemonSpeciesData(base.id);
        base.isBaby = Boolean(species?.is_baby);

        const chainUrl = species?.evolution_chain?.url;
        if (chainUrl) {
            const chainData = await getEvolutionChainData(chainUrl);
            const root = chainData?.chain;
            if (root) {
                const speciesName = species?.name || base.name;
                base.evolutionStage = findChainDepth(root, speciesName);
                base.evolutionStageCount = chainMaxDepth(root);
            }
        }
    } catch (_) {
        // Same contract: absent stage data yields "unknown", never a false "no".
    }

    return base;
};

const generateRoomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i += 1) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `PKMN-${code}`;
};

export const useSecretRoomStore = create((set, get) => ({
    currentRoom: null,
    isLoadingRoom: false,
    pokemonIndexCache: [],

    loadIndex: async () => {
        if (get().pokemonIndexCache.length > 0) return get().pokemonIndexCache;
        try {
            const index = await loadPokemonIndex();
            set({ pokemonIndexCache: index });
            return index;
        } catch (err) {
            console.error('Failed to load pokemon index for PokéRoom:', err);
            return [];
        }
    },

    subscribeToRoom: (roomId) => {
        if (!db || !roomId) return;
        if (roomUnsub) roomUnsub();

        set({ isLoadingRoom: true });

        const roomRef = doc(db, pokeroomsPath(), roomId);
        roomUnsub = onSnapshot(
            roomRef,
            (snap) => {
                if (snap.exists()) {
                    set({ currentRoom: { id: snap.id, ...snap.data() }, isLoadingRoom: false });
                } else {
                    set({ currentRoom: null, isLoadingRoom: false });
                }
            },
            (err) => {
                console.error('Error listening to room:', err);
                set({ isLoadingRoom: false });
            }
        );
    },

    leaveRoom: async () => {
        if (roomUnsub) roomUnsub();
        roomUnsub = null;

        const { currentRoom } = get();
        const { userId } = useAuthStore.getState();

        if (currentRoom && userId && db) {
            const roomRef = doc(db, pokeroomsPath(), currentRoom.id);
            const updatedPlayers = (currentRoom.players || []).filter((p) => p.userId !== userId);
            try {
                if (updatedPlayers.length === 0) {
                    await deleteDoc(roomRef);
                } else {
                    await updateDoc(roomRef, {
                        players: updatedPlayers,
                        lastActivityAt: new Date().toISOString(),
                    });
                }
            } catch (_) {
                // Best-effort cleanup — leaving locally must succeed regardless.
            }
        }
        set({ currentRoom: null });
    },

    createRoom: async ({ gameMode = 'secret-pokemon', genFilter = 'all', maxRounds = 5 }) => {
        const authState = useAuthStore.getState();
        const showToast = useToastStore.getState().showToast;
        const { userId } = authState;

        if (!db || !userId) {
            showToast('Entre na sua conta para criar uma sala.', 'warning');
            return null;
        }

        const roomCode = generateRoomCode();
        const roomRef = doc(db, pokeroomsPath(), roomCode);
        const myAvatar = authState.publicAvatar();

        const hostPlayer = {
            userId,
            displayName: authState.trainerDisplayName() || 'Trainer',
            avatar: myAvatar,
            score: 0,
            secretPokemon: null,
        };

        const now = new Date().toISOString();

        try {
            await setDoc(roomRef, {
                code: roomCode,
                hostId: userId,
                hostName: hostPlayer.displayName,
                gameMode,
                genFilter,
                maxRounds: Number(maxRounds) || 5,
                currentRound: 1,
                status: 'lobby',
                players: [hostPlayer],
                currentTurnIndex: 0,
                sharedSecretPokemon: null,
                questionsLog: [],
                winnerId: null,
                createdAt: now,
                lastActivityAt: now,
            });

            get().subscribeToRoom(roomCode);
            showToast(`Sala ${roomCode} criada!`, 'success');
            return roomCode;
        } catch (err) {
            console.error('Failed to create room:', err);
            showToast('Não foi possível criar a sala.', 'error');
            return null;
        }
    },

    joinRoom: async (roomCodeInput) => {
        const authState = useAuthStore.getState();
        const showToast = useToastStore.getState().showToast;
        const { userId } = authState;

        if (!db || !userId) return false;
        const code = String(roomCodeInput || '').trim().toUpperCase();
        if (!code) return false;

        const roomRef = doc(db, pokeroomsPath(), code);
        try {
            const snap = await getDoc(roomRef);
            if (!snap.exists()) {
                showToast('Sala não encontrada!', 'error');
                return false;
            }

            const data = snap.data();
            const existingPlayers = data.players || [];
            const isAlreadyIn = existingPlayers.some((p) => p.userId === userId);

            if (!isAlreadyIn) {
                if (data.status !== 'lobby') {
                    showToast('A partida já começou!', 'warning');
                    return false;
                }

                const myAvatar = authState.publicAvatar();
                const newPlayer = {
                    userId,
                    displayName: authState.trainerDisplayName() || 'Trainer',
                    avatar: myAvatar,
                    score: 0,
                    secretPokemon: null,
                };

                await updateDoc(roomRef, {
                    players: [...existingPlayers, newPlayer],
                    lastActivityAt: new Date().toISOString(),
                });
            }

            get().subscribeToRoom(code);
            showToast('Você entrou na sala!', 'success');
            return true;
        } catch (err) {
            console.error('Failed to join room:', err);
            showToast('Não foi possível entrar na sala.', 'error');
            return false;
        }
    },

    startGame: async () => {
        const { currentRoom } = get();
        if (!db || !currentRoom) return;

        const index = await get().loadIndex();
        if (!index.length) return;

        // Filter index by generation if configured
        let candidates = index;
        if (currentRoom.genFilter && currentRoom.genFilter !== 'all') {
            if (currentRoom.genFilter === 'gen1-3') {
                candidates = index.filter((p) => getPokemonGeneration(p.id) <= 3);
            } else if (currentRoom.genFilter === 'gen1-5') {
                candidates = index.filter((p) => getPokemonGeneration(p.id) <= 5);
            }
        }

        const getRandomPokemon = () => candidates[Math.floor(Math.random() * candidates.length)];

        const roomRef = doc(db, pokeroomsPath(), currentRoom.id);
        const now = new Date().toISOString();

        if (currentRoom.gameMode === 'secret-pokemon') {
            const secret = await buildSecretRecord(getRandomPokemon());
            await updateDoc(roomRef, {
                status: 'playing',
                sharedSecretPokemon: secret,
                questionsLog: [],
                currentTurnIndex: 0,
                lastActivityAt: now,
            });
        } else {
            // "Quem Sou Eu?": Assign a secret Pokemon to each player
            const players = currentRoom.players || [];
            const secrets = await Promise.all(players.map(() => buildSecretRecord(getRandomPokemon())));
            const updatedPlayers = players.map((p, index) => ({
                ...p,
                secretPokemon: secrets[index],
            }));

            await updateDoc(roomRef, {
                status: 'playing',
                players: updatedPlayers,
                questionsLog: [],
                currentTurnIndex: 0,
                lastActivityAt: now,
            });
        }
    },

    submitQuestion: async (questionObj, questionLabel, userFavorites = []) => {
        const { currentRoom } = get();
        const { userId, trainerDisplayName } = useAuthStore.getState();
        if (!db || !currentRoom || !userId) return { rejected: true };

        const players = currentRoom.players || [];
        const currentPlayer = players[currentRoom.currentTurnIndex];
        if (currentPlayer?.userId !== userId) {
            useToastStore.getState().showToast('Espere a sua vez!', 'warning');
            return { rejected: true };
        }

        // Determine target secret Pokemon
        let targetSecret = null;
        if (currentRoom.gameMode === 'secret-pokemon') {
            targetSecret = currentRoom.sharedSecretPokemon;
        } else {
            targetSecret = currentPlayer.secretPokemon;
        }

        if (!targetSecret) return { rejected: true };

        const evalResult = evaluateAttributeQuestion(questionObj, targetSecret, userFavorites);

        // An unanswerable question must not be logged: a "NÃO" would read as a
        // fact about the secret Pokémon when it only means the evaluator lacked
        // the data (or never understood the question). Keep the player's turn.
        if (evalResult.unknown) {
            useToastStore.getState().showToast(
                evalResult.hint ? `Não foi possível responder: ${evalResult.hint}.` : 'Não entendi essa pergunta.',
                'warning'
            );
            return { rejected: true, hint: evalResult.hint || null };
        }

        const logEntry = {
            id: `q-${Date.now()}`,
            round: currentRoom.currentRound,
            userId,
            userName: trainerDisplayName() || 'Trainer',
            questionLabel,
            questionObj,
            answer: evalResult.answer,
            isDirectGuess: false,
            createdAt: new Date().toISOString(),
        };

        const nextTurnIndex = (currentRoom.currentTurnIndex + 1) % players.length;
        const roomRef = doc(db, pokeroomsPath(), currentRoom.id);

        await updateDoc(roomRef, {
            questionsLog: [logEntry, ...(currentRoom.questionsLog || [])],
            currentTurnIndex: nextTurnIndex,
            lastActivityAt: new Date().toISOString(),
        });

        return { rejected: false, answer: evalResult.answer };
    },

    submitDirectGuess: async (guessedPokemon) => {
        const { currentRoom } = get();
        const { userId, trainerDisplayName } = useAuthStore.getState();
        const showToast = useToastStore.getState().showToast;
        if (!db || !currentRoom || !userId || !guessedPokemon) return { rejected: true };

        const players = currentRoom.players || [];
        const turnPlayerIndex = currentRoom.currentTurnIndex;
        const currentPlayer = players[turnPlayerIndex];
        if (currentPlayer?.userId !== userId) {
            showToast('Espere a sua vez!', 'warning');
            return { rejected: true };
        }

        let targetSecret = null;
        if (currentRoom.gameMode === 'secret-pokemon') {
            targetSecret = currentRoom.sharedSecretPokemon;
        } else {
            targetSecret = currentPlayer.secretPokemon;
        }

        if (!targetSecret) return { rejected: true };

        const comparison = comparePokemonGuess(guessedPokemon, targetSecret);
        const isCorrect = comparison.isExact;

        const logEntry = {
            id: `g-${Date.now()}`,
            round: currentRoom.currentRound,
            userId,
            userName: trainerDisplayName() || 'Trainer',
            questionLabel: `Palpite: ${guessedPokemon.name}`,
            isDirectGuess: true,
            guessedPokemon,
            isCorrect,
            comparison,
            createdAt: new Date().toISOString(),
        };

        const roomRef = doc(db, pokeroomsPath(), currentRoom.id);

        if (isCorrect) {
            // Update player's score
            const updatedPlayers = players.map((p) => {
                if (p.userId === userId) {
                    return { ...p, score: (p.score || 0) + 100 };
                }
                return p;
            });

            const isGameFinished = currentRoom.currentRound >= currentRoom.maxRounds;

            await updateDoc(roomRef, {
                questionsLog: [logEntry, ...(currentRoom.questionsLog || [])],
                players: updatedPlayers,
                status: isGameFinished ? 'ended' : 'roundResult',
                winnerId: userId,
                lastActivityAt: new Date().toISOString(),
            });

            showToast('Acertou! +100 pontos.', 'success');
            return { rejected: false, isCorrect: true };
        } else {
            const nextTurnIndex = (turnPlayerIndex + 1) % players.length;
            await updateDoc(roomRef, {
                questionsLog: [logEntry, ...(currentRoom.questionsLog || [])],
                currentTurnIndex: nextTurnIndex,
                lastActivityAt: new Date().toISOString(),
            });
            showToast('Palpite incorreto!', 'error');
            return { rejected: false, isCorrect: false };
        }
    },

    nextRound: async () => {
        const { currentRoom } = get();
        if (!db || !currentRoom) return;

        const roomRef = doc(db, pokeroomsPath(), currentRoom.id);
        // Deliberately *not* passing through 'lobby': `startGame()` below sets
        // 'playing' one round-trip later, and with rounds advancing automatically
        // that intermediate state would flash the waiting room on every client.
        await updateDoc(roomRef, {
            currentRound: currentRoom.currentRound + 1,
            winnerId: null,
            lastActivityAt: new Date().toISOString(),
        });
        await get().startGame();
    },
}));
