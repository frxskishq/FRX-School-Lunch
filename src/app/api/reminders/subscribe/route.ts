import { SCHOOLS } from "@/lib/schools"; import { db } from "@/lib/db"; import { sendMail } from "@/lib/mail"; import crypto from "crypto";
const base = (req: Request) => process.env.APP_URL || new URL(req.url).origin;
export async function POST(req: Request) {
  const b = await req.json(); const e = String(b.email || "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(e)) return Response.json({ error: "Enter a valid email" }, { status: 400 });
  const picked = SCHOOLS.filter(s => (b.schools || []).includes(s.id)).map(s => s.id);
  if (!picked.length) return Response.json({ error: "Choose at least one school" }, { status: 400 });
  const p = await db(); const token = crypto.randomBytes(20).toString("hex");
  const r = await p.query(`insert into reminder_subscribers(email, token, schools) values($1,$2,$3)
    on conflict(email) do update set schools = excluded.schools, token = case when reminder_subscribers.confirmed_at is not null and reminder_subscribers.unsubscribed_at is null then reminder_subscribers.token else excluded.token end,
      unsubscribed_at = case when reminder_subscribers.confirmed_at is not null and reminder_subscribers.unsubscribed_at is null then null else reminder_subscribers.unsubscribed_at end
    returning token, confirmed_at, unsubscribed_at`, [e, token, picked.join(",")]);
  const row = r.rows[0];
  // Always answer the same so the form can't be used to probe who is subscribed.
  if (!row.confirmed_at || row.unsubscribed_at) await sendMail(e, "Confirm your FRX Lunch reminders", `Tap to confirm you want an ordering reminder email before each lunch deadline:\n${base(req)}/api/reminders/confirm?token=${row.token}\n\nIf you didn't ask for this, ignore this email and nothing will be sent.`);
  return Response.json({ ok: true });
}
