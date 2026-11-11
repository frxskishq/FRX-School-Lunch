export const FROM = process.env.MAIL_FROM || "FRX School Lunch (no reply) <lunch@frxskishq.com>";
/** Sends via Resend when RESEND_API_KEY is set; otherwise logs to the console (dev). */
export async function sendMail(to: string, subject: string, body: string) {
  if (!process.env.RESEND_API_KEY) { console.log(`\n[mail] from=${FROM} to=${to}\n${subject}\n${body}\n`); return; }
  const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, reply_to: process.env.REPLY_TO || "admin@frxskishq.com", subject, text: body + "\n\nThis is an automated message from lunch@frxskishq.com. Please do not reply to this address. Questions: admin@frxskishq.com" }) });
  if (!r.ok) console.error("[mail] send failed", r.status, await r.text());
}
