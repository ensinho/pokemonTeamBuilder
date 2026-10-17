# Forum (`/feed`)

The community forum, rebuilt on Reddit's layout on 2026-10-17 (Enzo: make it
feel like what people already use — sharing, trending, easy to move around).
Read this before touching `FeedView`, `src/components/forum/` or
`src/styles/forum-view.css`.

## Shape

**Desktop (≥1024px) — a three-pane workspace, like an editor**

| Pane | Component | What it holds |
|---|---|---|
| Explorer (left, transparent, 16rem) | `ForumExplorer` | Sort (Hot / New / Top), categories with counts, pinned rooms, and — while a post is open — the other discussions |
| Centre (the rest, no card) | the feed, or `ThreadDetail` | The feed's rows, or the open post with its comments and the docked composer |
| Rail (right, cards, ≥1440px only) | `ForumSidebar` | About the community (figures, rules), Trending now, Share your team |

Nothing is boxed but the rail's cards: the explorer ends in one hairline and
the centre sits on the page (the canvas dot pattern is switched off on this
route). Between 1024 and 1439 the rail is hidden and the feed header shows the
community figures instead.

**Phone (<1024px)** — the centre alone; the feed and a post are two screens.
The page is the panel; rows run edge to edge under the shell gutter.

## Feed

- `ForumHeader`: name (+ figures where the rail is hidden), search, Create.
  Below 1024 a second row holds Hot/New/Top and the category chips (on a
  desktop the explorer has them). On a phone search is one tap away and takes
  over the first line.
- `ThreadCard` is a **row**, not a card: who · when · flairs, the title (a real
  `<Link>`), a preview of the post, the attached team as the thumbnail, then the
  ♥ / 💬 / Share pills. The rest of the row opens the post too.
- Pinned rows are the megathreads Professor Oak seeded (`createdBy: 'system'`):
  they head the Hot feed only.
- Ranking lives in **`src/utils/forumRanking.js`** (tested): Hot is
  `(likes·2 + replies + 1) / (hoursSinceLastActivity + 2)^1.5`; Top is
  engagement; New is creation. Trending = community topics with activity in the
  last 7 days and at least one like or reply, best Hot first.

## A post

- Two shapes in one component: a **post** (any trainer's topic) opens at the
  post, Reddit's page — title, text, attachments, vote/comments/share pills,
  then the comments as a tree with Top / Newest / Oldest. A **chat room** (a
  pinned megathread) is one chronological run that opens at the newest message
  and follows it (`useChatAutoScroll`, `enabled` only there).
- The bar is one line: back, then the breadcrumb, which becomes the topic's
  title once the post's own heading scrolls away (IntersectionObserver in
  `ThreadDetail`), then Share / Delete.
- The comment tree is **`src/utils/forumTree.js`** (tested): replies nest under
  the comment they answer up to depth 4, then flatten with their quote; a reply
  whose parent is outside the loaded window becomes a root with its quote. A
  chat room uses `nest: false`. Every branch starts open; the thread line and
  its ⊖ fold it.
- The composer is docked at the bottom (the Reddit app's pattern), one row.

## Data

- The post's vote is on the **topic doc** (`likedBy`, `likeCount`), so the feed
  can rank and show it without opening the thread — `toggleTopicLike` in
  `useForumStore`. Posts from before 2026-10-17 kept their likes on the opening
  message; the post page shows the union and un-liking clears both.
  **Needs the `touchesOnlyOwnTopicLike` rule in `firestore.rules` deployed**,
  or a non-author's like is rejected (the snapshot rolls back and a toast says so).
- New topics also carry `bodyPreview` (the opening text, 280 chars) and the
  serialized `sharedTeam`, for the feed row. Older topics fall back to
  `lastMessageText`, shown as "Latest reply".
- Everything a user would share, refresh or go Back to is in the URL:
  `?topic=`, `?c=` (a comment permalink), `?sort=`, `?cat=`, `?q=` (defaults are
  left out). The feed's scroll position is restored when a post closes.

## Sharing

- `src/utils/forumShare.js`: the system share sheet on touch devices, the
  clipboard elsewhere; a comment's Share copies its `?c=` permalink.
- `api/render-meta.js` + **`api/_lib/forumMeta.js`** (tested): a pasted
  `/feed?topic=…` link unfurls with the topic's title and opening text, read
  from Firestore's REST API (public read) with a 1.2 s timeout; any miss keeps
  the generic card. Every injected value is HTML-escaped and inserted through a
  replacement *function* — a replacement string would expand `$&` in a title.

## Traps

- The explorer's discussion links use `replace`: hopping between threads must
  not stack history, or the bar's back button walks back through every thread
  instead of returning to the feed.
- `FIRESTORE INTERNAL ASSERTION FAILED (ca9 / b815)` in the **dev server** after
  many hot reloads of `useForumStore` is a duplicated SDK instance, not a bug:
  the production build with the same clicks logs nothing.
- Test scripts must block Firestore writes to `public/` paths — the dev server
  talks to the production project.
