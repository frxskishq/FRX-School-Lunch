import { db } from "@/lib/db"; import { localNow, orderWindow, fmtDate, CUTOFF_HOUR } from "@/lib/time"; import { sendBatch } from "@/lib/mail";
const SEND_HOUR = Number(process.env.REMINDER_HOUR ?? 7);
// Called by a Railway cron shortly after 13:00 and 14:00 UTC on Tue/Thu. Sends once per lunch date, at SEND_HOUR local time, only while ordering is open.
export async function POST(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return Response.json({ error: "Forbidden" }, { status: 403 });
  const w = orderWindow(); const n = localNow();
  if (!w.open) return Response.json({ skipped: "ordering not open", target: w.target });
  if (n.date < w.opens || n.hour < SEND_HOUR) return Response.json({ skipped: "too early", target: w.target });
  const p = await db();
  const ins = await p.query("insert into reminder_log(lunch_date) values($1) on conflict do nothing returning 1", [w.target]);
  if (!ins.rowCount) return Response.json({ skipped: "already sent", target: w.target });
  const subs = (await p.query("select email, token from reminder_subscribers where confirmed_at is not null and unsubscribed_at is null")).rows;
  const site = process.env.APP_URL || "https://lunch.frxskishq.com"; const hr = CUTOFF_HOUR % 12 || 12, ap = CUTOFF_HOUR >= 12 ? "PM" : "AM";
  const sent = await sendBatch(subs.map((s: any) => { const un = `${site}/api/reminders/unsubscribe?token=${s.token}`; return { to: s.email, unsubscribeUrl: un,
    subject: `Lunch ordering is open for ${fmtDate(w.target)}`,
    text: [`Ordering is open for ${fmtDate(w.target)}.`, "", `Orders close tonight at ${hr}:00 ${ap} Mountain Time and are final once placed.`, "", `Order here: ${site}`, "", `Unsubscribe: ${un}`, "", "This is an automated message from lunch@frxskishq.com. Questions: admin@frxskishq.com"].join("\n") }; }));
  await p.query("update reminder_log set recipients=$2 where lunch_date=$1", [w.target, sent]);
  return Response.json({ sent, target: w.target });
}
