---
name: ux
description: Make every interaction fewer steps, answered instantly and honest about waits — the behaviour and performance layer of the app (the design-system skill owns how things look; this one owns how they act and how fast). Use before building or changing any view, flow, modal, list, picker, form, search, loading state or async action; when a screen feels "lento", "travado", "pesado", "confuso", "cheio" or "demora pra responder"; when a tap gives no feedback, a list jumps, a loader flashes, a grid remounts, a flow needs too many taps, or a choice is buried; before adding a dependency, a route, an image or anything to the boot path; and whenever INP, LCP, CLS, bundle size, precache size, re-renders, long tasks or scroll jank come up. Carries the pre-flight checklist, the performance budgets with this app's measured baselines, the response-time rules, a grep-able smells list and a playwright measurement recipe.
---

# UX — fewer steps, instant answers, honest waits

**Scope.** `/design-system` owns tokens, spacing, colour, type, motion *curves*
and the taste gate. `/mobile-native` owns the platform layer (tap highlight,
`dvh`, input zoom, safe areas, `touch-action`). `/verify-ui` owns the gates and
the screenshot pass. **This skill owns behaviour and speed:** how many steps a
task takes, what the user sees in the 100 ms after acting, how waits are shown,
what is disclosed when, and the numbers a change must not make worse. Don't
restate the other three — link to them.

## The core principle

**The user acts; the interface answers before they wonder whether it heard.**
Three corollaries, each with a number:

1. **Answer on the tap (≤ 100 ms).** A tap that changes local state changes it
   in the same frame; the network catches up behind it (optimistic, rollback on
   failure). Below 0.1 s the system feels like it is the user's own hand
   (Nielsen); past 0.4 s both parties start waiting on each other (Doherty).
2. **Never make a wait look like a failure, or a refresh look like a wait.**
   Nothing for < 1 s, a skeleton/`<Loader>` for 1–10 s, a progress bar with
   cancel past 10 s — and data already on screen is refreshed *in place*, never
   torn down for a loader (wound 2026-09-24, "every keystroke swapped the grid").
3. **Fewest decisions, fewest taps.** Each extra choice costs time (Hick), each
   small or distant target costs time (Fitts), each hidden destination costs
   discovery (NN/g). Count them before and after a change; the count may not go
   up without a reason written in the PR.

Measure, don't guess: every perf entry in `docs/wounds.md` was found by a
number (cards mounted, janky frames, tap→slot ms, CLS), not by a hunch.

## Pre-flight checklist (any UI change)

Answer each line in the PR/report. "N/A" is a valid answer; silence is not.

### 1. Clicks and steps
- [ ] **Tap count for the primary task**, before → after (e.g. "add a Pokémon
      to the team: 2 → 1"). Script it in the measurement pass.
- [ ] Primary action is the **largest, nearest target** (Fitts): on phones in
      the bottom half / thumb zone, never top-corner only. Hit area ≥ 44×44 CSS px
      on touch (WCAG 2.5.8 floor is 24×24; Apple 44 pt, Material 48 dp) — grow
      the hit area with `.touch-target`, not the control (design-system "Touch").
- [ ] **Reversible → act + undo toast; irreversible → `confirmAction()`.**
      A confirm in front of something undoable is a wasted tap.
- [ ] A consequential pick that the user wants to *look at first* is **staged**
      (tap marks, Save commits, double-click/Enter does both — partner picker,
      2026-10-06). A cheap pick applies on tap.
- [ ] Shortcuts exist for the repeat user: Enter submits the only field,
      ⌘/Ctrl+Enter in a textarea, ⌘K / `/` reaches it via the global search.
- [ ] **State lives in the URL** if the user would share, refresh or go Back to
      it: tab, filter, search, selected entity, pagination (`useSearchParams`).
- [ ] Navigation is a real `<a>`/`<Link>` (Cmd-click, middle-click, long-press
      work), not `onClick={() => navigate()}` on a `<div>`.

### 2. Disclosure
- [ ] Show what ≥ 80% of visits need; put the rest one level down (NN/g
      progressive disclosure). **Max two levels** — a third means redesign.
- [ ] The trigger names what's behind it ("Advanced EVs…", not "More").
      An ellipsis on a label means it opens a follow-up.
- [ ] ≤ ~7 visible choices per decision point (Hick, Miller); a longer set is
      searchable, grouped (chunking) or defaulted. 2–5 exclusive options =
      `.segmented`; more = select/search.
- [ ] Sensible **default pre-selected** (Tesler: the app absorbs the
      complexity, not the user) — e.g. the format the user last used.
- [ ] Primary destinations are visible (the tab bar), not behind "Mais" — hidden
      navigation measurably lowers discovery on mobile and desktop (NN/g).

### 3. Hierarchy
- [ ] **One primary action per view** — the only filled-primary button
      (Von Restorff: the different thing is the one noticed and remembered).
- [ ] Most important item **first** in lists/menus, the exit/commit action
      **last** (serial position).
- [ ] Conventions win over cleverness (Jakob): back is top-left, close is
      top-right or drag-down, search looks like search, swipe-to-dismiss works on
      sheets because every sheet does it.
- [ ] Every screen offers a **next step** — including empty, error and
      "all done" states.

### 4. Feedback
- [ ] Visible response **on press** (`:active` / pointerdown — `/mobile-native`
      §5), state change ≤ 100 ms, never after an `await`.
- [ ] Async action: the button **keeps its label** and shows progress inside;
      disabled only *while in flight* (idempotent), never pre-disabled to hide
      validation — submit runs and focuses the first error.
- [ ] Errors sit **next to the field**, in words that say how to fix it; a
      failed optimistic action rolls back **with a retry/undo toast**.
- [ ] A constrained control **clamps, never silently rejects** (EV slider wound,
      2026-09-21): the readout explains the stop.
- [ ] Async results that change on their own are announced: toasts and inline
      validation are `aria-live="polite"` / `role="status"`.
- [ ] The **end of a flow is a moment** (peak-end): saving a team, winning the
      puzzle, finishing a quiz gets the one reward (`useShinyBurst`, `DecryptText`)
      — the middle of the flow stays quiet.

### 5. Loading
- [ ] **< 1 s: no indicator.** A loader that flashes for 200 ms reads as a glitch.
      Delay showing it **150–300 ms**; once shown keep it **≥ 300–500 ms** (Vercel
      WIG). The boot splash (`.boot-splash`) and the route fallback
      (`.route-fallback`) already fade in late; for any other loader use the
      same `animation-delay` pattern from `app-shell.css`.
- [ ] **1–10 s:** full view → skeleton that **mirrors the final layout exactly**
      (same boxes, same heights, so CLS = 0); one module → `<Loader>`.
      **> 10 s:** determinate progress + cancel (NN/g).
- [ ] **Data on screen is never replaced by a loader.** `isLoading` means
      "nothing to show yet"; a refresh keeps the old content, optionally dimmed
      (`opacity` on `query !== deferredQuery`, delayed 200 ms — React docs).
- [ ] **A view fed by several async sources paints once**, when they settle, with
      a cap (builder grid: 800 ms) — never once per arrival.
- [ ] A hook's `status` describes the id it's asked about **now**.
- [ ] Prefetch on intent: the next route's chunk on hover/focus/idle, the detail
      on pointerdown, not on click-release.

### 6. Motion (behaviour; curves and tokens are `/design-system`)
- [ ] It answers a user act or explains a change of place (continuity). Otherwise
      delete it (Apple HIG: "don't add motion for the sake of adding motion").
- [ ] **Never blocks input**: the next tap works mid-animation; animations are
      interruptible and retarget from where they are (Apple HIG: let people
      cancel motion).
- [ ] **Frequent actions get the least motion** (HIG). A thing done 50×/session
      (toggle, add to team) is ≤ 150 ms; only rare moments get the long springs.
- [ ] Durations track distance/size (NN/g): feedback ~100 ms, panels 200–300 ms,
      large travel ≤ 400 ms, exits shorter than entrances. Nothing over 500 ms
      gates content.
- [ ] Position/size may overshoot (spatial spring); **opacity and colour never**
      (M3 "effects" springs are critically damped).
- [ ] `prefers-reduced-motion: reduce` → the state still changes, without travel
      (cross-fade or instant). Information is never carried by motion alone.

### 7. Scroll, layout and stability
- [ ] **CLS 0 for in-app changes**: images/sprites have a box before they load
      (attributes or CSS size), skeletons match, late content reserves space,
      banners push from a reserved slot or overlay.
- [ ] A sticky element that changes size **does not change its flow height**
      (builder composer wound) — compensation lands in the same layout; probe with
      `overflow-anchor: none`.
- [ ] Back restores scroll position (`useScrollRestoration`); a filter change
      resets to top; a team change does not.
- [ ] Focused fields and anchors aren't hidden under sticky bars
      (`scroll-margin-top/bottom` ≥ the bar), nor under the software keyboard.
- [ ] Autofocus the primary input on desktop; **rarely on phones** (keyboard
      shift).
- [ ] Auto-scroll yields to user intent (forum thread wound): stop following the
      moment the user scrolls.

### 8. Clutter
- [ ] **Remove before adding.** Name what the new element replaces, or why the
      screen needs one more thing.
- [ ] Design all four states: **empty, sparse, dense, error** — and very long
      names (PT-BR strings run ~20–30% longer than EN).
- [ ] One way to do one thing: one search (`CommandPalette` group), one sheet,
      one picker source (`loadPokemonIndex`).
- [ ] Prefer inline explanation over tooltip; a tooltip is never the only place
      information lives (no hover on phones).
- [ ] An unbounded list on a phone is paged (`useProgressiveReveal` /
      `useInfiniteReveal`), and nothing secondary sits under it.

## Performance budgets

Field targets are p75 (web.dev). Lab numbers are taken at **390×844, 4× CPU
throttle** with the recipe below. "Baseline" = measured on this repo; a change
may lower a baseline, never raise it without saying so.

| Metric | Budget | Notes / baseline |
|---|---|---|
| **INP** | ≤ 200 ms p75 (good); poor > 500 | web.dev CWV |
| Tap → visible change, local state | **≤ 100 ms** lab | Nielsen 0.1 s; builder add was 1.5–2.9 s before the optimistic fix, ~0.2–0.6 s after (4×) |
| Any interaction, worst case | ≤ 400 ms | Doherty threshold |
| **LCP** | ≤ 2.5 s p75; poor > 4 s | web.dev; never `loading="lazy"` on the LCP image, give it `fetchpriority="high"` |
| **CLS** | ≤ 0.1 p75; **0** for in-app transitions | builder grid was 0.2 → 0 (2026-10-06) |
| Long frames during an interaction or scroll | none > 50 ms on tap; ≤ 2 per 200 scroll frames | 50 ms = long task (web.dev); builder scroll baseline 2 janky frames |
| Mutation round-trip (`/api/*`, Firestore write ack) | < 500 ms, and UI already updated | Vercel WIG |
| **Boot JS (gzip)** | **do not grow**; target ≤ 365 KB | 2026-10-06: 386 KB → **≈ 359 KB** (entry 175 → 147 by lazy dialogs; firebase 115, react-vendor 58, vendor 39). Russell 2024: 365 KB for a 3 s first load on a p75 Android; web.dev's classic critical-path budget is 170 KB |
| Boot CSS (gzip) | do not grow | ≈ **80 KB** (single `index-*.css`) |
| New dependency | its gzip cost stated in the PR; lazy unless on every route | check with the bundle snippet |
| New route/view | `React.lazy` chunk; never in the barrel's eager path | wound 2026-06-18 |
| Precache | per-file ceiling 1.5 MB (`vite.config.js`); total reported per release; baseline **3.8 MB** (was 13.7 MB: a client-side `@pkmn/sim` + 3.3 MB of PNG covers) | every precached byte is downloaded by every first visit (Workbox: precache the shell, runtime-cache the rest) |
| **Time to shell** (4× CPU, ~Fast 4G, `serviceWorkers: 'block'`, median of 3) | do not grow | 2026-10-06: first visit desktop 4.63 → **2.05 s**, phone 4.36 → **2.22 s**; returning phone 2.67 → **0.82 s** |
| Mounted list items | ≤ 60–120 on first paint; rows `memo` | `useInfiniteReveal` 60/page; 980 cards was the wound |
| DOM nodes | warn > 800, fail > 1,400; depth ≤ 32; ≤ 60 children/parent | Lighthouse DOM-size audit |
| Raster images | AVIF/WebP, sized to the box ×2 DPR, lazy below the fold | web.dev; sprites already `loading="lazy"` + `decoding="async"` in `Sprite.jsx` |

### The boot path (learned 2026-10-06 — every rule here cost seconds)
- **Never gate first paint on a round-trip that has nothing to show.** A first
  visit waited ~3 s for anonymous sign-up + a Firestore read before painting a
  signed-out page it could have drawn at once. `isNewVisitor` (useAuthStore)
  now releases the splash; Firestore reads still wait on `isAuthReady`.
- **A splash/loader floor is counted from when it could be seen, not from
  boot.** Invisible for 300 ms (`.boot-splash`), then ≥ 450 ms once shown
  (`utils/bootSplash.js`). A fixed 900/1800 ms floor taxed every warm start.
- **Nothing from `api/`'s world ships to the browser.** The sim, the dex,
  `@pkmn/randoms`: if a client file needs one field from them, bake a JSON
  in `scripts/` (see `build-battle-dex.mjs`) and load it lazily.
- **Dialogs are lazy chunks**, imported directly (never through the `modals`
  barrel — a barrel drags every side-effectful module into the entry), and
  warmed on idle with the likely routes (`MOBILE_PREFETCH` / `DESKTOP_PREFETCH`
  in AppLayout). The first click must not wait on a download.
- **`manualChunks` matches packages, not substrings.** `'/react/'` once
  matched `zustand/esm/react/shallow.mjs` and created a chunk cycle that
  blanked the app. Anchor to `/node_modules/<pkg>/`, and boot the *production*
  build after any import change — the dev server cannot show a chunk cycle.
- **Raster art is WebP at its display size ×2.** The game covers were 3.3 MB of
  PNG (one 2340 px wide for a 480 px slot); the same art is 0.7 MB. A 32 px logo
  was a 738 KB PNG; `public/logo-mark.webp` is 7 KB.

### React / Zustand performance rules
- **Subscribe with a selector.** `useXStore()` with no selector re-renders on
  *every* store change. Use `useXStore((s) => s.field)` or `useShallow` for
  several fields. (14 bare subscriptions on 2026-10-06, including three in
  `AppLayout`, which re-renders the whole shell.)
- **Rows are `memo` with stable props** — hoisted defaults, `useCallback`
  handlers, the row's own slice of a map (database lists wound).
- **Typing stays instant**: input state is urgent; the expensive list reads
  `useDeferredValue(query)` (the list must be `memo` for it to help) or the update
  goes in `startTransition`. Debounce only network calls.
- **Derive, don't sync**: computed values are computed in render, not copied into
  state by an effect (the EV `remainingEVs` lag wound).
- **An effect that refetches depends only on what changes the result**
  (favourites remount wound).
- **Never define a component inside a component**, never `key={Math.random()}`,
  and `key={index}` only on lists that never reorder/insert.
- **Observer-driven state is gated** to the breakpoint where it is visible and
  kept low in the tree (Gyms scrollspy wound).
- **Long work yields**: split > 50 ms of JS with `scheduler.yield()` (fallback
  `setTimeout(0)`), or move it to a worker. Scroll/touch listeners are
  `{ passive: true }`.
- **`content-visibility: auto`** for long lists of cheap rows only — see
  design-system "Phones" for when it hurts.

## Response-time and feedback rules

| Wait | What the user sees | Source |
|---|---|---|
| ≤ 100 ms | the result itself; no indicator | Nielsen |
| 100 ms – 1 s | the result, plus press feedback; no loader (delay it 150–300 ms) | Nielsen, Vercel WIG |
| 1 – 10 s | skeleton (whole view) or `<Loader>` (one module); keep stale content where it exists | NN/g skeleton screens |
| > 10 s | determinate progress, what's happening, **cancel** | Nielsen |
| failure | the optimistic change rolls back, a toast says what failed with **Retry**, nothing else on screen moves | Vercel WIG |

- **Optimistic by default** for anything that almost always succeeds (add to
  team, star, rename, reorder, react to a post). Patch by a stable id, never
  write back a list captured before an `await` (`set((s) => …)`).
- **Pessimistic only** when failure is common or costly (battle turn submit,
  account changes) — then show progress inside the control that was pressed.
- Feedback lives **where the user is looking**: inside the pressed button, on
  the changed row; a toast is for what has no place on screen (undo, background
  failure, a remote event).
- Prefer `useTransition`'s `isPending` over a hand-rolled `isLoading` for UI
  that is slow to render rather than slow to fetch.

## Smells (detect, then fix)

Run from the repo root (Git Bash). Each is a heuristic: read every hit, never
bulk-edit. Counts in brackets are the 2026-10-06 baseline — a change may lower
one, never raise it.

```bash
# 1 Whole-store subscription -> selector or useShallow                     [11 — AppLayout's 3 fixed 2026-10-06]
grep -rnE 'use[A-Z][A-Za-z]*Store\(\)' src
# 2 Loader replaces existing data -> guard with "nothing built yet"         [3]
grep -rn 'isLoading: true' src/store
# 3 Tap waits on the network -> optimistic set first, patch after the await  [15, noisy]
grep -rnE -A3 'async \(.*\) => \{' src/store | grep -E '^\S+-\s+(const .* = )?await'
# 4 List read before an await, written after -> set((state) => ...)   [21]
grep -rnE 'const .* = get\(\)\.' src/store
# 5 Index keys on dynamic lists -> stable id                               [22]
grep -rnE 'key=\{(i|idx|index)\}' src
# 6 Unmemoised card/row -> React.memo + stable props                      [4]
for f in $(git ls-files 'src/**/*Card.jsx' 'src/**/*Row.jsx'); do grep -q 'memo(' "$f" || echo "$f"; done
# 7 Effect that copies derived state -> compute in render / useMemo  [47, noisy]
grep -rnE -A2 'useEffect\(\(\) => \{' src | grep -E '^\S+-\s+set[A-Z]\w*\('
# 8 Component defined inside a component -> hoist to module scope              [3]
grep -rnE '^\s{4,}(const|function) [A-Z]\w* = ?\(' src/components
# 9 Pre-disabled submit -> let it submit and show errors (in-flight is fine) [27]
grep -rnE 'disabled=\{!' src --include=*.jsx
# 10 Non-passive scroll/touch listener -> { passive: true }                 [1]
grep -rnE "addEventListener\(['\"](scroll|touchmove|wheel)" src | grep -v passive
# 11 Clickable non-control (no keyboard, no Cmd-click) -> <button>/<Link>   [2, single-line only]
grep -rnE '<(div|span|li)[^>]*onClick=' src --include=*.jsx | grep -v 'role='
# 12 Firestore for a list -> static index + client filter                   [1]
grep -rln 'getDocs(' src
# 13 Raw fetch in a component -> pokemonDataCache                              [2]
grep -rlnE '\bfetch\(' src/components
# 14 Eager view import -> React.lazy (only the landing CozyHomeView may be eager) [1]
grep -nE "^import .* from '\./views" src/components/AppLayout.jsx
# 15 Artificial delay >= 500 ms -> remove, or justify in a comment                [11]
grep -rnE 'setTimeout\([^,]+, *([5-9][0-9]{2}|[0-9]{4,})\)' src
# 16 Autofocus on phones -> gate to (pointer: fine)                         [5]
grep -rn 'autoFocus' src --include=*.jsx
# 17 Native dialogs -> confirmAction() / toast                              [0]
grep -rnE '\b(window\.)?(confirm|alert|prompt)\(' src --include=*.jsx | grep -v confirmAction
# 18 Shareable UI state kept in useState -> useSearchParams                [15]
grep -rnE "const \[(tab|activeTab|filter|view|selected\w*)," src/components/views
# 19 Image with no box before load -> width/height or a sized class   [97]
grep -rnE '<img\b' src --include=*.jsx | grep -vE 'width=|height=|className="[^"]*\b(w-|h-|size-)'
```

Not grep-able, check by reading: a `<Loader>` driven by a flag that can be true
for < 300 ms (needs show-delay + min-visible); a toast used where the change
has a place on screen; a confirm in front of an undoable action; a third level
of disclosure; a primary action reachable only from a top corner on phones.

## Measurement recipe

Extends `/verify-ui` §2 (same installed-Edge `playwright-core` setup in the
scratchpad; never add Playwright to the project). Measure the **production
build** for perf numbers (`npx vite build && npx vite preview --port 4174
--strictPort`), the dev server only for behaviour.

### 1. Throttle like a mid-range phone
```js
const cdp = await context.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await cdp.send('Network.enable');
await cdp.send('Network.emulateNetworkConditions', {   // ~"Fast 4G"
  offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8,
});
```

### 2. Collect vitals and long frames in the page (before any script runs)
```js
await context.addInitScript(() => {
  const m = (window.__ux = { lcp: 0, cls: 0, inp: 0, events: [], loaf: [], loaders: 0 });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) m.lcp = e.startTime; })
    .observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) m.cls += e.value; })
    .observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.interactionId) {
      m.events.push({ name: e.name, dur: e.duration }); m.inp = Math.max(m.inp, e.duration); } })
    .observe({ type: 'event', durationThreshold: 16, buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries())
      m.loaf.push({ dur: e.duration, block: e.blockingDuration,
        scripts: e.scripts.map((s) => `${s.sourceFunctionName}@${s.sourceURL.split('/').pop()}`) }); })
    .observe({ type: 'long-animation-frame', buffered: true });
  // count loader appearances (a flash is a smell)
  new MutationObserver((recs) => { for (const r of recs) for (const n of r.addedNodes)
      if (n.nodeType === 1 && (n.matches?.('.loader') || n.querySelector?.('.loader'))) m.loaders++; })
    .observe(document.documentElement, { childList: true, subtree: true });
});
// …act…
const ux = await page.evaluate(() => window.__ux);
```
Report `lcp`, `cls`, `inp` (max interaction duration ≈ INP for a short
session), `loaf.filter(f => f.dur > 50).length` and the top scripts in them.

### 3. Tap → first visible change
```js
const ms = await page.evaluate((sel) => new Promise((done) => {
  const el = document.querySelector(sel); const t0 = performance.now();
  const mo = new MutationObserver(() => { mo.disconnect();
    requestAnimationFrame(() => done(performance.now() - t0)); });
  mo.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
  el.click();
}), '[data-testid="add-pokemon"]');   // pick the real selector
```
Budget ≤ 100 ms for local state. Run 5×, report the median and the worst.

### 4. Remounts and loader flashes
Mark a node (`el.dataset.uxProbe = '1'`), perform the action (type "char",
star a card, change team), check `document.querySelector('[data-ux-probe]')`
still exists and `__ux.loaders` did not move. A surviving node + 0 loaders is
the pass (favourites and search wounds were found exactly this way).

### 5. Scroll jank (touch)
Reset `__ux.loaf = []`, then drive the scroller with CDP touch
(`Input.dispatchTouchEvent` start / 10× move of −80px / end, ×5) or
`Input.synthesizeScrollGesture`. Count frames > 50 ms; budget ≤ 2. If a
sticky element is involved, also log `scrollTop` per step and count direction
reversals (must be 0).

### 6. Tap count
Script the primary task end to end with `page.click` only and count the calls;
put "before → after" in the report.

### 7. Bundle and precache (after `vite build`)
```bash
cd dist
# boot path = entry + modulepreloads named in index.html
for f in $(grep -oE '(src|href)="[^"]+\.(js|css)"' index.html | sed -E 's/.*="[^"]*\/(assets\/[^"]+)"/\1/'); do
  printf "%7d B gz  %s\n" "$(gzip -c "$f" | wc -c)" "$f"; done | sort -rn
node -e "const fs=require('fs');const u=[...fs.readFileSync('sw.js','utf8').matchAll(/url:\"([^\"]+)\"/g)].map(m=>m[1]);let t=0;for(const x of u){try{t+=fs.statSync(x).size}catch{}}console.log(u.length,'precache entries',(t/1048576).toFixed(2),'MB')"
```
Compare against the table above and against `git stash`'s build when the
change touches imports.

### 8. The site-wide battery (before → after)

For any change that touches more than one view, or anything on the boot path,
measure the whole site rather than the screen you edited. `bench/ux-bench.mjs`
(next to this file) is the battery: build metrics (boot JS/CSS gzip,
precache, image weight), boot (first visit + returning, median of 3), every
route × desktop 1440 / phone 390 (ready time, LCP, CLS, long frames, DOM
nodes, screens of scroll, targets < 24 / < 44 px, nested borders, broken
images, unnamed controls, axe-core WCAG A/AA violations, console errors) and
interactions (open search, route changes through the real rail/tab bar, open
Mais, Pokédex scroll jank). All under 4× CPU + ~Fast 4G.

```bash
# baseline = HEAD in a worktree (node_modules as a junction), candidate = the working tree
git worktree add --detach <scratch>/base HEAD
(cd <scratch>/base && npx vite build --outDir <scratch>/dist-base)
npx vite build --outDir <scratch>/dist-new
npx vite preview --outDir <scratch>/dist-base --port 4181 --strictPort &
npx vite preview --outDir <scratch>/dist-new  --port 4182 --strictPort &
cd <scratch>/pw && npm i playwright-core@1 axe-core      # once
cp <repo>/.claude/skills/ux/bench/ux-bench.mjs .
MSYS_NO_PATHCONV=1 node ux-bench.mjs --port 4181 --dist <scratch>/dist-base --label base --out results-base.json
MSYS_NO_PATHCONV=1 node ux-bench.mjs --port 4182 --dist <scratch>/dist-new  --label new  --out results-new.json
```

`bench/ux-reach.mjs` adds the click count: from Home, through the visible
navigation only (rail / tab bar / Mais sheet), how many clicks reach each
destination and which have no path at all. It hit-tests (`elementFromPoint`)
instead of trusting Playwright's "visible" — items clipped inside a folded
section count as visible to Playwright — waits for the rail's fold animation
to settle, and resets `ptb-sidebar-collapse-pref` / `ptb-sidebar-open-groups`
on every load (its first click is the rail's own collapse button).

Two traps it already handles, keep them if you edit it: block only writes to
**public** paths (`public%2F` in the Write body) — the old boot waits for the
visitor's own preferences write, so blocking every write strands it on the
splash; and reuse one saved session per viewport for the route pass
(`storageState({ indexedDB: true })`) so the battery does not mint an
anonymous account per page in the live project. Live data (forum, usage)
moves between runs: compare a base and a candidate run taken the same day.

### 9. Report
Numbers, not adjectives: "tap→slot 84 ms (median of 5, 4×), CLS 0, 1 frame >
50 ms over 200, boot JS 386 → 386 KB gz, taps 2 → 1." Say what you could not
measure here (real iOS Safari, real network, low-power mode) — `/verify-ui` §3.
Log any fix with `/log-wound`.

## Sources

- Vercel Web Interface Guidelines — https://github.com/vercel-labs/web-interface-guidelines (as an agent command: https://vercel.com/changelog/web-interface-guidelines-now-available-as-an-agent-command)
- Vercel agent skills: `web-design-guidelines` (fetches the guidelines live, reports terse `file:line`) and `react-best-practices` (70 rules, 8 impact-ranked categories) — https://github.com/vercel-labs/agent-skills
- Anthropic `frontend-design` skill — https://github.com/anthropics/skills/tree/main/skills/frontend-design
- UI UX Pro Max (10 priority-ranked rule categories, pre-delivery checklist) — https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- Laws of UX — https://lawsofux.com/ (Doherty threshold https://lawsofux.com/doherty-threshold/, Fitts, Hick, Jakob, Miller, Tesler, Von Restorff, serial position, peak-end, goal-gradient)
- NN/g, Response Times: The 3 Important Limits — https://www.nngroup.com/articles/response-times-3-important-limits/
- NN/g, Skeleton Screens 101 — https://www.nngroup.com/articles/skeleton-screens/
- NN/g, Progressive Disclosure — https://www.nngroup.com/articles/progressive-disclosure/
- NN/g, Hamburger Menus and Hidden Navigation — https://www.nngroup.com/articles/find-navigation-mobile-even-hamburger/
- NN/g, Touch Target Size — https://www.nngroup.com/articles/touch-target-size/
- NN/g, Executing UX Animations: Duration and Motion Characteristics — https://www.nngroup.com/articles/animation-duration/
- web.dev, Web Vitals — https://web.dev/articles/vitals
- web.dev, Optimize INP — https://web.dev/articles/optimize-inp ; Optimize long tasks — https://web.dev/articles/optimize-long-tasks ; scheduler.yield — https://developer.chrome.com/blog/use-scheduler-yield
- web.dev, Optimize LCP — https://web.dev/articles/optimize-lcp ; Fetch Priority — https://web.dev/articles/fetch-priority
- web.dev, content-visibility — https://web.dev/articles/content-visibility
- web.dev, Choose the right image format — https://web.dev/articles/choose-the-right-image-format
- web.dev, Performance budgets 101 — https://web.dev/articles/performance-budgets-101
- Alex Russell, The Performance Inequality Gap 2024 — https://infrequently.org/2024/01/performance-inequality-gap-2024/
- Chrome, Long Animation Frames API — https://developer.chrome.com/docs/web-platform/long-animation-frames
- Chrome Lighthouse, Avoid an excessive DOM size — https://developer.chrome.com/docs/lighthouse/performance/dom-size
- Workbox, Precaching dos and don'ts — https://developer.chrome.com/docs/workbox/precaching-dos-and-donts
- React, useDeferredValue — https://react.dev/reference/react/useDeferredValue ; useTransition — https://react.dev/reference/react/useTransition
- Material 3 motion (spatial vs effects springs) — https://m3.material.io/styles/motion/overview/how-it-works
- Apple HIG, Motion — https://developer.apple.com/design/human-interface-guidelines/motion
- WCAG 2.2 SC 2.5.8 Target Size (Minimum) — https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
