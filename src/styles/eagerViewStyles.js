/**
 * Every view's stylesheet, loaded with the shell and in this exact order —
 * ahead of app-shell.css and index.css — while the views' JavaScript stays in
 * lazy route chunks.
 *
 * Until 2026-09-24 AppLayout imported HomeView through the views barrel, which
 * pulled every view module into the entry bundle: 738 KB of JS (227 KB gzip)
 * before the first paint, and five "lazy" views that never actually split.
 * Importing HomeView directly fixes that (534 KB / 165 KB gzip) — but the
 * barrel also decided where each view's CSS landed: *before* index.css. The
 * cascade was tuned against that order. A view rule and a Tailwind utility or
 * primitive of equal specificity resolve by source order, and many rules rely
 * on the utility/primitive winning; several views also use classes from a
 * stylesheet only another view imports. A computed-style diff of every route
 * showed what lazy CSS would change (the phone Pokédex search losing its icon
 * padding, Gyms and Speed Tiers losing their panels when opened directly).
 *
 * So the CSS keeps its place: this list is the barrel's order, read from the
 * dev server's <style> sequence, and must stay in it. Moving a stylesheet into
 * its route chunk is a per-view migration (docs/wounds.md backlog) — verify it
 * with the computed-style diff in the /verify-ui skill, never by eye.
 */
import './team-builder-view.css';
import './all-teams-view.css';
import './team-detail-view.css';
import './pokemon-card.css';
import './generation-quiz-view.css';
import './category-guesser-view.css';
import './home-view.css';
import './forum-view.css';
import './home-dashboard.css';
import './game-cover.css';
import './bottom-sheet.css';
import './profile-view.css';
import './pokepuzzle-view.css';
import './reference-views.css';
import './entity-detail-view.css';
import './pokemon-detail-view.css';
import './locations-view.css';
import './pokemon-detail-mobile.css';
import './tools-views.css';
import './secret-room-guesser.css';
