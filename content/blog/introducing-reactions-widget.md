---
title: Introducing the Marapulse Reactions Widget
slug: introducing-reactions-widget
date: 2026-03-08
description: Add lightweight upvote and downvote buttons to blog posts, docs, changelog entries, or any page — without building a voting system.
author: Marapulse Team
tags: [reactions, widget, embed, voting]
tool: reactions-widget
---

Not every piece of content needs a full feedback board. Sometimes you just want to know: *did people find this useful?*

That is what the **Marapulse Reactions Widget** is for. Inline upvote/downvote buttons you can place next to any content item — a blog post, a docs page, a changelog entry, a help article.

## Two lines of setup

**1. Add the script** (once per page):

```html
<script
  src="https://marapulse.com/reactions.js"
  data-board="YOUR_BOARD_ID"
  data-color="#eb7d24"
></script>
```

**2. Mark your content items:**

```html
<h1>Dark mode is here</h1>
<div data-marapulse-reaction="changelog-2026-03-dark-mode"></div>
```

Each `data-marapulse-reaction` value is a unique ID you choose. Marapulse tracks votes per ID and shows live counts.

## How it works

- **Anonymous voting** — no login required; votes are tracked by browser fingerprint
- **Toggle behavior** — click again to remove your vote
- **Up and down** — users can upvote or downvote
- **Admin dashboard** — see all reaction items ranked by score at `/:boardSlug/reactions`

The widget renders inside a shadow DOM, so it will not clash with your site's CSS.

## Choosing good external IDs

Use stable, readable IDs that will not change when you edit the page:

```html
<!-- Blog post -->
<div data-marapulse-reaction="blog-introducing-reactions-widget"></div>

<!-- Docs page -->
<div data-marapulse-reaction="docs-api-authentication"></div>

<!-- Changelog entry -->
<div data-marapulse-reaction="changelog-v0-3-0"></div>
```

Avoid auto-generated IDs or URLs with query strings — if the ID changes, you lose your vote history.

## Optional label

Add a `data-label` attribute to show context next to the buttons:

```html
<div
  data-marapulse-reaction="docs-getting-started"
  data-label="Was this helpful?"
></div>
```

## API access

For custom integrations, the reactions API is fully documented:

- `POST /api/w/:boardId/reactions/vote` — cast or toggle a vote
- `GET /api/w/:boardId/reactions/item/:externalId` — get counts for one item
- `GET /api/w/:boardId/reactions/items` — list all items with scores

See [API docs](/docs/API.md) for request/response formats.

## Feedback widget vs. reactions widget

| | Feedback Widget | Reactions Widget |
|---|----------------|------------------|
| **Use case** | Product feedback, feature requests | Content voting, helpfulness |
| **UI** | Full panel (list, submit, comment) | Inline up/down buttons |
| **Auth** | Email verify to submit | Anonymous |
| **Best for** | SaaS apps, product sites | Blogs, docs, changelogs |

Many teams use both: the feedback widget on their app, and reactions on their blog and docs.

## Get started

1. [Create a free board](/setup)
2. Copy the reactions embed snippet from **Settings → Reactions embed**
3. Add `data-marapulse-reaction` elements where you want votes

Your first reaction counts will appear in the admin reactions table within seconds.
