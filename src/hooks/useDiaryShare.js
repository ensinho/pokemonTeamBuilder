import { useCallback, useState } from 'react';

import { useTranslation } from './useTranslation';
import { useForumStore } from '../store/useForumStore';
import { toast } from '../store/useToastStore';
import { navigateTo } from '../utils/navigation';
import { diaryTopicId, todayDiaryKey } from '../utils/forumDiary';

/**
 * "Postar no Diário" for a game's result (2026-11-15): one behaviour for the
 * tier list and both quizzes — post the attachment to the forum's room of the
 * day (`useForumStore.postToDiary`, which asks a guest to sign in and reports
 * its own failures), say so with a way to go and see it, and rest as
 * "Ver no Diário" until what would be posted changes.
 *
 * `key` names what would be posted (a tier list's code, a run's figures): the
 * same key twice is not posted twice; a new key is a new post.
 *
 * @returns {{ status: 'idle'|'posting'|'posted', post: (attachments: object) => Promise<boolean>, openDiary: () => void }}
 */
export function useDiaryShare(key) {
    const { t } = useTranslation();
    const [posting, setPosting] = useState(false);
    const [postedKey, setPostedKey] = useState(null);

    const openDiary = useCallback(() => navigateTo(`/feed?topic=${diaryTopicId(todayDiaryKey())}`), []);

    const post = useCallback(async (attachments) => {
        if (posting) return false;
        setPosting(true);
        try {
            const ok = await useForumStore.getState().postToDiary(attachments);
            if (!ok) return false;
            setPostedKey(key);
            toast.success(t('games.postedToDiary'), { actions: [{ label: t('games.seeDiary'), onClick: openDiary }] });
            return true;
        } finally {
            setPosting(false);
        }
    }, [key, posting, openDiary, t]);

    const status = posting ? 'posting' : (postedKey !== null && postedKey === key) ? 'posted' : 'idle';
    return { status, post, openDiary };
}
