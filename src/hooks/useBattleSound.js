import { useEffect, useState } from 'react';

import { isMusicOn, setMusicOn } from '../utils/battleMusic';
import { isMuted, setMuted, unlock } from '../utils/challengeSfx';

const FAST_KEY = 'ptb:challenge:fast';

const readFast = () => {
    try {
        return localStorage.getItem(FAST_KEY) === '1';
    } catch (_) {
        return false;
    }
};

/**
 * The console bar's three switches — sound, music, speed — shared by the
 * Champion Challenge and the friend battles, each remembered on this device.
 * Sound needs a gesture first (autoplay policy): the first press anywhere on
 * the route unlocks it.
 */
export function useBattleSound() {
    const [muted, setMutedState] = useState(isMuted);
    const [musicOn, setMusicState] = useState(isMusicOn);
    const [fast, setFast] = useState(readFast);

    useEffect(() => {
        const once = () => {
            unlock();
            window.removeEventListener('pointerdown', once);
            window.removeEventListener('keydown', once);
        };
        window.addEventListener('pointerdown', once);
        window.addEventListener('keydown', once);
        return () => {
            window.removeEventListener('pointerdown', once);
            window.removeEventListener('keydown', once);
        };
    }, []);

    return {
        muted,
        toggleMuted: () => {
            setMuted(!muted);
            setMutedState(!muted);
        },
        musicOn,
        toggleMusic: () => {
            setMusicOn(!musicOn);
            setMusicState(!musicOn);
        },
        fast,
        toggleFast: () => setFast((value) => {
            try {
                localStorage.setItem(FAST_KEY, value ? '0' : '1');
            } catch (_) { /* a convenience, best-effort */ }
            return !value;
        }),
    };
}
