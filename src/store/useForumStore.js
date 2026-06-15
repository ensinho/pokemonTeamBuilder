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
    increment,
    getDoc
} from 'firebase/firestore';
import { appId } from '../constants/firebase';
import { useAuthStore } from './useAuthStore';
import { useToastStore } from './useToastStore';

let topicsUnsubscribe = null;
let messagesUnsubscribe = null;

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

            // Ensure the general chat topic exists if it is not in the list
            const hasGeneral = topicsList.some(t => t.id === 'general');
            if (!hasGeneral) {
                get().ensureGeneralTopicExists();
            }
        }, (error) => {
            console.error("Error loading forum topics:", error);
            set({ isInitialLoadingTopics: false });
        });
    },

    ensureGeneralTopicExists: async () => {
        if (!db) return;
        const docRef = doc(db, `artifacts/${appId}/public/data/forumTopics`, 'general');
        try {
            const snap = await getDoc(docRef);
            if (!snap.exists()) {
                await setDoc(docRef, {
                    title: 'General Chat',
                    category: 'general',
                    createdAt: new Date().toISOString(),
                    createdBy: 'system',
                    creatorName: 'Professor Oak',
                    creatorAvatar: 25, // Pikachu
                    creatorAvatarIsShiny: false,
                    lastActivityAt: new Date().toISOString(),
                    messageCount: 0,
                    lastMessageText: 'Welcome to Gengar Forum! Share your teams and chat with other trainers here.'
                });
            }
        } catch (err) {
            console.error("Error ensuring general topic exists:", err);
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
            useToastStore.getState().showToast("You must be logged in to create topics.", "error");
            return null;
        }

        const cleanTitle = title.trim();
        if (!cleanTitle) {
            useToastStore.getState().showToast("Topic title cannot be empty.", "warning");
            return null;
        }

        try {
            const topicCollectionRef = collection(db, `artifacts/${appId}/public/data/forumTopics`);
            const newTopicRef = doc(topicCollectionRef);
            const topicId = newTopicRef.id;

            const creatorName = authState.displayName || (authState.userEmail ? authState.userEmail.split('@')[0] : 'Guest Trainer');
            
            const topicData = {
                title: cleanTitle,
                category: category || 'general',
                createdAt: new Date().toISOString(),
                createdBy: authState.userId,
                creatorName: creatorName,
                creatorAvatar: authState.greetingPokemonId || null,
                creatorAvatarIsShiny: authState.greetingPokemonIsShiny || false,
                lastActivityAt: new Date().toISOString(),
                messageCount: 1,
                lastMessageText: firstMessageText ? firstMessageText.substring(0, 100) : (attachedTeam ? `Shared team: ${attachedTeam.name}` : '')
            };

            await setDoc(newTopicRef, topicData);

            const firstMsgRef = doc(collection(db, `artifacts/${appId}/public/data/forumTopics/${topicId}/messages`));
            const firstMsgData = {
                text: firstMessageText || '',
                createdAt: new Date().toISOString(),
                createdBy: authState.userId,
                creatorName: creatorName,
                creatorAvatar: authState.greetingPokemonId || null,
                creatorAvatarIsShiny: authState.greetingPokemonIsShiny || false,
                sharedTeam: attachedTeam ? attachedTeam : null
            };
            await setDoc(firstMsgRef, firstMsgData);

            useToastStore.getState().showToast("Topic created successfully!", "success");
            return topicId;
        } catch (err) {
            console.error("Error creating topic:", err);
            useToastStore.getState().showToast("Error creating topic.", "error");
            return null;
        }
    },

    sendMessage: async (topicId, text, attachedTeam = null) => {
        if (!db) return false;
        const authState = useAuthStore.getState();
        if (!authState.userId) {
            useToastStore.getState().showToast("You must be logged in to post messages.", "error");
            return false;
        }

        const cleanText = text.trim();
        if (!cleanText && !attachedTeam) {
            return false;
        }

        try {
            const creatorName = authState.displayName || (authState.userEmail ? authState.userEmail.split('@')[0] : 'Guest Trainer');
            const messageRef = doc(collection(db, `artifacts/${appId}/public/data/forumTopics/${topicId}/messages`));
            
            const messageData = {
                text: cleanText,
                createdAt: new Date().toISOString(),
                createdBy: authState.userId,
                creatorName: creatorName,
                creatorAvatar: authState.greetingPokemonId || null,
                creatorAvatarIsShiny: authState.greetingPokemonIsShiny || false,
                sharedTeam: attachedTeam ? attachedTeam : null
            };

            await setDoc(messageRef, messageData);

            const topicDocRef = doc(db, `artifacts/${appId}/public/data/forumTopics`, topicId);
            await updateDoc(topicDocRef, {
                lastActivityAt: new Date().toISOString(),
                messageCount: increment(1),
                lastMessageText: cleanText ? cleanText.substring(0, 100) : `Shared team: ${attachedTeam.name}`
            });

            return true;
        } catch (err) {
            console.error("Error sending message:", err);
            useToastStore.getState().showToast("Error sending message.", "error");
            return false;
        }
    }
}));
