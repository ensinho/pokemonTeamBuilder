# Forum (`/feed`)

The community forum, rebuilt on Reddit's layout on 2026-10-17 (Enzo: make it
feel like what people already use — sharing, trending, easy to move around).
Read this before touching `FeedView`, `src/components/forum/` or
`src/styles/forum-view.css`.

## Shape

**Desktop (≥1024px) — a three-pane workspace, like an editor**

| Pane | Component | What it holds |
|---|---|---|
| Explorer (left, transparent, 16rem) | `ForumExplorer` | The forum's map, the same on the feed and in a post: Feed (Recentes / Em alta / Top) · Fixados · Atividade recente · Seus tópicos · Categorias. Sections fold (`<details>`) |
| Centre (the rest, no card) | the feed, or `ThreadDetail` | The feed's rows, or the open post with its comments and the docked composer |
| Rail (right, cards, ≥1440px only) | `ForumSidebar` | About the community (figures, rules), Trending now, Share your team |

Nothing is boxed but the rail's cards: the explorer ends in one hairline and
the centre sits on the page (the canvas dot pattern is switched off on this
route). Between 1024 and 1439 the rail is hidden and the feed header shows the
community figures instead.

**Phone (<1024px)** — the centre alone; the feed and a post are two screens.
The page is the panel; rows run edge to edge under the shell gutter. The
explorer is the drawer behind ☰ (`ForumDrawer`), from the feed's header and
from a post's bar.

## Feed

- `ForumHeader`: name (+ figures where the rail is hidden), search, Create.
  Below 1024 it is ☰ · the search field · Criar, then the tabs Recentes /
  Em alta / Top (see "The timeline pass" below).
- `ThreadCard` is a **row**, not a card: who · when · flairs, the title (a real
  `<Link>`), a preview of the post, the attached team as the thumbnail, then the
  ♥ / 💬 / Share pills. The rest of the row opens the post too.
- **On a phone (≤ 1023px), one coloured thing per row** (2026-10-20, [audit](../audits/2026-10-20-battles-forum.md)). The forum's title is for screen readers only, because the app bar names the page; its figures (topics · active today) lead the line beside search and Create. Pinned, trending and official are a tinted icon dot (`.forum-flair--status`, label hidden but read). The pills are an icon and a count with no fill; the liked heart is primary, Share is an icon at the row's end, and all have `touch-target`.
- **Calm pass (2026-11-09, Enzo: "muito texto e informações").** The rule is *one loud thing per row — the title*:
  - **The rooms are doors, not rows** (`forum/ForumRooms.jsx`): the Professor's pinned topics (today's Diário, the week's Torneio, General Chat, Team Showcase) sit in one row above the feed — 2 × 2 on a desktop, a sideways snap row on a phone — with the part of the title after " · " (date, theme) or the last line said there, the message count and a live dot for a room that moved in the last hour. They leave the feed's rows; while searching they come back as ordinary results. The explorer lists them only while a post is open.
  - **Actions are icons and counts at every width** (not just phones): no "Curtir"/"Compartilhar" words, Share at the row's end, a 0-like heart shows no number. In a post the same; React is a `SmilePlus` icon. A comment keeps the word on **Responder**, because replying is what a comment is for.
  - **Categories** (`FORUM_CATEGORY_IDS`, `getCategoryMeta`): diary · general · teams · strategy · questions · adventures · **feedback** (2026-11-09, asked for by a trainer in the forum: suggestions and bug reports had nowhere but General) · announcements (admins). A new one goes in four places: `forumRanking.js`, `forumTime.js`, `forum/forumNav.js` (the header, the explorer and the drawer read it), `TopicCreateModal` — plus a dot and a flair tone in `forum-view.css` and `forum.cat*` in both translation files. Like every category it is hidden from the chips until it has a post; the create dialog always offers it.
  - **A category is a dot and a muted word** (`.post-row__cat`, tone from `.forum-flair--<id>`), not a chip; the "Em alta" flair is gone (the Hot sort already says it). The forum's own title is screen-reader-only at every width.
  - **Nothing repeats**: empty categories are hidden from chips and explorer until they have a post; the rail's Trending hides on the unfiltered Hot feed (it *is* the feed); the rail's share card shows only with a team to share; Team of the week lost its "Abrir post" button (the title links) and, on phones, its source line and hint.
  - **A post on a phone has no tab dock** (`isForumThreadOpen` in `AppLayout`, `.app-shell__content.is-dockless`): the composer is the bottom bar, as in a chat app; Back returns to the feed and the dock.
- Pinned rows are the megathreads Professor Oak seeded (`createdBy: 'system'`):
  they head the Hot feed only.
- Ranking lives in **`src/utils/forumRanking.js`** (tested): Hot is
  `(likes·2 + replies + 1) / (hoursSinceLastActivity + 2)^1.5`; Top is
  engagement; New is creation. Trending = community topics with activity in the
  last 7 days and at least one like or reply, best Hot first.

- **Team of the week** (`forum/TeamOfTheWeek.jsx`, `src/utils/teamOfTheWeek.js`,
  tested, 2026-10-23) heads the unsearched feed under All or Times, above the
  list or its empty state: the shared team with the most engagement among the
  posts of the last 7 days that have a team and at least one like; with none,
  a featured tournament team that changes on Monday (UTC). It ends with the
  line that says how to take the spot ("Postar meu time" opens Create with the
  rail's team). Opening it tracks `team_of_week_open`.

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

- The explorer's topic links use `replace` while a post is open: hopping between threads must
  not stack history, or the bar's back button walks back through every thread
  instead of returning to the feed.
- `FIRESTORE INTERNAL ASSERTION FAILED (ca9 / b815)` in the **dev server** after
  many hot reloads of `useForumStore` is a duplicated SDK instance, not a bug:
  the production build with the same clicks logs nothing.
- Test scripts must block Firestore writes to `public/` paths — the dev server
  talks to the production project.

### Feedback room (2026-11-10, Enzo)
- The rooms row is Diário do dia · **Feedback** · the two chats. The week's Torneio left it and is a plain row in the feed (`FeedView` `isRoomTopic`).
- Feedback is a *virtual* room: no topic — a door to `?cat=feedback` (`ForumRooms` takes `virtual`, `icon`, `href`, `count`, `meta`). No rules change: a client may only create the Diário and Torneio system topics.
- Inside it, and nowhere else in the feed, the one support card (`ForumSupportCard`, `SUPPORT_URL`). "Criar post" there starts in the category.
- Less on the way to the first post: the rail's "Compartilhe seu time" card is gone (the Team of the week and Criar post do it); on phones the figures line hides and the Team of the week keeps kicker, title and six (likes, import and the invitation are in the post).

### The timeline pass (2026-11-10, Enzo)
Brief: on a phone "não fica claro o que fazer ou onde achar, sem organização
cronológica fácil"; reference, the Reddit app's home and side menu. Before /
after at 390 and 1440 were measured with the same seeded store.

- **The feed opens newest first.** `DEFAULT_FEED_SORT` is `new` ("Recentes");
  Em alta and Top are tabs. On Recentes, unsearched, the rows are cut into
  **Hoje · Ontem · Últimos 7 dias · Últimos 30 dias · Mais antigos**
  (`src/utils/forumTimeline.js` `groupByDay`, tested; the reader's own
  calendar day, not "24 h ago"). A search or a ranking by votes is one list.
- **Recentes is the timeline and nothing else**: the Team of the week shows
  on Em alta / Top only.
- **What stays put says so**: the rooms have the heading "Fixados" and, on a
  phone, are a 2 × 2 grid — all four at once (the sideways row showed one and
  a half). A door there is its name, count, time and live dot.
- **One map** (`ForumExplorer`, lists in `forum/forumNav.js`): a desktop's
  left column and a phone's drawer are the same component (`variant`). Feed
  and Fixados first, then **Atividade recente** — the other clock: the same
  topics by their last reply (`latestActivity`), so a thread that woke up is
  a tap away without re-sorting the feed — **Seus tópicos** (`topicsBy`) and
  the categories.
- **Phone header**: ☰ · search field · Criar, then word tabs (`.tabs`). The
  category chips row is gone; a chosen category is one chip under the tabs
  ("Mostrando · Times ×") that clears it. The forum's search is a field, not
  a second magnifier under the app bar's.
- **`ForumDrawer`**: mounted while open or leaving (its own 250 ms exit, as
  the dialog hook's ghost only knows sheets); `useModalA11y` owns Escape and
  focus; picking anything closes it; it closes itself at ≥ 1024px.
- Trap: the explorer's sections are `<details>`, whose content is laid out
  as blocks — a row states its own `width: 100%` and step, the section's
  `gap` does not reach it.
- Not done: swipe-to-close on the drawer; remembering which sections a
  trainer folded.
