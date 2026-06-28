---
title: Introducing the Marapulse Feedback Widget
slug: introducing-feedback-widget
date: 2026-03-08
description: Add a full feedback board to any website with a single script tag. Collect suggestions, votes, and comments without sending users elsewhere.
author: Marapulse Team
tags: [widget, embed, feedback]
tool: feedback-widget
---

Your users have ideas. The problem is getting those ideas from your app into a place where your team can prioritize them.

Most teams either ignore feedback until it becomes a support ticket, or they send users to an external board and hope they come back. Neither works well.

The **Marapulse Feedback Widget** fixes that. It is a floating button your users click to open a full feedback panel — right inside your product.

## One script tag

Add this to any page on your site:

```html
<script
  src="https://marapulse.com/widget.js"
  data-board="YOUR_BOARD_ID"
  data-color="#eb7d24"
></script>
```

That is it. The widget:

- Matches your brand color via `data-color`
- Opens a panel where users browse existing suggestions
- Lets them vote, comment, and submit new ideas
- Works on desktop and mobile

Find your board ID in **Settings → Widget embed** after creating a board.

## What your users see

When someone clicks the floating button, they get a self-contained feedback experience:

1. **Browse** — search and filter suggestions by status
2. **Vote** — upvote ideas they care about (no login required)
3. **Submit** — verify their email once, then post new suggestions
4. **Comment** — join the discussion on any idea

Everything happens in an iframe served from Marapulse, so you do not need to build UI or auth yourself.

## Optional attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `data-board` | *(required)* | Your board UUID |
| `data-color` | `#22c55e` | Accent color for the trigger button and voted state |
| `data-position` | `bottom-right` | `bottom-right` or `bottom-left` |
| `data-api` | script origin | Override API host for self-hosted installs |

## Skip email verification for logged-in users

If your app already knows who the user is, call `Marapulse.identify()` to skip the email step:

```javascript
Marapulse.identify({
  externalId: "user_123",
  email: "jane@example.com",
  name: "Jane Doe"
});
```

This is especially useful for SaaS products where users are already authenticated.

## Try it live

Visit [/demo](/demo) to see the widget on a sample page, or look at the bottom-right corner of [marapulse.com](https://marapulse.com) — we dogfood our own widget.

## Get started

1. [Create a free board](/setup)
2. Copy the embed snippet from Settings
3. Paste it before `</body>` on your site

You will start collecting real feedback within minutes.
