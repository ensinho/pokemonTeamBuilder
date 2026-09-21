# Notifications

> Read before touching anything that alerts the user: the in-app toasts for
> battles, the OS banners, Web Push, or the daily PokéPuzzle nudge.

Three channels, deliberately separate, all reachable from one switch:

| Channel | Reaches | Lives in |
|---|---|---|
| Toast | a tab that is **open and visible** | `useBattleNotifications` → `useToastStore` |
| OS notification | a tab that is **open but in the background** | `useBattleNotifications` → `registration.showNotification` |
| **Web Push** | the app **closed**, phone locked | `src/services/pushNotifications.js` + `api/lib/webPush.js` |
| Email | a trainer not on the device at all | `api/lib/battleNotify.js` |

---

## The rules

1. **Never diff a listener's output before it has answered.** `useBattlesStore`
   exposes `hasLoadedBattles`; `battles: []` on its own means "not asked yet"
   just as often as "none". Getting this wrong fired one banner per waiting
   battle on every app open (wounds.md, 2026-09-21).
2. **One notification per kind, not per event.** Everything battle-shaped
   carries the tag `ptb-battles`, the daily nudge `ptb-daily`. The service
   worker counts what is already on screen and replaces it with a summary
   ("3 batalhas esperando por você"). `digestAttention`
   (`src/utils/notificationDigest.js`) does the same for in-app bursts.
3. **The permission prompt belongs to a click.** `useNotificationSettings.toggle`
   is the only caller of `requestPermission()`. iOS refuses anything else.
4. **iOS needs the PWA installed.** Safari in a tab exposes neither
   `PushManager` nor `Notification`; `needsIosInstall()` detects that case and
   the UI asks for "Add to Home Screen" instead of for permission.
5. **Show notifications through the service worker**, not the `Notification`
   constructor: it is the only form iOS supports, and it is the only one whose
   click still routes after the tab that created it is gone.
6. **A subscribed device lets push own the background case.** Both channels
   watch the same transitions; the shared tag keeps the tray to one entry, but
   showing both still buzzes twice. `hasPushSubscription()` is the guard.
7. **One service worker, ever.** `public/push-sw.js` is pulled into the
   generated worker via `workbox.importScripts`. A second registration re-opens
   the double-update-prompt wound (2026-09-14).

---

## Who sends what

| Moment | Sender | Written by |
|---|---|---|
| Your turn / battle opened | `api/lib/battleNotify.js` (push + email) | the turn resolver, `api/battle-turn.js` |
| Challenge sent, team owed | `api/battle-notify.js` | the browser — `useBattlesStore` pings it |
| New daily PokéPuzzle | `api/daily-puzzle.js` | Vercel cron, `0 12 * * *` (09:00 BRT) |

On the Hobby plan a cron may run **once a day at most**, and fires within the
scheduled hour rather than on the minute. This project now has two — the
tournament refresh and this one — which is the Hobby cap; a third would need
folding into one of them, or a paid plan.

`api/battle-notify.js` exists because those two transitions are written to
Firestore straight from the client, so there is no server request they could
ride. It takes only a `battleId` and re-derives everything from the stored
document (`pickBattlePushTarget`) — a caller can never talk it into notifying a
third party, or into notifying when the battle's own state owes nothing.

---

## Data

Subscriptions live at
`artifacts/{appId}/users/{uid}/pushSubscriptions/{endpointHash}` — owner-only by
the existing `users/{userId}/{document=**}` rule, no rules change needed. The
document carries `lang` and `topics` **denormalised**, so the daily cron is one
`collectionGroup` query with no profile read per trainer.

Endpoints rotate silently, so `syncSubscription()` re-mirrors whatever the
browser currently holds on every boot. A push service answering 404/410 means
the subscription is gone for good; `sendToSubscriptionDocs` deletes the row on
the spot rather than retrying it forever.

---

## Configuration

Generate the key pair once with `npm run push:keys`, then set in Vercel:

```
VITE_VAPID_PUBLIC_KEY=…   # client *and* server; public by design
VAPID_PRIVATE_KEY=…       # secret
VAPID_SUBJECT=mailto:…    # optional; defaults to the admin address
VAPID_PUBLIC_KEY=…        # optional override of the public half
CRON_SECRET=…             # optional; guards /api/daily-puzzle
```

`VITE_VAPID_PUBLIC_KEY` is build-time for the client, so **adding it changes
nothing until the next deploy** — set it, then redeploy. The server reads the
same variable (`getVapidPublicKey`), so the two halves cannot drift apart into
403s that look like nothing.

**Rotating the pair invalidates every existing subscription** — each one is
bound to the public key it was created with, and every trainer would have to
re-enable notifications. Generate once, keep it.

Without the keys nothing breaks: the app still shows toasts and OS banners while
it is open, the toggle says so (`battle.notifyForegroundOnly`), and the cron
answers `skipped`.
