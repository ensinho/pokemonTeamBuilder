---
name: verify-ui
description: Prove a UI change works before saying it does — tests, build, lint delta, design-system drift audits and a real-browser pass (installed Edge via playwright-core) at desktop and phone sizes in dark and light, including mid-animation frames and touch gestures. Use before claiming any visual/interaction task is done, before committing UI work, and whenever the user asks for something to be "testado", "garantido" or "validado".
---

# Verify before you claim (UI)

Adapted from obra/superpowers' *verification-before-completion*: **no completion
claim without fresh evidence.** For each claim, name the command that proves it,
run it now, read the output, and only then say it. "It should work", "the build
passed so the UI is fine", and "I checked earlier" are not evidence. Report what
you did **not** verify as plainly as what you did.

## 1. The gates (every UI change)

```bash
npx vitest run                 # know the baseline: api/_lib/dependencies.test.js fails
                               # locally when web-push isn't installed / npm can't spawn
npx vite build                 # skips the network prebuild; the real compile check
npm run lint 2>&1 | tail -2    # compare the TOTAL to the baseline, not to zero
npx eslint <touched files>     # nothing new in what you edited
```

Lint baseline: **91 problems (60 errors, 31 warnings) on 2026-09-24** (update it when a change lowers it). A change
may lower it, never raise it. Watch for `react-refresh/only-export-components`
(a hook and a component in one file) and `no-undef` after moving code.

Then the design-system audits (the `/design-system` skill has the commands):
spacing literals, literal `rgba()` shadows, undefined `var(--x)` — compare the
touched files against `git show HEAD:<file>`; the count must not grow.

## 2. The browser pass

Headless **installed Edge** through `playwright-core` (no browser download),
from a script in the scratchpad — never add Playwright to the project.

```bash
cd <scratchpad> && npm i playwright-core@1        # once per session
npx vite --port 5174 --strictPort                   # in the project, background
```

```js
import { chromium } from 'playwright-core';
const BASE = 'http://localhost:5174/pokemonTeamBuilder';     // dev base path
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
  isMobile: true, hasTouch: true,              // desktop: 1440×900, no touch
  reducedMotion: 'no-preference',              // or animations are skipped
});
await context.addInitScript((theme) => {       // silence the auto-opening dialogs
  localStorage.setItem('patchNotesVersion', '<PATCH_NOTES_VERSION>');
  localStorage.setItem('tb-onboarding-seen', '1');
  localStorage.setItem('syncPromptDismissed', '1');
  localStorage.setItem('theme', theme);        // run dark AND light
}, 'dark');
const page = await context.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
```

Rules that make the pass worth something:

- **Two widths × two themes minimum:** 1440×900 and 390×844, `dark` and `light`.
  Most regressions here live in exactly one of the four.
- **Assert facts, then look.** Computed styles (`getComputedStyle(el, '::before')`),
  store state (`await import('/pokemonTeamBuilder/src/store/<store>.js')` in
  `page.evaluate` — dev serves source modules), node identity (mark a node with a
  `data-` attribute, act, check it survived — this is how a whole grid remounting
  on a star tap was found). A screenshot is the last check, not the only one.
- **Motion needs mid-frames.** Click, wait 80–200ms, screenshot; wait out the
  duration, screenshot again. A still "after" frame cannot tell a glide from a
  teleport.
- **Touch is CDP, not clicks:** `context.newCDPSession(page)` →
  `Input.dispatchTouchEvent` `touchStart` / several `touchMove` / `touchEnd`.
  Test both the gesture that should commit and the one that should spring back.
- **Navigate client-side** when a full reload would reset what you are testing:
  `(await import('/pokemonTeamBuilder/src/utils/navigation.js')).navigateTo('/moves')`.
- **Hold a loading state** with `page.route(/\/pokemonTeamBuilder\/data\//, () => {})`
  — never a bare `/data/` pattern: it also matches `src/data/*` modules and the
  app never boots.
- **Ignore** `ERR_BLOCKED_BY_RESPONSE.NotSameOrigin` (external sprite hosts in
  headless) and the broken-image glyph in empty team slots; nothing else.

## 2b. When the cascade itself changes

Stylesheet order, imports, a selector's specificity: a screenshot diff says
*that* something moved, not *what*. Build both versions, serve them with
`npx vite preview --outDir <dir> --port <n>` (two ports), and diff the
**computed styles**: walk every element under `.app-shell`, key it by its
structural path (tag + classes + child index), record the properties the cascade
decides (margins, paddings, gaps, font, colours, borders, radius, display,
overflow, flex/grid), and report each `(classes, property): before → after`.
That names the exact rule pair that flipped and whether a stylesheet is simply
missing on a route (a whole block of properties falling back to defaults).
Pass `MSYS_NO_PATHCONV=1` when a route argument starts with `/` in Git Bash, or
it becomes `C:/Program Files/Git/...`. The 2026-09-24 barrel entry in
`docs/wounds.md` is the worked example.

## 3. The report

Say what passed with the numbers (tests, lint total, audit counts, the widths and
themes you drove), what failed and why, and what cannot be verified here —
iOS Safari gesture feel, the home indicator, haptics, real network latency need a
phone. Log anything you fixed with `/log-wound`.
