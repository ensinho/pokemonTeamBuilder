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
    getDoc,
    limit,
    limitToLast
} from 'firebase/firestore';
import { appId } from '../constants/firebase';
import { markJourney, useAuthStore } from './useAuthStore';
import { useRewardsStore } from './useRewardsStore';
import { toast } from './useToastStore';
import { t } from '../utils/translate';
import { navigateTo, promptSignIn } from '../utils/navigation';
import { ensureSpeciesIndex } from '../services/speciesIndex';
import { serializeTeam } from '../utils/teamSerialization';
import { loadStaticData } from '../services/staticData';

let topicsUnsubscribe = null;
let messagesUnsubscribe = null;
let opUnsubscribe = null;

// A thread loads its opening post plus the latest MESSAGES_PAGE replies; older
// replies come in pages on request. Before 2026-10-14 every message streamed
// at once: a 178-message thread mounted ~1,500 nodes and every attached team's
// six sprites, on a phone, to show the bottom of the conversation.
const MESSAGES_PAGE = 40;

// Canonical, always-present topics the app seeds automatically. `general` backs
// the forum chat. Authored by 'system' (Professor Oak).
const BASE_TOPICS = {
    general: {
        title: 'Chat',
        category: 'general',
        lastMessageText: 'Welcome to Gengar Forum! Share your teams and chat with other trainers here.',
    },
};

// The request every sprite's useMegaStones shares (services/staticData.js).
const getMegaStones = async () => {
    try {
        return (await loadStaticData('mega-stones.json'))?.byStone || {};
    } catch (e) {
        console.error("Failed to load mega stones in store", e);
    }
    return {};
};

export const useForumStore = create((set, get) => ({
    topics: [],
    currentTopicId: null,
    messages: [],
    isInitialLoadingTopics: false,
    isInitialLoadingMessages: false,
    messagesWindow: MESSAGES_PAGE,
    hasOlderMessages: false,

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
        set({ isInitialLoadingMessages: true, messages: [], messagesWindow: MESSAGES_PAGE, hasOlderMessages: false });
        get().subscribeMessages(topicId, MESSAGES_PAGE);
    },

    // The opening post (ThreadDetail reads messages[0] as the OP) and the
    // latest `windowSize` messages, merged. Re-subscribing to a wider window
    // keeps the current messages on screen until the new snapshot lands.
    subscribeMessages: (topicId, windowSize) => {
        get().cleanupMessagesListener();
        const messagesRef = collection(db, `artifacts/${appId}/public/data/forumTopics/${topicId}/messages`);
        let op;
        let tail = null;
        const publish = () => {
            if (tail === null || op === undefined) return;
            const opInTail = !op || tail.some((m) => m.id === op.id);
            set({
                messages: opInTail ? tail : [op, ...tail],
                hasOlderMessages: !opInTail && tail.length >= windowSize,
                isInitialLoadingMessages: false,
            });
        };
        const onError = (error) => {
            console.error(`Error loading messages for topic ${topicId}:`, error);
            set({ isInitialLoadingMessages: false });
        };
        opUnsubscribe = onSnapshot(query(messagesRef, orderBy('createdAt', 'asc'), limit(1)), (snapshot) => {
            const first = snapshot.docs[0];
            op = first ? { id: first.id, ...first.data() } : null;
            publish();
        }, onError);
        messagesUnsubscribe = onSnapshot(query(messagesRef, orderBy('createdAt', 'asc'), limitToLast(windowSize)), (snapshot) => {
            tail = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
            publish();
        }, onError);
    },

    loadOlderMessages: () => {
        const { currentTopicId, messagesWindow } = get();
        if (!db || !currentTopicId) return;
        const next = messagesWindow + MESSAGES_PAGE;
        set({ messagesWindow: next });
        get().subscribeMessages(currentTopicId, next);
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
        if (opUnsubscribe) {
            opUnsubscribe();
            opUnsubscribe = null;
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
                // The shared serializer: never writes `undefined` (Firestore
                // refuses the whole post) and gives every member its own id.
                const [megaStones, { baseIdOf }] = await Promise.all([getMegaStones(), ensureSpeciesIndex()]);
                serializedAttachedTeam = {
                    ...attachedTeam,
                    pokemons: serializeTeam(attachedTeam.pokemons, megaStones, baseIdOf),
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
                // The author's equipped rewards, stamped like the badge (2026-10-17).
                creatorFrameId: useRewardsStore.getState().equipped.frame || null,
                creatorTitleId: useRewardsStore.getState().equipped.title || null,
                lastActivityAt: new Date().toISOString(),
                messageCount: 1,
                lastMessageText: firstMessageText ? firstMessageText.substring(0, 100) : (serializedAttachedTeam ? `Shared team: ${serializedAttachedTeam.name}` : ''),
                // The feed row shows the *post*, Reddit style, not the latest
                // reply: the opening text and the team ride on the topic doc so
                // the list needs no per-topic message read. (Topics made before
                // 2026-10-17 have neither; the row falls back to lastMessageText.)
                bodyPreview: (firstMessageText || '').trim().substring(0, 280),
                sharedTeam: serializedAttachedTeam,
                likedBy: [],
                likeCount: 0,
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
                // The author's equipped rewards, stamped like the badge (2026-10-17).
                creatorFrameId: useRewardsStore.getState().equipped.frame || null,
                creatorTitleId: useRewardsStore.getState().equipped.title || null,
                sharedTeam: serializedAttachedTeam
            };
            await setDoc(firstMsgRef, firstMsgData);
            markJourney('forumPost');
            if (serializedAttachedTeam) markJourney('forumTeamShare');

            toast.success(t('toast.topicCreated'), {
                description: cleanTitle,
                // The open topic is the URL's ?topic= (FeedView follows it).
                actions: [{
                    label: t('toast.openTopic'),
                    onClick: () => navigateTo(`/feed?topic=${encodeURIComponent(topicId)}`),
                }],
            });
            return topicId;
        } catch (err) {
            console.error("Error creating topic:", err);
            toast.error(t('toast.topicCreateError'));
            return null;
        }
    },

    // Attachments a message can carry beyond a team, as one named bag rather
    // than a growing tail of positional arguments:
    //   battleInvite {battleId, mode} — a *pointer* to an open battle, never a
    //     copy of its state, so the card reads the live document and everyone
    //     sees the moment it is claimed.
    //   sharedPuzzle — a finished PokéPuzzle board (see utils/pokePuzzleShare),
    //     which by construction carries no answer.
    //   sharedChallenge — a Champion Challenge result (utils/challengeShare),
    //     with no team in it; read back through readChallengeShare.
    sendMessage: async (topicId, text, attachedTeam = null, replyTo = null, attachments = {}) => {
        const { battleInvite = null, sharedPuzzle = null, sharedChallenge = null } = attachments || {};
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
        if (!cleanText && !attachedTeam && !battleInvite && !sharedPuzzle && !sharedChallenge) {
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
                // The shared serializer: never writes `undefined` (Firestore
                // refuses the whole post) and gives every member its own id.
                const [megaStones, { baseIdOf }] = await Promise.all([getMegaStones(), ensureSpeciesIndex()]);
                serializedAttachedTeam = {
                    ...attachedTeam,
                    pokemons: serializeTeam(attachedTeam.pokemons, megaStones, baseIdOf),
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
                // The author's equipped rewards, stamped like the badge (2026-10-17).
                creatorFrameId: useRewardsStore.getState().equipped.frame || null,
                creatorTitleId: useRewardsStore.getState().equipped.title || null,
                sharedTeam: serializedAttachedTeam,
                battleInvite: battleInvite && battleInvite.battleId
                    ? {
                        battleId: battleInvite.battleId,
                        mode: battleInvite.mode === 'random' ? 'random' : 'standard',
                        challengerName: creatorName,
                    }
                    : null,
                sharedPuzzle: sharedPuzzle && Array.isArray(sharedPuzzle.rows) && sharedPuzzle.rows.length
                    ? sharedPuzzle
                    : null,
                sharedChallenge: sharedChallenge?.v === 1 ? sharedChallenge : null,
                replyTo: replyRef
            };

            await setDoc(messageRef, messageData);
            // The server-side message count is cached for a minute; the mark
            // is what lets the journey see this post right away.
            markJourney('forumPost');
            if (serializedAttachedTeam) markJourney('forumTeamShare');

            const topicDocRef = doc(db, `artifacts/${appId}/public/data/forumTopics`, topicId);
            await updateDoc(topicDocRef, {
                lastActivityAt: new Date().toISOString(),
                messageCount: increment(1),
                lastMessageText: cleanText
                    ? cleanText.substring(0, 100)
                    : (serializedAttachedTeam
                        ? `Shared team: ${serializedAttachedTeam.name}`
                        : (sharedPuzzle ? 'PokéPuzzle result' : (sharedChallenge ? 'Champion Challenge result' : 'Battle invite')))
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

    // The post's own vote (Reddit's arrow, our heart), on the topic doc so the
    // feed can rank and show it without opening the thread. Firestore applies
    // the write to the local snapshot at once, so the heart answers on the tap;
    // a rejected write rolls the snapshot back by itself and the toast says so.
    // `opMessage`: posts from before 2026-10-17 kept their likes on the opening
    // message — un-liking clears the user's like there too, so the merged count
    // the thread shows can always go down.
    toggleTopicLike: async (topicId, { opMessage = null } = {}) => {
        if (!db || !topicId) return;
        const uid = useAuthStore.getState().userId;
        if (!uid) {
            toast.warning(t('toast.signInRequired'), {
                description: t('toast.signInForLikes'),
                actions: [{ label: t('toast.signIn'), onClick: () => promptSignIn('signUp') }],
            });
            return;
        }
        const topic = get().topics.find((tp) => tp.id === topicId);
        const inTopic = Array.isArray(topic?.likedBy) && topic.likedBy.includes(uid);
        const inOp = Array.isArray(opMessage?.likedBy) && opMessage.likedBy.includes(uid);
        const liked = inTopic || inOp;
        try {
            const writes = [];
            if (!liked || inTopic) {
                writes.push(updateDoc(doc(db, `artifacts/${appId}/public/data/forumTopics`, topicId), {
                    likedBy: liked ? arrayRemove(uid) : arrayUnion(uid),
                    likeCount: increment(liked ? -1 : 1),
                }));
            }
            if (liked && inOp) {
                writes.push(updateDoc(doc(db, `artifacts/${appId}/public/data/forumTopics/${topicId}/messages`, opMessage.id), {
                    likedBy: arrayRemove(uid),
                    likeCount: increment(-1),
                }));
            }
            await Promise.all(writes);
        } catch (err) {
            console.error('Error toggling topic like:', err);
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
    },

    // Delete a topic. Firestore rules permit only the author or an admin.
    deleteTopic: async (topicId) => {
        if (!db || !topicId) return false;
        const authState = useAuthStore.getState();
        if (!authState.userId) return false;

        try {
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/forumTopics`, topicId));
            if (get().currentTopicId === topicId) {
                get().setCurrentTopicId(null);
            }
            toast.success(t('toast.topicDeleted') || 'Tópico excluído com sucesso.');
            return true;
        } catch (err) {
            console.error("Error deleting topic:", err);
            toast.error(t('toast.topicDeleteError') || 'Erro ao excluir tópico.');
            return false;
        }
    }
}));
