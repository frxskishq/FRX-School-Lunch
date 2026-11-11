import { db } from "@/lib/db"; import { redirect } from "next/navigation";
async function go(token: string) { const p = await db(); const r = await p.query("update reminder_subscribers set unsubscribed_at=now() where token=$1", [token]); return r.rowCount ? "unsubscribed" : "invalid"; }
export async function GET(req: Request) { redirect("/reminders?status=" + (await go(new URL(req.url).searchParams.get("token") || ""))); }
// One-click unsubscribe from mail clients (RFC 8058)
export async function POST(req: Request) { await go(new URL(req.url).searchParams.get("token") || ""); return new Response("ok"); }
