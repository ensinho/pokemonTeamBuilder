---
name: log-wound
description: Record a fixed bug, root cause, or dispattern into docs/wounds.md so future agents don't re-introduce it. Use right after fixing a bug, correcting a pattern, or when the user points out a mistake. Also use to add an item to the improvement backlog.
---

# Log a wound

Append a structured entry to `docs/wounds.md` capturing something that went wrong (and how it was fixed) or a dispattern to avoid. This is the project's institutional memory — the whole point is that the *next* agent reads it before repeating the mistake.

## When to use
- Immediately after fixing a bug or error.
- When the user corrects you or rejects a change (also follow `docs/agent_directives.md`).
- When you spot a dispattern/smell worth recording even if you're not fixing it now.
- To add a proposed improvement to the backlog.

## Steps

1. **Read `docs/wounds.md`** to match the existing format and check the wound isn't already logged (if it is, update that entry instead of duplicating).

2. **Determine today's date.** Run `date +%F` — never guess the date.

3. **Pick the section:**
   - Fixed and verified → **Resolved wounds** (newest at the top of that section).
   - Real smell, not fixed yet → **Dispatterns to avoid**.
   - Idea for later → **Improvement backlog**.

4. **Write the entry** using the template below. Be concrete: name real files and the actual root cause, not a vague summary. A future agent should be able to act on it without re-investigating.

5. **If the wound changed an architectural fact** (router, schema, dependency, theme list, build command), also update the matching doc (`CLAUDE.md`, `docs/index.md`, or a `docs/modules/*.md`) in the same change — stale docs are themselves a logged wound.

6. **Keep it tight.** One wound per entry. Edit `docs/wounds.md` directly with the Edit/Write tools; do not create new files.

## Resolved-wound template

```markdown
### <YYYY-MM-DD> — <one-line title> `<severity>`
- **Symptom:** what was observed (error message, broken behavior, bad UX).
- **Root cause:** the actual underlying reason.
- **Fix:** what was changed and why it's correct.
- **Correct pattern:** the rule a future agent should follow to avoid this.
- **Files:** `path/one.jsx`, `path/two.js`
```

Severity tags: `bug` · `dispattern` · `perf` · `security` · `docs`.

## Dispattern / backlog template

```markdown
### `<severity>` — <short title>
- <description of the smell or proposed improvement, with file references>
- **Correct pattern / next step:** <what to do instead, or what implementing it involves>
```

Confirm to the user what you logged and where (which section), in one line.
