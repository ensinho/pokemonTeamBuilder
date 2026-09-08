# Firebase Architecture

The project uses **Firebase v11 (Modular SDK)** for authentication and Firestore. Initialization lives in `src/services/firebase.js` — config is read from `VITE_*` env vars via `src/constants/firebase.js`. All Firestore access goes through Zustand stores in `src/store/`.

---

## Authentication

**File:** `src/store/useAuthStore.js`

Two auth modes:
- **Anonymous** — automatic on first visit, zero friction. User gets a `uid` and their data is persisted.
- **Email/Password** — user upgrades their anonymous account to a named account.

**Critical:** Anonymous → email upgrade uses `linkWithCredential`, not sign-out + re-create. Signing out and recreating changes the `uid`, which orphans all existing Firestore data. Never replace this with a fresh sign-in flow.

Lifecycle:
1. `initAuth()` — called in `App.jsx` on mount. Sets up `onAuthStateChanged` listener.
2. `onAuthStateChanged` fires → hydrates profile (displayName, theme, favorites, streak), determines greeting Pokémon, loads active team id from localStorage.
3. `cleanupAuth()` — called in `App.jsx` on unmount. Unsubscribes the listener.

---

## Firestore Schema

All documents are namespaced under **`artifacts/${appId}/`** where `appId` = `VITE_APP_ID` (default: `pokemonTeamBuilder`).

```
artifacts/
  pokemonTeamBuilder/
    users/
      {userId}/
        teams/           Real-time (onSnapshot). Ordered by updatedAt desc.
          {teamId}       { name, slots[], updatedAt, isFavorite, isPublic }
        quizRuns/
          {runId}        { generation, correct, total, streak, timestamp }
    public/
      data/
        teams/           Publicly shared teams (community feed)
          {teamId}       { name, slots[], authorId, authorName, likes[] }
        forumTopics/
          {topicId}      { title, category, authorId, createdAt }
            messages/
              {msgId}    { text, authorId, authorName, teamRef?, createdAt }
    pokemons/            Legacy seed collection — mostly superseded by static cache
      {pokemonId}        { name, types, stats, moves, ... }
```

**User profile fields** are stored on the user document at `artifacts/${appId}/users/{userId}`. Fields: `displayName`, `theme`, `language`, `greetingPokemonId`, `streak`, `lastStreakDate`, `favorites[]`.

---

## Real-time Listeners

`useFirestoreTeamsStore` attaches `onSnapshot` listeners to `users/{userId}/teams` and `public/data/teams` when the user is authenticated. These auto-update the store on any Firestore change.

Rule: Local state gives immediacy (optimistic updates), but `onSnapshot` is the synchronizing truth. Never treat local state alone as the source of truth for saved data.

---

## Known Gotchas

### Composite Indexes
Queries combining multiple fields (e.g., filter by type array AND sort by name) may require a Firestore composite index. If a query throws an error containing a Firebase console URL, surface it to the user to click — it auto-creates the index.

### Admin Gating
The `/admin` route and the `api/send-admin-reply.js` function both check `VITE_ADMIN_EMAILS`, but this is **client-side only**. Real access control must live in **Firestore Security Rules** (`firestore.rules`). The client check is a UX gate, not a security gate.

### New Firestore Paths
Every new path added in code needs a matching rule in `firestore.rules`. Unmatched paths are denied by default. Deploy rules with:
```bash
firebase deploy --only firestore:rules
```

See [Firebase Security](./firebase_security.md) for the full rules model.

### Active Team Sync
`activeTeamId` is mirrored to `localStorage` under the key `ptbActiveTeamId`. This lets the app remember the last active team across page refreshes before auth hydration completes. When updating active team logic, update both the store and localStorage.

---

## Serverless Function

**File:** `api/send-admin-reply.js` (Vercel serverless)

Lets admins send email replies to user feedback. Flow:
1. Caller sends Firebase ID token in the `Authorization: Bearer` header.
2. Function verifies the token against Google's JWKS via `jose`.
3. Checks the decoded email against the admin allowlist (`ADMIN_EMAILS` env var on Vercel).
4. Sends the email via `nodemailer`.

This function runs **only on Vercel** — not on GitHub Pages or local dev without a Vercel CLI tunnel.
