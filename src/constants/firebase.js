export const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const appId = import.meta.env.VITE_APP_ID || 'pokemonTeamBuilder';
export const POKEAPI_BASE_URL = import.meta.env.VITE_POKEAPI_BASE_URL || 'https://pokeapi.co/api/v2';
export const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);
export const ADMIN_EMAIL_ENDPOINT = import.meta.env.VITE_ADMIN_EMAIL_ENDPOINT || '/api/send-admin-reply';

// The authoritative battle turn resolver. Vercel-only: the GitHub Pages deploy has
// no /api/*, so battles are unavailable there (same as admin email replies).
export const BATTLE_TURN_ENDPOINT = import.meta.env.VITE_BATTLE_TURN_ENDPOINT || '/api/battle-turn';

// Deals both trainers a random team. Same Vercel-only caveat as above.
export const BATTLE_RANDOM_ENDPOINT = import.meta.env.VITE_BATTLE_RANDOM_ENDPOINT || '/api/battle-random';
