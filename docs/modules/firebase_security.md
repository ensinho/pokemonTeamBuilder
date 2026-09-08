# 🔒 Firebase Security — a working guide

This explains how Firestore security actually works and how it maps onto **this**
project. The rules live in [`firestore.rules`](../../firestore.rules) (deployable,
version-controlled). Read this once and the rules file will read like plain English.

---

## 1. The one idea that matters: default-deny

Firestore rules are **not a firewall you add on top** — they ARE the access layer.
Every single read and write from any client (your app, a `curl`, a script someone
wrote) is evaluated against `firestore.rules` on Google's servers **before** it
touches data. If no rule says `allow`, the operation is **denied**.

> Your React UI and the `ADMIN_EMAILS` check in the app are **cosmetic**. Anyone can
> open the browser console and call `setDoc(...)` directly. The rules are the only
> thing that stops them. Treat the client as hostile.

### Why this is urgent here
There were **no rules in the repo** until now. The live database is protected only by
whatever is pasted into the Firebase Console. The two default templates Firebase
offers are both wrong for a real app:
- **Test mode:** `allow read, write: if true;` → anyone on the internet can read,
  overwrite, or wipe your entire database. (Often auto-expires after 30 days → then
  everything breaks instead.)
- **Locked mode:** `allow read, write: if false;` → nothing works at all.

The rules in this repo are the real, least-privilege middle ground.

---

## 2. The vocabulary

Inside a rule you have a few magic objects:

| Object | Meaning |
|---|---|
| `request.auth` | `null` if signed-out; otherwise `{ uid, token }`. **Anonymous users are signed in** — they have a `uid`. |
| `request.auth.uid` | the caller's user id. |
| `request.auth.token.email` / `.email_verified` | claims from the ID token. |
| `request.resource.data` | the document **as it will be after** a write (use for `create`/`update` validation). |
| `resource.data` | the document **as it currently exists** (use to check ownership before `update`/`delete`). |
| `request.time` | server timestamp of the request. |

Operations you `allow`: `read` (= `get` + `list`), `write` (= `create` + `update` + `delete`).
You can split them for finer control, which we do.

`match /path/{wildcard}` binds a path segment to a variable. `{document=**}` is a
**recursive** wildcard matching any depth below — we use it so one rule covers a
user's whole subtree (`teams`, `quizRuns`, `favorites`, `profile`, `pokepuzzle`).

---

## 3. How the rules map to THIS app

Access patterns were extracted directly from `src/store/*.js`. Summary:

| Data | Path | Who can read | Who can write |
|---|---|---|---|
| User's teams, quizRuns, favorites, profile, pokepuzzle | `artifacts/{appId}/users/{userId}/**` | owner only | owner only |
| Shared teams (share links) | `artifacts/{appId}/public/data/teams/{id}` | **anyone** | any signed-in user creates; no edit/delete (no owner field) |
| Forum topics + messages | `artifacts/{appId}/public/data/forumTopics/**` | **anyone** | author creates (uid-stamped); author or admin edits/deletes |
| Feedback / suggestions | `artifacts/{appId}/feedback`, `.../suggestions` | admin only | any signed-in user creates |
| Legacy pokémon seed | `artifacts/{appId}/pokemons` | anyone | nobody (read-only) |

Key design choices and the reasoning:

- **Ownership comes from the URL.** Private data lives under `.../users/{userId}/...`,
  so the rule is simply `request.auth.uid == userId`. A user literally cannot address
  another user's path because the rule denies it.
- **Forum posts are uid-stamped.** The app writes `createdBy: userId`. The rule on
  `create` enforces `request.resource.data.createdBy == request.auth.uid` so nobody can
  forge a post as someone else; `update`/`delete` check the *existing* `resource.data.createdBy`.
- **Shared teams have no owner field** (the code writes only `name`/`pokemons`/`createdAt`).
  So we allow public create + read but **forbid update/delete from clients** — otherwise
  anyone could edit/delete anyone's shared team. We also validate the payload shape
  (`name` ≤ 100 chars, ≤ 6 pokémon) to stop junk writes. *If you later add `createdBy`
  to shared teams, switch update/delete to an ownership check.*
- **Feedback is a write-only mailbox:** users submit, only admins read. Prevents users
  from reading each other's feedback.

---

## 4. The admin problem (important)

`ADMIN_EMAILS` is a **client env var** — invisible to rules and trivially faked in the
client. The rules currently hard-code the admin email in `isAdmin()`. That works but:

1. The email list is duplicated (here + `VITE_ADMIN_EMAILS`) and must be kept in sync.
2. It relies on `email_verified`, which is fine, but emails can change.

**The correct long-term fix: custom claims.** Run once (Node, with the Admin SDK):

```js
import { getAuth } from 'firebase-admin/auth';
await getAuth().setCustomUserClaims(uid, { admin: true });
```

Then simplify the rule to:

```
function isAdmin() {
  return isSignedIn() && request.auth.token.admin == true;
}
```

Now admin status lives on the server-issued token, can't be spoofed, and isn't tied to
an email string. (The serverless function `api/send-admin-reply.js` already verifies ID
tokens with `jose` — it could read the same claim.)

---

## 5. Deploy & test

```bash
# one-time: install + log in
npm i -g firebase-tools
firebase login

# deploy ONLY the rules (safe; doesn't touch hosting/data)
firebase deploy --only firestore:rules

# project is pinned in .firebaserc → pokemonbuilder-8f80d
```

**Always test before trusting.** Firebase Console → Firestore → **Rules** → **Rules
Playground**. Simulate, for example:
- signed-in user reading `artifacts/pokemonTeamBuilder/users/SOMEONE_ELSE/teams/x` → should **deny**.
- signed-out user reading `.../public/data/teams/x` → should **allow**.
- signed-in non-admin reading `.../feedback/x` → should **deny**.

There is also the local emulator (`firebase emulators:start --only firestore`) if you
want to write automated rule tests later.

---

## 6. Gotchas specific to this project

- **`list` vs `get`:** a rule that allows reading one doc does not automatically make a
  *query* safe. `onSnapshot` on a collection issues a `list`; the rule must allow it for
  the documents the query can return. Our public collections allow `read` (both), and
  user queries are scoped under the owner path, so this is covered — but if you add a
  query that spans users, revisit this.
- **Anonymous users count as signed-in.** That's intended (the app upgrades anon → email
  in place). Don't write `isSignedIn()` expecting it to exclude anonymous users.
- **Rules can't read other documents cheaply.** `get()`/`exists()` inside rules cost a
  read and have limits. Prefer encoding ownership in the path (as we do) over lookups.
- **Composite indexes are separate from rules.** If a query errors with a console URL,
  that's an index, not a permission problem — add it to `firestore.indexes.json`.
