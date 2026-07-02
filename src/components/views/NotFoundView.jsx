import React, { useEffect } from 'react';
import { HomeIcon } from '../icons';
import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';

const LIGHT_THEMES = new Set(['light', 'daybreak', 'solar']);

export function NotFoundView({ colors, navigate, theme }) {
    const { t } = useTranslation();
    const isLightTheme = LIGHT_THEMES.has(theme);

    useDocumentMeta({ title: '404' });

    useEffect(() => {
        let el = document.querySelector('meta[name="robots"]');
        if (!el) {
            el = document.createElement('meta');
            el.setAttribute('name', 'robots');
            document.head.appendChild(el);
        }
        el.setAttribute('content', 'noindex');
        return () => el?.setAttribute('content', 'index, follow');
    }, []);

    return (
        <div
            className="flex flex-col items-center justify-center text-center px-6 py-16 w-full"
            style={{ minHeight: '60vh' }}
        >
            <img
                src={import.meta.env.BASE_URL + (isLightTheme ? 'logo404light.png' : 'gengarcute404.png')}
                alt="Gengar looking confused"
                className="w-56 h-auto max-w-full mb-6 select-none"
                draggable="false"
            />
            <h1 className="text-2xl font-bold mb-2" style={{ color: colors.text }}>
                {t('layout.notFoundTitle')}
            </h1>
            <p className="text-sm mb-8 max-w-sm" style={{ color: colors.textMuted }}>
                {t('layout.notFoundDesc')}
            </p>
            <button
                type="button"
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-2 rounded-xl py-2.5 px-5 text-sm font-bold text-white transition-opacity active:opacity-75"
                style={{ backgroundColor: colors.primary }}
            >
                <HomeIcon />
                {t('layout.goHome')}
            </button>
        </div>
    );
}
