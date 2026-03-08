import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";

// Helper for timestamps
const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
};

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: text("plan", { enum: ["free", "paid"] }).notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  ...timestamps,
});

export const members = sqliteTable(
  "members",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    name: text("name"),
    role: text("role", { enum: ["owner", "admin", "member"] }).notNull().default("member"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("members_workspace_email_idx").on(table.workspaceId, table.email),
  ]
);

export const boards = sqliteTable(
  "boards",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    isPublic: integer("is_public", { mode: "boolean" }).notNull().default(true),
    locale: text("locale", { enum: ["en", "pt-br"] }).notNull().default("en"),
    color: text("color").notNull().default("#22c55e"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("boards_workspace_slug_idx").on(table.workspaceId, table.slug),
  ]
);

export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    boardId: text("board_id").notNull().references(() => boards.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    emoji: text("emoji"),
    position: integer("position").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("categories_board_slug_idx").on(table.boardId, table.slug),
  ]
);

export const authors = sqliteTable(
  "authors",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    externalId: text("external_id"),
    email: text("email"),
    name: text("name"),
    avatarUrl: text("avatar_url"),
    fingerprintHash: text("fingerprint_hash"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("authors_workspace_external_idx").on(table.workspaceId, table.externalId),
    index("authors_workspace_email_idx").on(table.workspaceId, table.email),
  ]
);

export const suggestions = sqliteTable(
  "suggestions",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    boardId: text("board_id").notNull().references(() => boards.id, { onDelete: "cascade" }),
    authorId: text("author_id").references(() => authors.id, { onDelete: "set null" }),
    categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status", {
      enum: ["new", "under_review", "planned", "in_progress", "done", "dismissed"],
    }).notNull().default("new"),
    voteCount: integer("vote_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    imageUrl: text("image_url"),
    pinnedAt: integer("pinned_at", { mode: "timestamp" }),
    ...timestamps,
  },
  (table) => [
    index("suggestions_board_status_idx").on(table.boardId, table.status),
    index("suggestions_board_votes_idx").on(table.boardId, table.voteCount),
  ]
);

export const votes = sqliteTable(
  "votes",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    suggestionId: text("suggestion_id").notNull().references(() => suggestions.id, { onDelete: "cascade" }),
    authorId: text("author_id").notNull(),
    value: integer("value").notNull().default(1),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("votes_suggestion_author_idx").on(table.suggestionId, table.authorId),
  ]
);

export const comments = sqliteTable(
  "comments",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    suggestionId: text("suggestion_id").notNull().references(() => suggestions.id, { onDelete: "cascade" }),
    authorId: text("author_id").references(() => authors.id),
    memberId: text("member_id").references(() => members.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    isOfficial: integer("is_official", { mode: "boolean" }).notNull().default(false),
    ...timestamps,
  },
  (table) => [
    index("comments_suggestion_created_idx").on(table.suggestionId, table.createdAt),
  ]
);

export const activities = sqliteTable(
  "activities",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    suggestionId: text("suggestion_id").notNull().references(() => suggestions.id, { onDelete: "cascade" }),
    memberId: text("member_id").references(() => members.id, { onDelete: "set null" }),
    type: text("type", {
      enum: ["status_change", "category_change", "merge", "pin", "unpin"],
    }).notNull(),
    fromValue: text("from_value"),
    toValue: text("to_value"),
    ...timestamps,
  },
  (table) => [
    index("activities_suggestion_created_idx").on(table.suggestionId, table.createdAt),
  ]
);
