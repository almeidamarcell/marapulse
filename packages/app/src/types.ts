import type { DrizzleD1Database } from "drizzle-orm/d1";
import type * as schema from "@marapulse/db";

export type Bindings = {
  DB: D1Database;
  KV: KVNamespace;
  R2?: R2Bucket;
  RESEND_API_KEY: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_PRICE_ID: string;
  STRIPE_PRICE_ID_ANNUAL: string;
  STRIPE_WEBHOOK_SECRET: string;
  APP_URL: string;
};

export type SessionData = {
  memberId: string;
  workspaceId: string;
  email: string;
  name: string | null;
  role: "owner" | "admin" | "member";
};

export type Variables = {
  db: DrizzleD1Database<typeof schema>;
  session: SessionData | null;
  authorId: string | null;
};
