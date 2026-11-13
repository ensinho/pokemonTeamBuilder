import { useEffect, useState } from 'react';
import { firebaseConfig } from '../constants/firebase';

/**
 * Whether "Continuar com o Google" can work here (2026-11-12): asks Firebase
 * Authentication once per session for a Google sign-in URL for this origin.
 * A project with the Google provider switched off answers
 * OPERATION_NOT_ALLOWED, so the button stays hidden instead of offering a
 * door that only says "not active yet" — and it appears on its own the day
 * the provider is turned on in the Firebase console. Nothing personal is
 * sent (the provider id and this page's origin), and nothing of the popup
 * machinery loads. Offline or unsure: show it (the click says what is wrong).
 */
let probe = null;
export function googleSignInAvailable() {
    if (probe) return probe;
    if (typeof window === 'undefined' || !firebaseConfig.apiKey) return Promise.resolve(false);
    probe = fetch(`https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${encodeURIComponent(firebaseConfig.apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: 'google.com', continueUri: window.location.origin }),
    })
        .then((response) => response.json())
        .then((data) => Boolean(data?.authUri) || !/OPERATION_NOT_ALLOWED|CONFIGURATION_NOT_FOUND/.test(String(data?.error?.message || '')))
        .catch(() => true);
    return probe;
}

/** `true` once Google sign-in is known to be on; `false` until then (and when it is off). */
export function useGoogleSignInAvailable() {
    const [available, setAvailable] = useState(false);
    useEffect(() => {
        let alive = true;
        googleSignInAvailable().then((ok) => { if (alive) setAvailable(ok); });
        return () => { alive = false; };
    }, []);
    return available;
}
