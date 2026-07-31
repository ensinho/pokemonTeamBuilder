import { create } from 'zustand';
import {
    collection,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    onSnapshot,
    deleteDoc,
    arrayUnion,
    arrayRemove,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { appId } from '../constants/firebase';
import { useAuthStore } from './useAuthStore';
import { useToastStore } from './useToastStore';
import { loadPokemonIndex } from '../services/pokemonDataCache';
import { evaluateAttributeQuestion, comparePokemonGuess, getPokemonGeneration } from '../utils/pokemonQuestionEvaluator';

const pokeroomsPath = () => `artifacts/${appId}/pokerooms`;

let roomUnsub = null;

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
    stealthMode: false,
    pokemonIndexCache: [],

    toggleStealthMode: () => set((state) => ({ stealthMode: !state.stealthMode })),

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
            } catch (_) {}
        }
        set({ currentRoom: null });
    },

    createRoom: async ({ gameMode = 'secret-pokemon', genFilter = 'all', maxRounds = 5 }) => {
        const authState = useAuthStore.getState();
        const showToast = useToastStore.getState().showToast;
        const { userId, isAnonymous } = authState;

        if (!db || !userId) {
            showToast('Sign in to create a room.', 'warning');
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
            showToast(`Room ${roomCode} created!`, 'success');
            return roomCode;
        } catch (err) {
            console.error('Failed to create room:', err);
            showToast('Could not create room.', 'error');
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
                showToast('Room not found!', 'error');
                return false;
            }

            const data = snap.data();
            const existingPlayers = data.players || [];
            const isAlreadyIn = existingPlayers.some((p) => p.userId === userId);

            if (!isAlreadyIn) {
                if (data.status !== 'lobby') {
                    showToast('Game already in progress!', 'warning');
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
            showToast('Joined room!', 'success');
            return true;
        } catch (err) {
            console.error('Failed to join room:', err);
            showToast('Could not join room.', 'error');
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
            const secret = getRandomPokemon();
            await updateDoc(roomRef, {
                status: 'playing',
                sharedSecretPokemon: secret,
                questionsLog: [],
                currentTurnIndex: 0,
                lastActivityAt: now,
            });
        } else {
            // "Quem Sou Eu?": Assign a secret Pokemon to each player
            const updatedPlayers = (currentRoom.players || []).map((p) => ({
                ...p,
                secretPokemon: getRandomPokemon(),
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
        if (!db || !currentRoom || !userId) return;

        const players = currentRoom.players || [];
        const currentPlayer = players[currentRoom.currentTurnIndex];
        if (currentPlayer?.userId !== userId) {
            useToastStore.getState().showToast('Wait for your turn!', 'warning');
            return;
        }

        // Determine target secret Pokemon
        let targetSecret = null;
        if (currentRoom.gameMode === 'secret-pokemon') {
            targetSecret = currentRoom.sharedSecretPokemon;
        } else {
            targetSecret = currentPlayer.secretPokemon;
        }

        if (!targetSecret) return;

        const evalResult = evaluateAttributeQuestion(questionObj, targetSecret, userFavorites);

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
    },

    submitDirectGuess: async (guessedPokemon) => {
        const { currentRoom } = get();
        const { userId, trainerDisplayName } = useAuthStore.getState();
        const showToast = useToastStore.getState().showToast;
        if (!db || !currentRoom || !userId || !guessedPokemon) return;

        const players = currentRoom.players || [];
        const turnPlayerIndex = currentRoom.currentTurnIndex;
        const currentPlayer = players[turnPlayerIndex];
        if (currentPlayer?.userId !== userId) {
            showToast('Wait for your turn!', 'warning');
            return;
        }

        let targetSecret = null;
        if (currentRoom.gameMode === 'secret-pokemon') {
            targetSecret = currentRoom.sharedSecretPokemon;
        } else {
            targetSecret = currentPlayer.secretPokemon;
        }

        if (!targetSecret) return;

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

            showToast('Correct guess! Point awarded!', 'success');
        } else {
            const nextTurnIndex = (turnPlayerIndex + 1) % players.length;
            await updateDoc(roomRef, {
                questionsLog: [logEntry, ...(currentRoom.questionsLog || [])],
                currentTurnIndex: nextTurnIndex,
                lastActivityAt: new Date().toISOString(),
            });
            showToast('Incorrect guess!', 'error');
        }
    },

    nextRound: async () => {
        const { currentRoom } = get();
        if (!db || !currentRoom) return;

        const roomRef = doc(db, pokeroomsPath(), currentRoom.id);
        await updateDoc(roomRef, {
            currentRound: currentRoom.currentRound + 1,
            status: 'lobby',
            winnerId: null,
            lastActivityAt: new Date().toISOString(),
        });
        await get().startGame();
    },
}));
