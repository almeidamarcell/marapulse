import type { FC } from "hono/jsx";
import { Layout } from "../views/layout";

type ContentItem = {
  id: string;
  externalId: string;
  label: string | null;
  url: string | null;
  upvoteCount: number;
  downvoteCount: number;
  createdAt: Date;
};

type ReactionsPageProps = {
  board: {
    name: string;
    slug: string;
    color: string;
  };
  items: ContentItem[];
};

export const ReactionsPage: FC<ReactionsPageProps> = ({ board, items }) => {
  return (
    <Layout title={`Reactions - ${board.name}`}>
      <div class="admin-bar">
        <a href={`/${board.slug}`} class="admin-bar-label" style="text-decoration:none;color:inherit">✦ Admin</a>
        <div class="admin-bar-links">
          <a href={`/${board.slug}`}>Board</a>
          <a href="/settings">Settings</a>
          <a href="/settings#widget">Widget</a>
          <a href={`/${board.slug}/reactions`} style={`font-weight:700;color:${board.color}`}>Reactions</a>
          <a href="/logout">Sign out</a>
        </div>
      </div>

      <div style="max-width:800px;margin:0 auto;padding:24px">
        <h1 style="font-size:20px;font-weight:800;margin-bottom:4px">Reactions</h1>
        <p style="font-size:13px;color:#666;margin-bottom:24px">Upvote/downvote data from your embedded reactions widget.</p>

        {items.length === 0 ? (
          <div style="text-align:center;padding:48px 24px;border:1.5px dashed #e8e8e8;border-radius:12px;color:#888">
            <p style="font-size:15px;font-weight:600;margin-bottom:8px">No reactions yet</p>
            <p style="font-size:13px">Embed the reactions widget on your site to start collecting votes.</p>
            <a href="/settings#reactions" style={`display:inline-block;margin-top:16px;font-size:13px;color:${board.color};font-weight:600`}>Get embed code →</a>
          </div>
        ) : (
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
              <tr style="border-bottom:2px solid #e8e8e8;text-align:left">
                <th style="padding:8px 12px;font-weight:700">External ID</th>
                <th style="padding:8px 12px;font-weight:700">Label</th>
                <th style="padding:8px 12px;font-weight:700;text-align:center">▲</th>
                <th style="padding:8px 12px;font-weight:700;text-align:center">▼</th>
                <th style="padding:8px 12px;font-weight:700;text-align:center">Net</th>
                <th style="padding:8px 12px;font-weight:700">First seen</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr style="border-bottom:1px solid #f0f0f0">
                  <td style="padding:8px 12px;font-family:monospace;font-size:12px">
                    {item.url ? <a href={item.url} target="_blank" rel="noopener" style={`color:${board.color}`}>{item.externalId}</a> : item.externalId}
                  </td>
                  <td style="padding:8px 12px;color:#666">{item.label || "—"}</td>
                  <td style="padding:8px 12px;text-align:center;color:#16a34a;font-weight:600">{item.upvoteCount}</td>
                  <td style="padding:8px 12px;text-align:center;color:#dc2626;font-weight:600">{item.downvoteCount}</td>
                  <td style="padding:8px 12px;text-align:center;font-weight:700">{item.upvoteCount - item.downvoteCount}</td>
                  <td style="padding:8px 12px;color:#888">{new Date(item.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
};
