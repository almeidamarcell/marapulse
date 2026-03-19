# Marapulse API Reference

Marapulse exposes three public APIs: the **Widget API** (feedback board), the **Reactions API** (inline voting), and the **Auth API** (email verification). All endpoints return JSON.

For the full OpenAPI 3.1 spec, see [`docs/api/openapi.yaml`](api/openapi.yaml).

---

## Widget API

Base path: `/api/w/{boardId}`

These endpoints power the embeddable feedback widget. They support cross-origin requests for iframe embedding.

### Get Board Configuration

```
GET /api/w/{boardId}
```

Returns board metadata for widget initialization.

**Response:**
```json
{
  "name": "Product Feedback",
  "slug": "feedback",
  "description": "Tell us what you think",
  "color": "#2563EB",
  "locale": "en",
  "categories": [
    { "id": "uuid", "name": "Bug", "emoji": "🐛" },
    { "id": "uuid", "name": "Feature", "emoji": "✨" }
  ]
}
```

### List Suggestions

```
GET /api/w/{boardId}/suggestions?status=planned&q=search&page=1
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status: `new`, `under_review`, `planned`, `in_progress`, `done`, `dismissed` |
| `q` | string | Search title and description |
| `page` | integer | Page number (default: 1, 20 items per page) |

**Response:**
```json
{
  "suggestions": [
    {
      "id": "uuid",
      "title": "Dark mode support",
      "description": "Would love a dark theme option",
      "status": "planned",
      "voteCount": 42,
      "commentCount": 5,
      "categoryName": "Feature",
      "categoryEmoji": "✨",
      "voted": false,
      "imageUrl": null,
      "createdAt": "2026-03-01T12:00:00Z"
    }
  ],
  "page": 1,
  "totalPages": 3,
  "total": 52
}
```

### Get Suggestion Detail

```
GET /api/w/{boardId}/suggestions/{id}
```

Returns a suggestion with its comments.

**Response:**
```json
{
  "suggestion": { "..." },
  "comments": [
    {
      "id": "uuid",
      "body": "We're working on this!",
      "authorName": null,
      "authorEmail": null,
      "memberName": "Admin",
      "isOfficial": true,
      "createdAt": "2026-03-02T14:30:00Z"
    }
  ]
}
```

### Toggle Vote

```
POST /api/w/{boardId}/suggestions/{id}/vote
```

No request body needed. Toggles the vote on/off. No authentication required — uses a fingerprint cookie.

**Response:**
```json
{
  "voted": true,
  "voteCount": 43
}
```

### Create Suggestion

```
POST /api/w/{boardId}/suggestions
Content-Type: application/json
```

Requires email verification or client identification (`Marapulse.identify()`).

**Request:**
```json
{
  "title": "Dark mode support",
  "description": "Would love a dark theme option",
  "categoryId": "uuid"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `title` | string | yes | 1-200 characters |
| `description` | string | no | max 5000 characters |
| `categoryId` | string | no | Valid category UUID |

**Response:** `201 Created`
```json
{
  "suggestion": { "..." }
}
```

### Add Comment

```
POST /api/w/{boardId}/suggestions/{id}/comment
Content-Type: application/json
```

Requires email verification or client identification.

**Request:**
```json
{
  "body": "Great idea, would love this too!"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `body` | string | yes | 1-2000 characters |

**Response:** `201 Created`

### Identify User

```
POST /api/w/{boardId}/identify
Content-Type: application/json
```

Pre-identifies a user from your application, skipping email verification. Use this when your app knows who the user is.

**On the frontend, use `Marapulse.identify()` instead of calling this directly.**

**Request:**
```json
{
  "externalId": "user_123",
  "email": "user@example.com",
  "name": "Jane Doe"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `externalId` | string | yes | Your app's user ID |
| `email` | string | no | User's email |
| `name` | string | no | Display name |

**Response:**
```json
{
  "ok": true,
  "authorId": "uuid"
}
```

---

## Reactions API

Base path: `/api/w/{boardId}/reactions`

The reactions API enables upvote/downvote voting on any content. Use it to add voting to blog posts, documentation pages, changelog entries, etc.

### Vote on Content

```
POST /api/w/{boardId}/reactions/vote
Content-Type: application/json
```

Cast a vote or toggle it off. Rate limited to 30 votes per minute.

**Request:**
```json
{
  "externalId": "blog-post-dark-mode",
  "label": "Introducing Dark Mode",
  "url": "https://blog.example.com/dark-mode",
  "value": 1
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `externalId` | string | yes | Your content identifier (max 500 chars) |
| `label` | string | no | Human-readable label (max 200 chars) |
| `url` | string | no | Content URL (max 2000 chars) |
| `value` | integer | yes | `1` for upvote, `-1` for downvote |

**Response:**
```json
{
  "voted": 1,
  "upvoteCount": 15,
  "downvoteCount": 2
}
```

### Batch Get Counts

```
GET /api/w/{boardId}/reactions/items?ids=post-1,post-2,post-3
```

Fetch vote counts for up to 100 items at once.

**Response:**
```json
{
  "post-1": { "upvoteCount": 15, "downvoteCount": 2, "userVote": 1 },
  "post-2": { "upvoteCount": 8, "downvoteCount": 0, "userVote": null },
  "post-3": { "upvoteCount": 3, "downvoteCount": 1, "userVote": -1 }
}
```

### Get Single Item Counts

```
GET /api/w/{boardId}/reactions/item/{externalId}
```

**Response:**
```json
{
  "upvoteCount": 15,
  "downvoteCount": 2,
  "userVote": 1
}
```

---

## Auth API

End-user email verification for submitting suggestions and comments.

### Send Verification Code

```
POST /api/auth/send-code
Content-Type: application/json
```

Sends a 6-digit code to the user's email. Rate limited to 5 requests per minute per IP.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "ok": true
}
```

### Verify Code

```
POST /api/auth/verify-code
Content-Type: application/json
```

Verifies the code and sets a `verified_author` cookie. Rate limited to 5 attempts per minute per IP.

**Request:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response:**
```json
{
  "ok": true,
  "authorId": "uuid",
  "name": null,
  "email": "user@example.com"
}
```

**Errors:**
- `400` — Invalid or expired code
- `429` — Rate limited

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /api/auth/send-code` | 5 requests | 60 seconds per IP |
| `POST /api/auth/verify-code` | 5 requests | 60 seconds per IP |
| `POST /api/w/{boardId}/reactions/vote` | 30 requests | 60 seconds per fingerprint |

---

## Widget Integration

### Feedback Widget

```html
<script src="https://your-marapulse.com/widget.js" data-board="BOARD_ID"></script>
```

| Attribute | Required | Description |
|-----------|----------|-------------|
| `data-board` | yes | Board UUID |
| `data-color` | no | Accent color (hex) |
| `data-position` | no | `bottom-right` (default) or `bottom-left` |
| `data-api` | no | API base URL (for self-hosted instances) |

#### Client-Side Identification

```javascript
window.Marapulse.identify({
  externalId: "user_123",
  email: "user@example.com",
  name: "Jane Doe"
});
```

### Reactions Widget

```html
<script src="https://your-marapulse.com/reactions.js" data-board="BOARD_ID"></script>

<div data-marapulse-reaction="article-slug-1">Was this helpful?</div>
<div data-marapulse-reaction="article-slug-2">Was this helpful?</div>
```

| Attribute | Required | Description |
|-----------|----------|-------------|
| `data-board` | yes | Board UUID (on `<script>` tag) |
| `data-color` | no | Accent color (on `<script>` tag) |
| `data-api` | no | API base URL (on `<script>` tag) |
| `data-marapulse-reaction` | yes | External content ID (on each element) |
| `data-label` | no | Human-readable label (on each element) |
