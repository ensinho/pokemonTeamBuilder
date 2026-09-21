import { useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { appId } from '../constants/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import { useSecretRoomStore } from '../store/useSecretRoomStore';

let notifUnsub = null;

/**
 * Route a tap on a system notification.
 *
 * `public/push-sw.js` focuses an already-open tab and posts it the target
 * instead of navigating it, because a hard navigation would tear down every
 * live Firestore listener the session holds. This is the other end of that
 * message. It also replaces the old in-page handler, which set
 * `window.location.hash` — meaningless since the router moved to real paths
 * (CLAUDE.md, 2026-07-01), so tapping a battle notification did nothing at all.
 */
function useNotificationClickRouting() {
    const navigate = useNavigate();

    useEffect(() => {
        if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return undefined;

        const onMessage = (event) => {
            if (event.data?.type !== 'ptb:navigate' || !event.data.url) return;
            try {
                const target = new URL(event.data.url, window.location.origin);
                if (target.origin !== window.location.origin) return;
                // The router's basename is already part of BASE_URL, so the
                // path is trimmed back to what `navigate` expects.
                const base = import.meta.env.BASE_URL.replace(/\/$/, '');
                const path = target.pathname.startsWith(base)
                    ? target.pathname.slice(base.length) || '/'
                    : target.pathname;
                navigate(`${path}${target.search}`);
            } catch (_) {
                // A malformed url is not worth a crash — the tap simply focuses.
            }
        };

        navigator.serviceWorker.addEventListener('message', onMessage);
        return () => navigator.serviceWorker.removeEventListener('message', onMessage);
    }, [navigate]);
}

export function useNotifications() {
    const userId = useAuthStore((state) => state.userId);
    const showToast = useToastStore((state) => state.showToast);
    const joinRoom = useSecretRoomStore((state) => state.joinRoom);
    const navigate = useNavigate();

    useNotificationClickRouting();

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
                                'Convite de PokéRoom',
                                'info',
                                {
                                    description: `Sala ${notif.roomCode}`,
                                    // An invite is worth holding on screen: it is
                                    // the only place the room code ever appears,
                                    // and it arrives unprompted.
                                    duration: 15000,
                                    actions: [{
                                        label: 'Entrar',
                                        onClick: () => navigate(`/pokeroom/${notif.roomCode}`),
                                    }],
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
