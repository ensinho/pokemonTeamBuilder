import React, { useState, useEffect } from 'react';
import { CloseIcon } from './icons';

// A cute, dismissible heads-up that the Teams topic was reset (some older
// messages were lost). It auto-hides after 20s (remembered for the session so
// it won't nag again), and the manual close is remembered permanently.
const LS_KEY = 'teamsTopicNoticeDismissed'; // manual close → forever
const SS_KEY = 'teamsTopicNoticeSeen';      // auto-hide → this session
const AUTO_DISMISS_MS = 20000;

export function TeamsTopicNotice({ language = 'en', className = '' }) {
    const [visible, setVisible] = useState(() => {
        try {
            if (localStorage.getItem(LS_KEY) === '1') return false;
            if (sessionStorage.getItem(SS_KEY) === '1') return false;
        } catch { /* storage unavailable */ }
        return true;
    });

    // Auto-hide after 20s; mark seen for the session so navigation won't reshow it.
    useEffect(() => {
        if (!visible) return undefined;
        const timer = setTimeout(() => {
            try { sessionStorage.setItem(SS_KEY, '1'); } catch { /* ignore */ }
            setVisible(false);
        }, AUTO_DISMISS_MS);
        return () => clearTimeout(timer);
    }, [visible]);

    if (!visible) return null;

    const dismiss = () => {
        try { localStorage.setItem(LS_KEY, '1'); } catch { /* ignore */ }
        setVisible(false);
    };

    return (
        <div className={`teams-topic-notice ${className}`} role="status">
            <button
                type="button"
                onClick={dismiss}
                className="teams-topic-notice__close"
                aria-label={language === 'pt' ? 'Fechar aviso' : 'Dismiss'}
            >
                <CloseIcon className="w-3.5 h-3.5" />
            </button>
            <div className="teams-topic-notice__emote" aria-hidden="true">(｡•́︿•̀｡)</div>
            <p className="teams-topic-notice__text">
                {language === 'pt'
                    ? 'Oops! O tópico Times foi reiniciado por engano e perdi algumas mensagens antigas. Por favor, usem este novo aqui!'
                    : 'Oops! The Teams topic got reset by mistake and I lost some old messages. Please use this fresh one from now on!'}
            </p>
        </div>
    );
}
