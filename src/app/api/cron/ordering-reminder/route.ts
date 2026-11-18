import { db } from "@/lib/db"; import { localNow, addDays, fmtDate, isFulfillmentDay, CUTOFF_HOUR } from "@/lib/time"; import { SCHOOLS } from "@/lib/schools"; import { sendBatch } from "@/lib/mail";
const SEND_HOUR = 8;
// Called by a Railway cron at 14:05 and 15:05 UTC on Mondays (8 AM Mountain in summer and winter). Sends once per Monday, at or after 8 AM local time.
// The reminder covers the week's lunches: each school's next lunch day. The Monday date is the key in reminder_log.
export async function POST(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return Response.json({ error: "Forbidden" }, { status: 403 });
  const n = localNow();
  if (new Date(n.date + "T12:00:00Z").getUTCDay() !== 1) return Response.json({ skipped: "not Monday", date: n.date });
  if (n.hour < SEND_HOUR) return Response.json({ skipped: "too early", date: n.date });
  const p = await db();
  const ins = await p.query("insert into reminder_log(lunch_date) values($1) on conflict do nothing returning 1", [n.date]);
  if (!ins.rowCount) return Response.json({ skipped: "already sent", date: n.date });
  const subs = (await p.query("select email, token, schools from reminder_subscribers where confirmed_at is not null and unsubscribed_at is null")).rows;
  const site = process.env.APP_URL || "https://lunch.frxskishq.com"; const hr = CUTOFF_HOUR % 12 || 12, ap = CUTOFF_HOUR >= 12 ? "PM" : "AM";
  const lunches = SCHOOLS.map(s => ({ id: s.id, line: (() => { let d = addDays(n.date, 1); while (!isFulfillmentDay(d, [s.day])) d = addDays(d, 1); return `${s.name}: ${fmtDate(d)} (orders close ${fmtDate(addDays(d, -1))} at ${hr}:00 ${ap} Mountain Time)`; })() }));
  const sent = await sendBatch(subs.filter((s: any) => lunches.some(l => s.schools.split(",").includes(l.id))).map((s: any) => { const un = `${site}/api/reminders/unsubscribe?token=${s.token}`; return { to: s.email, unsubscribeUrl: un,
    subject: "Reminder: order school lunches for this week",
    text: ["Reminder: it's time to order school lunches for this week.", "", ...lunches.filter(l => s.schools.split(",").includes(l.id)).map(l => l.line), "", "Orders are final once placed.", "", `Order here: ${site}`, "", `Unsubscribe: ${un}`, "", "This is an automated message from lunch@frxskishq.com. Questions: admin@frxskishq.com"].join("\n") }; }));
  await p.query("update reminder_log set recipients=$2 where lunch_date=$1", [n.date, sent]);
  return Response.json({ sent, date: n.date });
}
