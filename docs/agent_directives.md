# Agent Directives & Auto-Learn Protocol

> **Strict directive — failure recovery sequence:**
> If Enzo disapproves of a change, or if your code causes a rendering or Firebase error:
> 1. **Stop.** Revert immediately if the app is unbootable.
> 2. Ask a clarifying question to understand the exact intent.
> 3. **Record the lesson** in the Learned Constraints section below so future agents do not repeat the mistake.

---

## Protocols

### Before Non-Trivial Work
1. Read `docs/index.md` for the module map.
2. Read `docs/wounds.md` for the anti-pattern registry.
3. Read the relevant module file(s) for the area you are changing.

### Before Any UI Change
Read `docs/modules/styles_and_aesthetics.md` without exception. The design bar is high — generic output is a failure.

### When Adding a New Route
- Add the `<Route>` only in `AppLayout.jsx`.
- Add the view to `src/components/views/index.js` barrel export.
- Add a navigation link in the sidebar section of `AppLayout.jsx`.
- Add page guide tips to `src/components/PageGuide.jsx`.
- Add any new strings to `src/constants/translations.js`.

### When Adding a New Firestore Path
- Add a matching rule in `firestore.rules`.
- Deploy with `firebase deploy --only firestore:rules`.
- Document the path in `docs/modules/firebase_architecture.md`.

### When Adding a New Color Token
1. Add to each theme block in `src/index.css` under `:root[data-theme="..."]`.
2. Add to `src/constants/theme.js` `colors` object.
3. Add to `applyTheme()` in `src/constants/theme.js`.

### When Changing Cached Data Shape
Bump `CACHE_VERSION` in `src/services/pokemonDataCache.js`. This purges stale-format entries from long-TTL users' storage on their next visit.

---

## Learned Constraints Log

*Append new learnings here — date, mistake, correct constraint.*

- **[2026-05-22] Modular Documentation Shift:**
  - *Mistake:* Agentic context was a single large file, bloating context windows.
  - *Constraint:* Documentation must remain modular. `docs/index.md` is the root map; topic detail belongs in isolated `docs/modules/*.md` files.

- **[2026-06-19] Documentation Audit & Expansion:**
  - *Evolution:* Existing docs were sparse — styles_and_aesthetics and views_and_routing were thin summaries; components, state/stores, and data layer had no dedicated modules.
  - *Constraint:* The full module set is now: `styles_and_aesthetics`, `views_and_routing`, `components`, `state_and_stores`, `data_layer`, `firebase_architecture`, `firebase_security`. All must stay up to date when their areas change.
