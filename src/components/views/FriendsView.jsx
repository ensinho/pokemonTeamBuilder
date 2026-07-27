import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

import { useFriends } from '../../hooks/useFriends';
import { useBattlesStore } from '../../store/useBattlesStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { useDebounce } from '../../hooks/useDebounce';
import { AvatarSprite } from '../AvatarSprite';
import { EmptyState } from '../EmptyState';
import { PokeballIcon, CloseIcon } from '../icons';
import '../../styles/friends-view.css';

const TABS = ['friends', 'requests', 'find'];

/**
 * One trainer row: avatar, name, and whatever actions the caller supplies.
 * Shared by the friend list, both request lists and the search results so the
 * identity block looks identical everywhere.
 */
function TrainerRow({ profile, subtitle, actions }) {
    const { t } = useTranslation();
    const name = profile?.displayName || t('friends.unknownTrainer');

    return (
        <li className="friends-row">
            <span className="friends-row__avatar">
                <AvatarSprite
                    trainerSprite={profile?.trainerSprite}
                    pokemonId={profile?.avatarPokemonId}
                    isShiny={profile?.avatarIsShiny}
                    fallback={<PokeballIcon className="w-5 h-5 text-muted opacity-50" />}
                />
            </span>
            <span className="friends-row__identity">
                <span className="friends-row__name">{name}</span>
                {subtitle && <span className="friends-row__meta">{subtitle}</span>}
            </span>
            {actions && <span className="friends-row__actions">{actions}</span>}
        </li>
    );
}

export function FriendsView() {
    const { t, language } = useTranslation();
    useDocumentMeta({
        title: 'Friends',
        description: 'Add trainer friends and battle them turn by turn.',
        path: '/friends',
    });

    const userId = useAuthStore((state) => state.userId);
    const isAnonymous = useAuthStore((state) => state.isAnonymous);
    const showToast = useToastStore((state) => state.showToast);

    const {
        friends, incomingRequests, outgoingRequests, isLoadingFriends,
        searchResults, isSearching, searchTrainers, clearSearch,
        sendRequest, acceptRequest, declineRequest, removeRequest, removeFriend,
        loadProfile,
    } = useFriends();

    const navigate = useNavigate();
    const challengeFriend = useBattlesStore((state) => state.challengeFriend);

    const [searchParams, setSearchParams] = useSearchParams();
    const tabParam = searchParams.get('tab');
    const activeTab = TABS.includes(tabParam) ? tabParam : 'friends';

    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 350);
    const [confirmingRemoval, setConfirmingRemoval] = useState(null);

    // An `?add=<uid>` invite link resolves to a trainer card in the Find tab.
    const inviteUid = searchParams.get('add');
    const [invitedProfile, setInvitedProfile] = useState(null);

    useEffect(() => {
        if (!inviteUid || inviteUid === userId) {
            setInvitedProfile(null);
            return;
        }
        let cancelled = false;
        loadProfile(inviteUid).then((profile) => {
            if (!cancelled) setInvitedProfile(profile);
        });
        return () => { cancelled = true; };
    }, [inviteUid, userId, loadProfile]);

    useEffect(() => {
        if (activeTab !== 'find') return;
        searchTrainers(debouncedSearch);
    }, [debouncedSearch, activeTab, searchTrainers]);

    useEffect(() => () => clearSearch(), [clearSearch]);

    const setTab = (tab) => {
        const next = new URLSearchParams(searchParams);
        next.set('tab', tab);
        setSearchParams(next, { replace: true });
    };

    const friendIds = useMemo(() => new Set(friends.map((friend) => friend.userId)), [friends]);
    const outgoingIds = useMemo(() => new Set(outgoingRequests.map((row) => row.to)), [outgoingRequests]);
    const incomingIds = useMemo(() => new Set(incomingRequests.map((row) => row.from)), [incomingRequests]);

    const inviteLink = useMemo(() => {
        if (!userId || typeof window === 'undefined') return '';
        return `${window.location.origin}${window.location.pathname}#/friends?tab=find&add=${userId}`;
    }, [userId]);

    const copyInviteLink = async () => {
        try {
            await navigator.clipboard.writeText(inviteLink);
            showToast(t('friends.inviteCopied'), 'success');
        } catch (err) {
            console.error('Could not copy the invite link:', err);
            showToast(t('friends.inviteCopyFailed'), 'error');
        }
    };

    // The action button for a trainer found via search or an invite link.
    const relationshipAction = (profile) => {
        if (friendIds.has(profile.userId)) {
            return <span className="badge badge-success">{t('friends.alreadyFriends')}</span>;
        }
        if (outgoingIds.has(profile.userId)) {
            return <span className="badge badge-outline">{t('friends.requestPending')}</span>;
        }
        if (incomingIds.has(profile.userId)) {
            return (
                <button type="button" className="btn btn-primary friends-action" onClick={() => acceptRequest(profile.userId)}>
                    {t('friends.accept')}
                </button>
            );
        }
        return (
            <button type="button" className="btn btn-primary friends-action" onClick={() => sendRequest(profile.userId)}>
                {t('friends.addFriend')}
            </button>
        );
    };

    if (isAnonymous) {
        return (
            <div className="friends-view">
                <EmptyState
                    title={t('friends.guestTitle')}
                    message={t('friends.guestMessage')}
                />
            </div>
        );
    }

    const pendingCount = incomingRequests.length;

    return (
        <div className="friends-view">
            <div className="friends-tabs" role="tablist">
                {TABS.map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === tab}
                        onClick={() => setTab(tab)}
                        className={`friends-tab ${activeTab === tab ? 'is-active' : ''}`}
                    >
                        {t(`friends.tab_${tab}`)}
                        {tab === 'friends' && friends.length > 0 && (
                            <span className="friends-tab__count">{friends.length}</span>
                        )}
                        {tab === 'requests' && pendingCount > 0 && (
                            <span className="friends-tab__count friends-tab__count--alert">{pendingCount}</span>
                        )}
                    </button>
                ))}
            </div>

            {activeTab === 'friends' && (
                isLoadingFriends && friends.length === 0 ? (
                    <div className="friends-loading"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>
                ) : friends.length === 0 ? (
                    <EmptyState
                        compact
                        title={t('friends.emptyTitle')}
                        message={t('friends.emptyMessage')}
                    />
                ) : (
                    <ul className="friends-list">
                        {friends.map((friend) => (
                            <TrainerRow
                                key={friend.userId}
                                profile={friend}
                                subtitle={friend.since
                                    ? t('friends.friendsSince', {
                                        date: new Date(friend.since).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US'),
                                    })
                                    : null}
                                actions={confirmingRemoval === friend.userId ? (
                                    <>
                                        <button
                                            type="button"
                                            className="btn btn-danger friends-action"
                                            onClick={() => {
                                                removeFriend(friend.userId);
                                                setConfirmingRemoval(null);
                                            }}
                                        >
                                            {t('friends.confirmRemove')}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-ghost friends-action"
                                            onClick={() => setConfirmingRemoval(null)}
                                            aria-label={t('common.cancel')}
                                        >
                                            <CloseIcon className="w-4 h-4" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            className="btn btn-primary friends-action"
                                            onClick={async () => {
                                                const battleId = await challengeFriend(friend);
                                                if (battleId) navigate(`/battles/${battleId}`);
                                            }}
                                        >
                                            {t('friends.battle')}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline friends-action"
                                            onClick={() => setConfirmingRemoval(friend.userId)}
                                        >
                                            {t('friends.remove')}
                                        </button>
                                    </>
                                )}
                            />
                        ))}
                    </ul>
                )
            )}

            {activeTab === 'requests' && (
                <div className="friends-sections">
                    <section>
                        <h2 className="friends-section-title">{t('friends.incomingTitle')}</h2>
                        {incomingRequests.length === 0 ? (
                            <p className="friends-section-empty">{t('friends.noIncoming')}</p>
                        ) : (
                            <ul className="friends-list">
                                {incomingRequests.map((row) => (
                                    <TrainerRow
                                        key={row.id}
                                        profile={row.profile}
                                        actions={(
                                            <>
                                                <button type="button" className="btn btn-primary friends-action" onClick={() => acceptRequest(row.from)}>
                                                    {t('friends.accept')}
                                                </button>
                                                <button type="button" className="btn btn-outline friends-action" onClick={() => declineRequest(row.from)}>
                                                    {t('friends.decline')}
                                                </button>
                                            </>
                                        )}
                                    />
                                ))}
                            </ul>
                        )}
                    </section>

                    <section>
                        <h2 className="friends-section-title">{t('friends.outgoingTitle')}</h2>
                        {outgoingRequests.length === 0 ? (
                            <p className="friends-section-empty">{t('friends.noOutgoing')}</p>
                        ) : (
                            <ul className="friends-list">
                                {outgoingRequests.map((row) => (
                                    <TrainerRow
                                        key={row.id}
                                        profile={row.profile}
                                        subtitle={t('friends.requestPending')}
                                        actions={(
                                            <button type="button" className="btn btn-outline friends-action" onClick={() => removeRequest(row.from, row.to)}>
                                                {t('friends.cancelRequest')}
                                            </button>
                                        )}
                                    />
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            )}

            {activeTab === 'find' && (
                <div className="friends-sections">
                    <section>
                        <h2 className="friends-section-title">{t('friends.findTitle')}</h2>
                        <input
                            type="text"
                            className="input-clean"
                            placeholder={t('friends.searchPlaceholder')}
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                        />

                        {invitedProfile && (
                            <ul className="friends-list friends-list--invite">
                                <TrainerRow
                                    profile={invitedProfile}
                                    subtitle={t('friends.viaInviteLink')}
                                    actions={relationshipAction(invitedProfile)}
                                />
                            </ul>
                        )}

                        {isSearching ? (
                            <div className="friends-loading"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>
                        ) : searchTerm.trim().length >= 2 && searchResults.length === 0 ? (
                            <p className="friends-section-empty">{t('friends.noResults')}</p>
                        ) : (
                            <ul className="friends-list">
                                {searchResults.map((profile) => (
                                    <TrainerRow
                                        key={profile.userId}
                                        profile={profile}
                                        actions={relationshipAction(profile)}
                                    />
                                ))}
                            </ul>
                        )}
                    </section>

                    <section>
                        <h2 className="friends-section-title">{t('friends.inviteTitle')}</h2>
                        <p className="friends-section-hint">{t('friends.inviteHint')}</p>
                        <div className="friends-invite">
                            <code className="friends-invite__link">{inviteLink}</code>
                            <button type="button" className="btn btn-secondary friends-action" onClick={copyInviteLink}>
                                {t('friends.copyLink')}
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}
