import { useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { appId } from '../constants/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import { useSecretRoomStore } from '../store/useSecretRoomStore';

let notifUnsub = null;

export function useNotifications() {
    const userId = useAuthStore((state) => state.userId);
    const showToast = useToastStore((state) => state.showToast);
    const joinRoom = useSecretRoomStore((state) => state.joinRoom);
    const navigate = useNavigate();

    useEffect(() => {
        if (!db || !userId) {
            if (notifUnsub) notifUnsub();
            notifUnsub = null;
            return;
        }

        const notifRef = collection(db, `artifacts/${appId}/notifications`);
        const q = query(notifRef, where('recipientId', '==', userId));

        notifUnsub = onSnapshot(
            q,
            (snap) => {
                snap.docChanges().forEach(async (change) => {
                    if (change.type === 'added') {
                        const notif = { id: change.doc.id, ...change.doc.data() };
                        if (notif.type === 'room_invite' && notif.roomCode) {
                            // The toast used to *say* "clique para entrar" while having no
                            // click handler at all, so an invite was a dead end. The action
                            // navigates; the room view joins on arrival.
                            showToast(
                                `Convite de PokéRoom! Sala ${notif.roomCode}`,
                                'info',
                                {
                                    duration: 15000,
                                    action: {
                                        label: 'Entrar',
                                        onClick: () => navigate(`/pokeroom/${notif.roomCode}`),
                                    },
                                }
                            );

                            // Auto-delete notification after receipt to avoid duplicate toasts
                            try {
                                await deleteDoc(doc(db, `artifacts/${appId}/notifications`, notif.id));
                            } catch (_) {
                                // A stale notification is harmless — the toast already fired.
                            }
                        }
                    }
                });
            },
            (err) => {
                console.error('Error listening to notifications:', err);
            }
        );

        return () => {
            if (notifUnsub) notifUnsub();
            notifUnsub = null;
        };
    }, [userId, showToast, joinRoom, navigate]);
}
