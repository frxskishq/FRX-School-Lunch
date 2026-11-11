import { db } from "@/lib/db"; import { redirect } from "next/navigation";
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || ""; const p = await db();
  const r = await p.query("update reminder_subscribers set confirmed_at=now(), unsubscribed_at=null where token=$1 returning email", [token]);
  redirect(r.rowCount ? "/reminders?status=confirmed" : "/reminders?status=invalid");
}
