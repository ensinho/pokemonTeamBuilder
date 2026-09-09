import { create } from 'zustand';
import { db } from '../services/firebase';
import {
    collection,
    doc,
    query,
    orderBy,
    onSnapshot,
    setDoc,
    updateDoc,
    deleteDoc,
    increment,
    arrayUnion,
    arrayRemove,
    getDoc
} from 'firebase/firestore';
import { appId } from '../constants/firebase';
import { useAuthStore } from './useAuthStore';
import { toast } from './useToastStore';
import { t } from '../utils/translate';
import { navigateTo, promptSignIn } from '../utils/navigation';
import { getPokemonArtworkSpriteUrl, getPokemonFrontSpriteUrl } from '../utils/pokemonSprites';
import { megaDisplayName } from '../hooks/useMegaStones';

let topicsUnsubscribe = null;
let messagesUnsubscribe = null;

// Canonical, always-present topics the app seeds automatically. `general` backs
// the forum chat. Authored by 'system' (Professor Oak).
const BASE_TOPICS = {
    general: {
        title: 'Chat',
        category: 'general',
        lastMessageText: 'Welcome to Gengar Forum! Share your teams and chat with other trainers here.',
    },
};

let cachedMegaStones = null;
const getMegaStones = async () => {
    if (cachedMegaStones) return cachedMegaStones;
    try {
        const basePath = import.meta.env.BASE_URL || '/';
        const url = `${basePath}data/mega-stones.json`.replace(/([^:])\/{2,}/g, '$1/');
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            cachedMegaStones = data?.byStone || {};
            return cachedMegaStones;
        }
    } catch (e) {
        console.error("Failed to load mega stones in store", e);
    }
    return {};
};

const serializeTeamPokemon = (pokemon, megaStones = null) => {
    const item = pokemon?.customization?.item;
    const mega = (item && megaStones) ? megaStones[item] : null;
    const isMega = mega && mega.baseId === pokemon.id;
    
    const spriteId = isMega ? mega.spriteId : pokemon.id;
    const displayName = isMega ? megaDisplayName(mega.form) : pokemon.name;
    const types = (isMega && mega?.types) ? mega.types : (pokemon?.types || []);

    return {
        id: pokemon.id,
        name: displayName,
        types,
        sprite: getPokemonArtworkSpriteUrl(spriteId),
        shinySprite: getPokemonArtworkSpriteUrl(spriteId, { shiny: true }),
        animatedSprite: getPokemonFrontSpriteUrl(spriteId),
        animatedShinySprite: getPokemonFrontSpriteUrl(spriteId, { shiny: true }),
        instanceId: pokemon.instanceId,
        customization: pokemon.customization || {},
    };
};

export const useForumStore = create((set, get) => ({
    topics: [],
    currentTopicId: null,
    messages: [],
    isInitialLoadingTopics: false,
    isInitialLoadingMessages: false,

    setCurrentTopicId: (topicId) => {
        set({ currentTopicId: topicId });
        if (topicId) {
            get().initMessagesListener(topicId);
        } else {
            get().cleanupMessagesListener();
            set({ messages: [] });
        }
    },

    initTopicsListener: () => {
        if (!db) return;
        if (topicsUnsubscribe) return;

        set({ isInitialLoadingTopics: true });

        const topicsRef = collection(db, `artifacts/${appId}/public/data/forumTopics`);
        const q = query(topicsRef, orderBy('lastActivityAt', 'desc'));

        topicsUnsubscribe = onSnapshot(q, (snapshot) => {
            const topicsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            set({ topics: topicsList, isInitialLoadingTopics: false });

            // Seed any canonical topic that isn't present yet (general chat + teams feed)
            Object.keys(BASE_TOPICS).forEach((topicId) => {
                if (!topicsList.some(t => t.id === topicId)) {
                    get().ensureBaseTopicExists(topicId);
                }
            });
        }, (error) => {
            console.error("Error loading forum topics:", error);
            set({ isInitialLoadingTopics: false });
        });
    },

    // Create a canonical base topic (general/teams) if missing. Idempotent.
    ensureBaseTopicExists: async (topicId) => {
        if (!db) return;
        const config = BASE_TOPICS[topicId];
        if (!config) return;
        const docRef = doc(db, `artifacts/${appId}/public/data/forumTopics`, topicId);
        try {
            const snap = await getDoc(docRef);
            if (!snap.exists()) {
                await setDoc(docRef, {
                    title: config.title,
                    category: config.category,
                    createdAt: new Date().toISOString(),
                    createdBy: 'system',
                    creatorName: 'Professor Oak',
                    creatorAvatar: 25, // Pikachu
                    creatorAvatarIsShiny: false,
                    lastActivityAt: new Date().toISOString(),
                    messageCount: 0,
                    lastMessageText: config.lastMessageText,
                });
            }
        } catch (err) {
            console.error(`Error ensuring base topic '${topicId}' exists:`, err);
        }
    },

    initMessagesListener: (topicId) => {
        if (!db) return;
        get().cleanupMessagesListener();

        set({ isInitialLoadingMessages: true, messages: [] });

        const messagesRef = collection(db, `artifacts/${appId}/public/data/forumTopics/${topicId}/messages`);
        const q = query(messagesRef, orderBy('createdAt', 'asc'));

        messagesUnsubscribe = onSnapshot(q, (snapshot) => {
            const msgList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            set({ messages: msgList, isInitialLoadingMessages: false });
        }, (error) => {
            console.error(`Error loading messages for topic ${topicId}:`, error);
            set({ isInitialLoadingMessages: false });
        });
    },

    cleanupTopicsListener: () => {
        if (topicsUnsubscribe) {
            topicsUnsubscribe();
            topicsUnsubscribe = null;
        }
    },

    cleanupMessagesListener: () => {
        if (messagesUnsubscribe) {
            messagesUnsubscribe();
            messagesUnsubscribe = null;
        }
    },

    createTopic: async (title, category, firstMessageText, attachedTeam = null) => {
        if (!db) return null;
        const authState = useAuthStore.getState();
        if (!authState.userId) {
            toast.warning(t('toast.signInRequired'), {
                description: t('toast.signInForTopics'),
                actions: [{ label: t('toast.signIn'), onClick: () => promptSignIn('signUp') }],
            });
            return null;
        }

        const cleanTitle = title.trim();
        if (!cleanTitle) {
            toast.warning(t('toast.topicTitleRequired'));
            return null;
        }

        try {
            const topicCollectionRef = collection(db, `artifacts/${appId}/public/data/forumTopics`);
            const newTopicRef = doc(topicCollectionRef);
            const topicId = newTopicRef.id;

            const creatorName = authState.displayName || (authState.userEmail ? authState.userEmail.split('@')[0] : 'Guest Trainer');
            // Avatar denormalized onto the doc with the user's pokemon/trainer
            // preference already applied, so readers need no extra lookup.
            const authorAvatar = authState.publicAvatar();

            let serializedAttachedTeam = null;
            if (attachedTeam && attachedTeam.pokemons) {
                const megaStones = await getMegaStones();
                serializedAttachedTeam = {
                    ...attachedTeam,
                    pokemons: attachedTeam.pokemons.map(p => serializeTeamPokemon(p, megaStones))
                };
            }

            const topicData = {
                title: cleanTitle,
                category: category || 'general',
                createdAt: new Date().toISOString(),
                createdBy: authState.userId,
                creatorName: creatorName,
                creatorAvatar: authorAvatar.pokemonId,
                creatorAvatarIsShiny: authorAvatar.isShiny,
                creatorTrainerSprite: authorAvatar.trainerSprite,
                creatorBadgeId: authState.selectedBadgeId || null,
                lastActivityAt: new Date().toISOString(),
                messageCount: 1,
                lastMessageText: firstMessageText ? firstMessageText.substring(0, 100) : (serializedAttachedTeam ? `Shared team: ${serializedAttachedTeam.name}` : '')
            };

            await setDoc(newTopicRef, topicData);

            const firstMsgRef = doc(collection(db, `artifacts/${appId}/public/data/forumTopics/${topicId}/messages`));
            const firstMsgData = {
                text: firstMessageText || '',
                createdAt: new Date().toISOString(),
                createdBy: authState.userId,
                creatorName: creatorName,
                creatorAvatar: authorAvatar.pokemonId,
                creatorAvatarIsShiny: authorAvatar.isShiny,
                creatorTrainerSprite: authorAvatar.trainerSprite,
                creatorBadgeId: authState.selectedBadgeId || null,
                sharedTeam: serializedAttachedTeam
            };
            await setDoc(firstMsgRef, firstMsgData);

            toast.success(t('toast.topicCreated'), {
                description: cleanTitle,
                // The feed picks its topic from the store, not the URL, so
                // select it before navigating or /feed lands on 'general'.
                actions: [{
                    label: t('toast.openTopic'),
                    onClick: () => { get().setCurrentTopicId(topicId); navigateTo('/feed'); },
                }],
            });
            return topicId;
        } catch (err) {
            console.error("Error creating topic:", err);
            toast.error(t('toast.topicCreateError'));
            return null;
        }
    },

    // `battleInvite` is {battleId, mode, challengerName}: a pointer to an open
    // battle, not a copy of its state — the card reads the live document so
    // everyone sees the moment it is claimed.
    sendMessage: async (topicId, text, attachedTeam = null, replyTo = null, battleInvite = null) => {
        if (!db) return false;
        const authState = useAuthStore.getState();
        if (!authState.userId) {
            toast.warning(t('toast.signInRequired'), {
                description: t('toast.signInForTopics'),
                actions: [{ label: t('toast.signIn'), onClick: () => promptSignIn('signUp') }],
            });
            return false;
        }

        const cleanText = text.trim();
        if (!cleanText && !attachedTeam && !battleInvite) {
            return false;
        }

        try {
            const creatorName = authState.displayName || (authState.userEmail ? authState.userEmail.split('@')[0] : 'Guest Trainer');
            // Avatar denormalized onto the doc with the user's pokemon/trainer
            // preference already applied, so readers need no extra lookup.
            const authorAvatar = authState.publicAvatar();
            const messageRef = doc(collection(db, `artifacts/${appId}/public/data/forumTopics/${topicId}/messages`));

            let serializedAttachedTeam = null;
            if (attachedTeam && attachedTeam.pokemons) {
                const megaStones = await getMegaStones();
                serializedAttachedTeam = {
                    ...attachedTeam,
                    pokemons: attachedTeam.pokemons.map(p => serializeTeamPokemon(p, megaStones))
                };
            }

            // Quoted reply reference (optional). Kept as a compact snapshot so the
            // quote still renders even if the original is later deleted.
            let replyRef = null;
            if (replyTo && replyTo.messageId) {
                replyRef = {
                    messageId: replyTo.messageId,
                    creatorName: replyTo.creatorName || 'Trainer',
                    textSnippet: (replyTo.textSnippet || '').substring(0, 120),
                    // Compact team preview (sprite URLs) when quoting a shared team,
                    // so the quote renders mini icons instead of just a name.
                    teamName: replyTo.teamName || null,
                    teamSprites: Array.isArray(replyTo.teamSprites) ? replyTo.teamSprites.slice(0, 6) : null,
                };
            }

            const messageData = {
                text: cleanText,
                createdAt: new Date().toISOString(),
                createdBy: authState.userId,
                creatorName: creatorName,
                creatorAvatar: authorAvatar.pokemonId,
                creatorAvatarIsShiny: authorAvatar.isShiny,
                creatorTrainerSprite: authorAvatar.trainerSprite,
                creatorBadgeId: authState.selectedBadgeId || null,
                sharedTeam: serializedAttachedTeam,
                battleInvite: battleInvite && battleInvite.battleId
                    ? {
                        battleId: battleInvite.battleId,
                        mode: battleInvite.mode === 'random' ? 'random' : 'standard',
                        challengerName: creatorName,
                    }
                    : null,
                replyTo: replyRef
            };

            await setDoc(messageRef, messageData);

            const topicDocRef = doc(db, `artifacts/${appId}/public/data/forumTopics`, topicId);
            await updateDoc(topicDocRef, {
                lastActivityAt: new Date().toISOString(),
                messageCount: increment(1),
                lastMessageText: cleanText
                    ? cleanText.substring(0, 100)
                    : (serializedAttachedTeam ? `Shared team: ${serializedAttachedTeam.name}` : 'Battle invite')
            });

            return true;
        } catch (err) {
            console.error("Error sending message:", err);
            toast.error(t('toast.messageSendError'));
            return false;
        }
    },

    // Toggle the current user's like on a single message. Idempotent: the liked
    // state is read from the live snapshot so the counter never drifts.
    toggleMessageLike: async (topicId, messageId) => {
        if (!db || !topicId || !messageId) return;
        const authState = useAuthStore.getState();
        const uid = authState.userId;
        if (!uid) {
            toast.warning(t('toast.signInRequired'), {
                description: t('toast.signInForLikes'),
                actions: [{ label: t('toast.signIn'), onClick: () => promptSignIn('signUp') }],
            });
            return;
        }

        const msg = get().messages.find((m) => m.id === messageId);
        const alreadyLiked = Array.isArray(msg?.likedBy) && msg.likedBy.includes(uid);

        const messageRef = doc(db, `artifacts/${appId}/public/data/forumTopics/${topicId}/messages`, messageId);
        try {
            await updateDoc(messageRef, {
                likedBy: alreadyLiked ? arrayRemove(uid) : arrayUnion(uid),
                likeCount: increment(alreadyLiked ? -1 : 1),
            });
        } catch (err) {
            console.error("Error toggling message like:", err);
            toast.error(t('toast.likeError'));
        }
    },

    // Delete a message. Firestore rules permit only the author or an admin.
    deleteMessage: async (topicId, messageId) => {
        if (!db || !topicId || !messageId) return false;
        const authState = useAuthStore.getState();
        if (!authState.userId) return false;

        try {
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/forumTopics/${topicId}/messages`, messageId));
            // Best-effort counter sync; the message is already gone if this fails.
            try {
                await updateDoc(doc(db, `artifacts/${appId}/public/data/forumTopics`, topicId), {
                    messageCount: increment(-1),
                });
            } catch (_) { /* non-critical */ }
            return true;
        } catch (err) {
            console.error("Error deleting message:", err);
            toast.error(t('toast.messageDeleteError'));
            return false;
        }
    }
}));
