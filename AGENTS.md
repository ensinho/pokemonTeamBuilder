# AGENTS.md

Universal engineering & UX operating manual for AI coding agents working on **PokemonBuilder** (`https://pokemonbuilder.app`).

> **Domain & architecture source of truth:** read [CLAUDE.md](./CLAUDE.md) and [docs/index.md](./docs/index.md) for the complete system map (Zustand stores, PokéAPI static cache, Firestore model, Vercel serverless rules, Mascot, and `docs/wounds.md`). This file defines **how** agents plan, evaluate skills, orchestrate subagents, propose UI, and verify work before shipping.

---

## 1. Pre-Flight Skill Evaluation (Mandatory)

Before editing code or proposing a design, check `.agents/skills/` and read the relevant `SKILL.md` files:

| Task Type | Required Skills to Read First |
| --- | --- |
| Any CSS / layout / component styling | `design-system` (strict `--space-*`, `--text-*`, `--radius-*`, `--color-*` tokens; zero raw hex/rgb/rgba; zero nested 1px borders; single Volt primary CTA) |
| Any UX flow, list, modal, picker, loading state | `ux` (fewer taps, instant feedback, honest waits, performance budgets) |
| Any mobile / phone screen restructure | `app-screens` + `mobile-native` |
| Complex visual craft / micro-interactions | `affectui-m3-taste`, `emil-design-eng`, `animate` |
| Final UI verification before commit / PR | `verify-ui` |
| After fixing a bug or user-corrected pattern | `log-wound` (append to `docs/wounds.md`) |

Never invent raw colours, ad-hoc spacing, or new design primitives when the design system already provides one (`<Switch>`, `<Loader>`, `<RollingNumber>`, `<Mascot>`, `<PixelScene>`, `<AdminBadge>`, `<SpecialRoleBadge>`, `useModalA11y`, `confirmAction`, `toast`).

---

## 2. Architecture & Visual-First Proposal Protocol

1. **Ground every proposal in the real codebase first** (grep/read the actual files, rules, and stores before suggesting changes — never give generic textbook advice).
2. **When multiple UI directions exist (or the user asks for options):**
   - Do **not** guess and overwrite production code blindly.
   - Generate **real-browser PNG previews** via headless Edge (`playwright-core`) injected over the running Vite dev server (`npm run dev`), using real app tokens, typography, sprites, and `<PixelScene>` canvases.
   - Present the PNGs side by side in a structured Markdown artifact (with carousels for dark/light/mobile) so the user can pick a direction before code is committed.
3. **When the user asks for an architectural refactor (e.g., Auth/Security/Firestore Rules):**
   - Present the data flow, security rules, reactivity, and teardown plan first; implement after confirmation unless the user explicitly grants full autonomy.

---

## 3. Parallel Subagent Orchestration

When a request splits into **2–3 independent workstreams** (e.g., Quiz UX + Games Hub + Receipt, or Friends Hub + Team Builder):

1. **Assign strictly disjoint file ownership** per subagent — two parallel agents must never write the same file (especially shared files like `src/constants/translations/en.js` / `pt.js`).
2. **Give each specialist a crisp contract:**
   - Which skills to read first (`design-system`, `ux`).
   - Exact writable file list and forbidden files.
   - Required self-check (`npx eslint <touched files>` + targeted Vitest tests).
3. **Never poll subagents in a loop** — wait reactively for completion notifications.
4. **Central integration & final gate:** once all subagents finish, the coordinator runs the unified verification gate (full lint, Vitest, production build, and real-browser visual inspection) before committing.

---

## 4. Hard Verification Gate (Required Before Any Commit / PR)

Never claim a UI or logic change works without passing all 4 checks:

1. **Unit & Guard Tests (Vitest):**
   ```powershell
   npx vitest run --configLoader runner <affected *.test.js> src/constants/translations.test.js src/i18n/catalog.guard.test.js
   ```
   *(Always pass `--configLoader runner` on Windows/sandboxed environments to avoid `EPERM` on `node_modules/.vite-temp`.)*
2. **Zero-Warning Lint:**
   ```powershell
   npm run lint
   ```
   Must exit `0` with **0 errors and 0 warnings**.
3. **Production Build:**
   ```powershell
   npx vite build
   ```
4. **Real-Browser Visual Verification (Headless Edge + Playwright):**
   - Start Vite on a dedicated port (e.g., `npx vite --port 5175 --strictPort`), run Playwright against `http://localhost:5175/pokemonTeamBuilder`, assert **zero `pageerror` / console errors**, and capture screenshots across **Desktop Dark (1440×900)**, **Desktop Light**, and **Mobile Dark (390×844)**.
   - **Visually inspect every captured PNG** (using `read_file` on the image) to catch text truncation, overlap with floating pills (`Jogos do dia`), or broken layout before committing.
   - Always seed `localStorage.setItem('patchNotesVersion', '<current PATCH_NOTES_VERSION>')` in verification init scripts so `PatchNotesModal` does not cover the viewport.
   - **Always stop temporary Vite dev server daemons** when verification finishes.

---

## 5. Auth, Security & Session Hygiene Rules

- **Admin & Special Roles (`scripts/set-admin-claim.mjs`, `scripts/set-dev-friend.mjs`):**
  - Never hardcode admin emails or `VITE_ADMIN_EMAILS` in client code, `firestore.rules`, or `api/*`.
  - Admin privilege is verified strictly via signed **Firebase Auth Custom Claims** (`admin === true && email_verified === true`) in `firestore.rules` and `api/_lib/serverAuth.js` (`verifyCaller`).
  - Real-time cross-device claim refresh rides on server-only `artifacts/{appId}/authMeta/{uid}` (`allow write: if false;` in rules) + `onIdTokenChanged` in `useAuthStore.js`.
  - Public role crests (`specialBadge: 'admin' | 'dev_friend'`) live on `publicProfiles/{uid}`, protected from client forgery by `validPublicProfile()` in `firestore.rules`, and render via `<SpecialRoleBadge />`.
- **Zero-Leak Logout (`src/utils/sessionRegistry.js`, `src/utils/sessionWipe.js`):**
  - Register session-scoped Firestore `onSnapshot` listeners with `registerSessionCleanup(unsub)` so `leaveSession()` tears them down synchronously before `signOut(auth)` and broadcasts session end across tabs via `BroadcastChannel` + `storage` fallback.
  - Never persist `isAdmin` or `specialBadge` in `localStorage`/`sessionStorage`.

---

## 6. Windows, Git & PR Conventions

- **PowerShell:** chain commands with `;` (never `&&`).
- **Git safe directory on Windows:** pass `git -c safe.directory=C:/Users/Administrador/pokemonBuilder/pokemonTeamBuilder ...` when needed.
- **Conventional Commits** (enforced by Husky `commit-msg`): valid types are `feat`, `fix`, `docs`, `style`, `refactor`, `refact`, `perf`, `test`, `build`, `ci`, `chore`, `revert` (keep subject concise, ideally ≤ 72 chars).
- **Branches & PRs:** branch cleanly from `origin/main` unless the user explicitly asks to commit directly to `main`; use `gh pr create --body-file <path>` on Windows PowerShell to avoid quoting/escaping issues.
- **Untracked local files:** never stage personal/local files such as `.env*`, `.vercel`, or untracked `social/` folders.
