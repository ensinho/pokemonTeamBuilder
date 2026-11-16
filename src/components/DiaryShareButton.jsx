import React from 'react';
import { Check, MessageCircle } from 'lucide-react';

import { Loader } from './Loader';
import { useTranslation } from '../hooks/useTranslation';

/**
 * The button of "Postar no Diário" (`hooks/useDiaryShare.js`): the same words
 * and the same three states wherever a game offers the forum — to post,
 * posting, and, once posted, the way to go and see it.
 */
export function DiaryShareButton({ share, onPost, disabled = false, className = 'btn btn-secondary' }) {
    const { t } = useTranslation();
    if (share.status === 'posted') {
        return (
            <button type="button" className={className} onClick={share.openDiary}>
                <Check className="w-4 h-4" aria-hidden="true" />
                <span>{t('games.seeDiary')}</span>
            </button>
        );
    }
    return (
        <button type="button" className={className} onClick={onPost} disabled={disabled || share.status === 'posting'}>
            {share.status === 'posting' ? <Loader size="xs" /> : <MessageCircle className="w-4 h-4" aria-hidden="true" />}
            <span>{t('games.postToDiary')}</span>
        </button>
    );
}

export default DiaryShareButton;
