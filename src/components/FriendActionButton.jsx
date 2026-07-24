import React from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useFriendsStore } from '../store/useFriendsStore';
import { useTranslation } from '../hooks/useTranslation';

/**
 * "Add friend" / "Pending" / "Friends" for another trainer, wherever their
 * profile shows up (forum, home feed).
 *
 * Renders nothing when there's nobody to befriend — yourself, a system author
 * like Professor Oak, or while signed in anonymously — so callers can drop it in
 * unconditionally.
 *
 * Reads the store directly rather than the `useFriends` hook: this must not bind
 * another listener, it only reflects the state the app shell already holds.
 */
export function FriendActionButton({ targetUserId, className = '' }) {
    const { t } = useTranslation();
    const userId = useAuthStore((state) => state.userId);
    const isAnonymous = useAuthStore((state) => state.isAnonymous);

    const friends = useFriendsStore((state) => state.friends);
    const outgoingRequests = useFriendsStore((state) => state.outgoingRequests);
    const incomingRequests = useFriendsStore((state) => state.incomingRequests);
    const sendRequest = useFriendsStore((state) => state.sendRequest);
    const acceptRequest = useFriendsStore((state) => state.acceptRequest);

    if (!targetUserId || targetUserId === userId || targetUserId === 'system' || isAnonymous) {
        return null;
    }

    if (friends.some((friend) => friend.userId === targetUserId)) {
        return <span className={`badge badge-success ${className}`}>{t('friends.alreadyFriends')}</span>;
    }
    if (outgoingRequests.some((row) => row.to === targetUserId)) {
        return <span className={`badge badge-outline ${className}`}>{t('friends.requestPending')}</span>;
    }
    if (incomingRequests.some((row) => row.from === targetUserId)) {
        return (
            <button type="button" className={`btn btn-primary ${className}`} onClick={() => acceptRequest(targetUserId)}>
                {t('friends.accept')}
            </button>
        );
    }
    return (
        <button type="button" className={`btn btn-primary ${className}`} onClick={() => sendRequest(targetUserId)}>
            {t('friends.addFriend')}
        </button>
    );
}
