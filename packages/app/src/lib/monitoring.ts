import type { Context } from "hono";
import type { Bindings } from "../types";

const WINDOW_SECS = 300;
const ALERT_THRESHOLD = 10;

type AuthFailureContext = {
  boardId: string;
  origin?: string;
  referer?: string;
  hasVerifiedCookie: boolean;
  secure: boolean;
};

export async function recordSuggestionAuthFailure(
  c: Context<{ Bindings: Bindings }>,
  ctx: AuthFailureContext,
): Promise<void> {
  const event = {
    event: "suggestion_auth_required",
    path: c.req.path,
    ...ctx,
    ts: new Date().toISOString(),
  };

  console.warn(JSON.stringify(event));

  const key = "metrics:suggestions_401";
  const current = await c.env.KV.get(key);
  const count = (current ? parseInt(current, 10) : 0) + 1;
  await c.env.KV.put(key, String(count), { expirationTtl: WINDOW_SECS });

  if (count < ALERT_THRESHOLD) return;

  const alertKey = `alert:suggestions_401:${Math.floor(Date.now() / (WINDOW_SECS * 1000))}`;
  const alreadyAlerted = await c.env.KV.get(alertKey);
  if (alreadyAlerted) return;

  await c.env.KV.put(alertKey, "1", { expirationTtl: WINDOW_SECS });

  const webhookUrl = c.env.ALERT_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `Marapulse alert: ${count} widget suggestion 401s in the last ${WINDOW_SECS / 60} minutes`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: [
                `*Widget submission auth failures spiking*`,
                `• Count: ${count} in ${WINDOW_SECS / 60} min (threshold: ${ALERT_THRESHOLD})`,
                `• Board: \`${ctx.boardId}\``,
                `• Origin: ${ctx.origin ?? "none"}`,
                `• Has cookie: ${ctx.hasVerifiedCookie}`,
                `• HTTPS: ${ctx.secure}`,
              ].join("\n"),
            },
          },
        ],
      }),
    });
  } catch (err) {
    console.error("[Monitoring] Failed to send alert webhook:", err);
  }
}
