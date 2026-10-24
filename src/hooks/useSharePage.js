import { useCallback } from 'react';
import { useTranslation } from './useTranslation';
import { toast } from '../store/useToastStore';
import { localizePath } from '../utils/localePath';
import { deployBase } from '../services/localeHistory';
import { track } from '../services/analytics';

/**
 * Share a page of the app by its address, in the sharer's language: the OS
 * share sheet on a touch device, the clipboard elsewhere. The link unfurls
 * with the card render-meta and api/og.js draw for that page (a Pokémon's
 * weaknesses, a type's matchups, the best teams), so the address is enough.
 *
 * @returns {(appPath: string, title: string) => Promise<void>}
 */
export function useSharePage() {
    const { t, language } = useTranslation();
    return useCallback(async (appPath, title) => {
        const url = `${window.location.origin}${localizePath(appPath, language, deployBase())}`;
        track('page_shared', { page: appPath.split('/')[1] || 'home' });
        if (window.matchMedia?.('(pointer: coarse)').matches && navigator.share) {
            try {
                await navigator.share({ title, url });
                return;
            } catch (error) {
                if (error?.name === 'AbortError') return;
            }
        }
        try {
            await navigator.clipboard.writeText(url);
            toast.success(t('common.pageLinkCopied'), { description: url });
        } catch {
            toast.info(url);
        }
    }, [language, t]);
}
