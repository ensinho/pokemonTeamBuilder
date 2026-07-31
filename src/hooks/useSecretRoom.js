import { useCallback, useEffect, useRef } from 'react';
import { useSecretRoomStore } from '../store/useSecretRoomStore';
import { useFriendsStore } from '../store/useFriendsStore';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import { doc, setDoc, collection } from 'firebase/firestore';
import { db } from '../services/firebase';
import { appId } from '../constants/firebase';

export function useSecretRoom(roomIdParam) {
    const currentRoom = useSecretRoomStore((state) => state.currentRoom);
    const isLoadingRoom = useSecretRoomStore((state) => state.isLoadingRoom);

    const createRoom = useSecretRoomStore((state) => state.createRoom);
    const joinRoom = useSecretRoomStore((state) => state.joinRoom);
    const leaveRoom = useSecretRoomStore((state) => state.leaveRoom);
    const startGame = useSecretRoomStore((state) => state.startGame);
    const submitQuestion = useSecretRoomStore((state) => state.submitQuestion);
    const submitDirectGuess = useSecretRoomStore((state) => state.submitDirectGuess);
    const nextRound = useSecretRoomStore((state) => state.nextRound);
    const subscribeToRoom = useSecretRoomStore((state) => state.subscribeToRoom);

    const friends = useFriendsStore((state) => state.friends);
    const initFriendsListeners = useFriendsStore((state) => state.initListeners);

    const authUser = useAuthStore((state) => state.userId);

    useEffect(() => {
        if (authUser) {
            initFriendsListeners();
        }
    }, [authUser, initFriendsListeners]);

    useEffect(() => {
        if (roomIdParam && (!currentRoom || currentRoom.id !== roomIdParam)) {
            subscribeToRoom(roomIdParam);
        }
    }, [roomIdParam, currentRoom, subscribeToRoom]);

    /**
     * Landing on /pokeroom/:code must actually *enter* the room.
     *
     * `subscribeToRoom` only opens a listener — it never adds you to `players`,
     * so following an invite link left you watching from outside: not in the
     * scoreboard, never given a turn. This joins as soon as the doc arrives and
     * shows you are not a member yet.
     *
     * Keyed on the room id so a failed attempt (game already started, room gone)
     * is not retried on every snapshot.
     */
    const joinAttemptRef = useRef(null);

    useEffect(() => {
        if (!roomIdParam || !authUser || !currentRoom) return;
        if (currentRoom.id !== roomIdParam) return;

        const isMember = (currentRoom.players || []).some((p) => p.userId === authUser);
        if (isMember) {
            joinAttemptRef.current = null;
            return;
        }

        if (joinAttemptRef.current === roomIdParam) return;
        joinAttemptRef.current = roomIdParam;
        joinRoom(roomIdParam);
    }, [roomIdParam, authUser, currentRoom, joinRoom]);

    const inviteFriendToRoom = useCallback(async (friendUserId) => {
        const showToast = useToastStore.getState().showToast;
        if (!db || !currentRoom || !friendUserId) return false;

        try {
            const notifRef = doc(collection(db, `artifacts/${appId}/notifications`));
            await setDoc(notifRef, {
                type: 'room_invite',
                recipientId: friendUserId,
                senderId: authUser,
                roomCode: currentRoom.id,
                gameMode: currentRoom.gameMode,
                createdAt: new Date().toISOString(),
            });
            showToast('Convite enviado!', 'success');
            return true;
        } catch (err) {
            console.error('Failed to invite friend:', err);
            showToast('Não foi possível enviar o convite.', 'error');
            return false;
        }
    }, [currentRoom, authUser]);

    return {
        // The signed-in user's id — the view needs it to know whose turn it is.
        authUserId: authUser,
        currentRoom,
        isLoadingRoom,
        friends,
        createRoom,
        joinRoom,
        leaveRoom,
        startGame,
        submitQuestion,
        submitDirectGuess,
        nextRound,
        inviteFriendToRoom,
    };
}
