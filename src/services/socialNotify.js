import { callAuthedApi } from './apiClient';
import { BATTLE_NOTIFY_ENDPOINT } from '../constants/firebase';

/**
 * Tell the server something social just happened (the Pokégear, 2026-11-06).
 * Ids only — the server re-derives who to tell from the stored documents
 * (api/_lib/socialNotify.js). Fire and forget: a notice that fails never
 * fails the post.
 */
export const notifySocial = (payload) => {
    callAuthedApi(BATTLE_NOTIFY_ENDPOINT, payload).catch(() => {});
};
