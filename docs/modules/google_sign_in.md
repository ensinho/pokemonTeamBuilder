# Sign in with Google (2026-11-12)

Enzo: "adicione entrar com o google… facilita a vida para os outros, garanta
salvar firebase". "Continuar com o Google" is in the Primeira Jornada's
account screen and in the `AuthModal` the rest of the app opens.

## Pieces

| File | Role |
|---|---|
| `src/services/googleAuth.js` | The popup. `linkWithPopup` for a guest (the **same uid** — teams, favourites, progress stay put); on `auth/credential-already-in-use` it signs into the existing account with the credential the error carries. `signInWithPopup` otherwise. The resolver (`browserPopupRedirectResolver`) is passed **at the call**, never to `initializeAuth` (`services/firebase.guard.test.js`); the module loads only when the button is pressed. |
| `useAuthStore.handleGoogleSignIn()` | Migrates the guest's PokéPuzzle progress when it moved to an existing account (like the email sign-in), sets `isAnonymous`/`userEmail`/`isAdmin`, and takes the Google name as `displayName` **only if the trainer has none** — saved through `savePreferences` (the preferences doc), and the account's own saved name wins when it hydrates. Toasts like the email paths. Returns `{ linked, isNewUser, name }`. |
| `src/services/googleAvailability.js` | `useGoogleSignInAvailable()`: one `accounts:createAuthUri` probe per session. While the project's Google provider is off it answers `OPERATION_NOT_ALLOWED` and **the button stays hidden** — it appears on its own once the provider is on. Offline/unsure: shown. |
| `src/components/GoogleButton.jsx` + `styles/google-button.css` | Google's branding (the four-colour G on white, `--google-*`) — the documented raw-colour exception, like type colours. `.auth-or` is the "ou" rule under it. |
| `src/utils/authErrors.js` | `auth/popup-blocked`, `auth/operation-not-allowed`, `auth/unauthorized-domain`, `auth/account-exists-with-different-credential` as sentences; `isAuthCancel(err)` — a closed popup is not an error. |
| `vercel.json` | `/__/auth/*` and `/__/firebase/*` proxied to `pokemonbuilder-8f80d.firebaseapp.com`, before the catch-all — ready for the authDomain switch below. |

## What the Firebase project needs (console, once)

Checked 2026-11-12 with `getProjectConfig` / `createAuthUri`: **the Google
provider was off, and `pokemonbuilder.app` was not an authorized domain**
(only localhost, the firebaseapp.com/web.app hosts and ensinho.github.io).

1. Firebase console → Authentication → Sign-in method → **Add new provider →
   Google** → Enable → pick the support email → Save.
2. Authentication → Settings → **Authorized domains** → add
   `pokemonbuilder.app` (and `www.pokemonbuilder.app` if it serves).
3. Optional, for the installed iOS app (third-party storage blocks the
   firebaseapp.com handler there): set `VITE_FIREBASE_AUTH_DOMAIN` to
   `pokemonbuilder.app` on Vercel and add
   `https://pokemonbuilder.app/__/auth/handler` to the OAuth client's
   authorized redirect URIs (Google Cloud → APIs & Services → Credentials).
   The proxy in `vercel.json` already serves that path.

Probe it after: `createAuthUri` with `providerId: 'google.com'` returns an
`authUri` instead of `OPERATION_NOT_ALLOWED`.

## Costs

The popup resolver's code rides the `firebase` vendor chunk (+~3 KB gz; one
ESM file, it cannot split) but does nothing until pressed — the gapi script
and the auth iframe (~135 KB) still load only on the click. `googleAuth`
itself is a 0.5 KB chunk.

## Privacy

`/privacy` says it (2026-11-12): Google gives Firebase Authentication the
email, name and photo; the site keeps the email, uses the name only as a
first display name, and does not use the photo.
