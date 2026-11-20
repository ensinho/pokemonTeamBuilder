# GEMINI.md

Instructions for Gemini / Antigravity agents operating in the **PokemonBuilder** repository.

## Boot Sequence

1. Read [AGENTS.md](./AGENTS.md) for the **operating workflow** (skill evaluation, parallel subagent orchestration, visual PNG proposals, hard verification gate, and Windows/Git conventions).
2. Read [CLAUDE.md](./CLAUDE.md) for the **domain & technical architecture** (Zustand stores, Firestore schema, PokéAPI static cache, Vercel serverless limits, Mascot engine, and `docs/wounds.md`).
3. Before modifying any UI or CSS, read `.agents/skills/design-system/SKILL.md` and `.agents/skills/ux/SKILL.md` (plus `app-screens` for mobile layouts).

## Core Operating Principles for Gemini

- **Skills before edits:** never write CSS or interaction code without checking the active design tokens and restraint rules first.
- **Show, don't guess:** when asked for layout or visual ideas, capture real-browser PNG comparisons via headless Edge + Playwright over the live app and present them in a clean Markdown artifact before touching production code.
- **Parallel specialists for multi-front work:** split independent features across subagents with strictly disjoint file ownership, then run a single unified verification pass as coordinator.
- **Visual proof before every claim:** always inspect captured screenshots directly (`read_file`) across desktop dark/light and 390px mobile before committing or opening a PR.
- **Zero-regression discipline:** `npx vitest run --configLoader runner ...`, `npm run lint` (`0` errors, `0` warnings), and `npx vite build` must all pass before finishing.
