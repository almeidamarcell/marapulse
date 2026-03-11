export async function sendMagicLink(apiKey: string, to: string, url: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Marapulse <noreply@marapulse.com>",
      to,
      subject: "Sign in to Marapulse",
      html: `
        <p>Click the link below to sign in:</p>
        <p><a href="${url}" style="display:inline-block;padding:12px 24px;background:#0F0F0F;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Sign in to Marapulse</a></p>
        <p style="color:#999;font-size:13px;">This link expires in 15 minutes. If you didn't request this, you can ignore this email.</p>
      `,
    }),
  });
  const data = await res.json();
  console.log(`[Email] Magic link to ${to}: status=${res.status}`, JSON.stringify(data));
  return data;
}

export async function sendVerificationCode(apiKey: string, to: string, code: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Marapulse <noreply@marapulse.com>",
      to,
      subject: `Your verification code: ${code}`,
      html: `
        <p>Your verification code is:</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:0.1em;padding:16px 0;">${code}</p>
        <p style="color:#999;font-size:13px;">This code expires in 10 minutes.</p>
      `,
    }),
  });
  const data = await res.json();
  console.log(`[Email] Verification code to ${to}: status=${res.status}`, JSON.stringify(data));
  return data;
}

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  under_review: "Under Review",
  planned: "Planned",
  in_progress: "In Progress",
  done: "Done",
  dismissed: "Dismissed",
};

export async function sendStatusNotification(apiKey: string, to: string, title: string, newStatus: string) {
  const label = STATUS_LABELS[newStatus] ?? newStatus;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Marapulse <noreply@marapulse.com>",
      to,
      subject: `Your suggestion "${title}" is now ${label}`,
      html: `
        <p>Your suggestion <strong>"${title}"</strong> has been updated:</p>
        <p style="font-size:18px;font-weight:600;padding:8px 0;">Status: ${label}</p>
        <p style="color:#999;font-size:13px;">Thanks for your feedback!</p>
      `,
    }),
  });
  const data = await res.json();
  console.log(`[Email] Status notification to ${to}: status=${res.status}`, JSON.stringify(data));
  return data;
}
