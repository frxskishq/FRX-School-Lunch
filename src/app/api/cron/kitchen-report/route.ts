import { db } from "@/lib/db"; import { localNow, addDays, isFulfillmentDay, CUTOFF_HOUR } from "@/lib/time"; import { sendKitchenReport } from "@/lib/report";
// Called by a Railway cron at 02:05 and 03:05 UTC on Wed/Fri. Only the run after the 8 PM Mountain cutoff sends, and only once per lunch date.
export async function POST(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return Response.json({ error: "Forbidden" }, { status: 403 });
  const n = localNow(); const date = addDays(n.date, 1);
  if (!isFulfillmentDay(date)) return Response.json({ skipped: "not a fulfillment day", date });
  if (n.hour < CUTOFF_HOUR) return Response.json({ skipped: "before cutoff", date });
  const p = await db();
  const ins = await p.query("insert into report_log(lunch_date) values($1) on conflict do nothing returning 1", [date]);
  if (!ins.rowCount) return Response.json({ skipped: "already sent", date });
  const ok = await sendKitchenReport(date);
  if (!ok) { await p.query("delete from report_log where lunch_date=$1", [date]); return Response.json({ error: "send failed", date }, { status: 500 }); }
  return Response.json({ sent: true, date });
}
