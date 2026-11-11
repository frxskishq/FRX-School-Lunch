export const FROM = process.env.MAIL_FROM || "FRX School Lunch (no reply) <lunch@frxskishq.com>";
const FOOTER = "\n\nThis is an automated message from lunch@frxskishq.com. Please do not reply to this address. Questions: admin@frxskishq.com";
type Opts = { html?: string; attachments?: { filename: string; content: string }[]; footer?: boolean };
/** Sends via Resend when RESEND_API_KEY is set; otherwise logs to the console (dev). Attachment content is a plain string. */
export async function sendMail(to: string, subject: string, body: string, o: Opts = {}) {
  if (!process.env.RESEND_API_KEY) { console.log(`\n[mail] from=${FROM} to=${to}\n${subject}\n${body}\n`); return true; }
  const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, reply_to: process.env.REPLY_TO || "admin@frxskishq.com", subject, text: body + (o.footer === false ? "" : FOOTER), html: o.html,
      attachments: o.attachments?.map(a => ({ filename: a.filename, content: Buffer.from(a.content).toString("base64") })) }) });
  if (!r.ok) console.error("[mail] send failed", r.status, await r.text());
  return r.ok;
}
