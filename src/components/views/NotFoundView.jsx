import React, { useEffect } from 'react';
import { Search } from 'lucide-react';
import { HomeIcon } from '../icons';
import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { Mascot } from '../Mascot';

export function NotFoundView({ navigate, onOpenSearch }) {
    const { t } = useTranslation();

    useDocumentMeta({ title: t('layout.notFoundPageTitle') });

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
        >
            {/* 4, the mascot as the 0, 4 — the two 404 drawings, now one live one
                (2026-11-06). Like GitHub's Octocat it answers the cursor, and it
                takes the whole playground: pet it, hold it, drag it, leave it be. */}
            <div className="mascot-404">
                <span className="mascot-404__digit" aria-hidden="true">4</span>
                <Mascot size="hero" framing="body" mood="perdido" pose="pataNoQueixo" loop="float" playground stage label={t('mascot.label')} />
                <span className="mascot-404__digit" aria-hidden="true">4</span>
            </div>
            <h1 className="text-2xl font-bold mb-2 text-fg">
                {t('layout.notFoundTitle')}
            </h1>
            <p className="text-sm mb-8 max-w-sm text-muted">
                {t('layout.notFoundDesc')}
            </p>
            {/* Someone who lands on a dead link was looking for something:
                search is the way forward, Home the way out (2026-10-06). */}
            <div className="flex flex-wrap items-center justify-center gap-2">
                {onOpenSearch && (
                    <button type="button" onClick={onOpenSearch} className="btn btn-primary">
                        <Search className="w-4 h-4 shrink-0" aria-hidden="true" />
                        {t('layout.notFoundSearch')}
                    </button>
                )}
                <button type="button" onClick={() => navigate('/')} className={`btn ${onOpenSearch ? 'btn-secondary' : 'btn-primary'}`}>
                    <HomeIcon />
                    {t('layout.goHome')}
                </button>
            </div>
        </div>
    );
}
