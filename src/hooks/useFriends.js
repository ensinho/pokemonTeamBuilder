import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useFriendsStore } from '../store/useFriendsStore';

/**
 * Friend list + pending requests, with the Firestore listeners bound to the
 * signed-in account's lifetime.
 *
 * Re-subscribes when the account changes (including the anonymous → upgraded
 * transition, which is when friends first become available) and tears the
 * listeners down on unmount.
 */
export function useFriends() {
    const userId = useAuthStore((state) => state.userId);
    const isAnonymous = useAuthStore((state) => state.isAnonymous);

    const initListeners = useFriendsStore((state) => state.initListeners);
    const cleanupListeners = useFriendsStore((state) => state.cleanupListeners);

    const friends = useFriendsStore((state) => state.friends);
    const incomingRequests = useFriendsStore((state) => state.incomingRequests);
    const outgoingRequests = useFriendsStore((state) => state.outgoingRequests);
    const isLoadingFriends = useFriendsStore((state) => state.isLoadingFriends);
    const searchResults = useFriendsStore((state) => state.searchResults);
    const isSearching = useFriendsStore((state) => state.isSearching);

    const searchTrainers = useFriendsStore((state) => state.searchTrainers);
    const clearSearch = useFriendsStore((state) => state.clearSearch);
    const sendRequest = useFriendsStore((state) => state.sendRequest);
    const acceptRequest = useFriendsStore((state) => state.acceptRequest);
    const declineRequest = useFriendsStore((state) => state.declineRequest);
    const removeRequest = useFriendsStore((state) => state.removeRequest);
    const removeFriend = useFriendsStore((state) => state.removeFriend);
    const loadProfile = useFriendsStore((state) => state.loadProfile);

    useEffect(() => {
        if (userId && !isAnonymous) {
            initListeners();
        } else {
            cleanupListeners();
        }
        return () => cleanupListeners();
    }, [userId, isAnonymous, initListeners, cleanupListeners]);

    return {
        friends,
        incomingRequests,
        outgoingRequests,
        isLoadingFriends,
        searchResults,
        isSearching,
        searchTrainers,
        clearSearch,
        sendRequest,
        acceptRequest,
        declineRequest,
        removeRequest,
        removeFriend,
        loadProfile,
    };
}
