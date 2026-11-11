import { db } from "@/lib/db"; import { sendMail } from "@/lib/mail"; import crypto from "crypto";
export async function POST(req: Request) {
  const { email } = await req.json(); const e = String(email || "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(e)) return Response.json({ error: "Invalid email" }, { status: 400 });
  const p = await db(); const token = crypto.randomBytes(24).toString("hex");
  await p.query("insert into login_tokens values($1,$2,now()+interval '15 minutes')", [token, e]);
  const base = process.env.APP_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : new URL(req.url).origin); const link = `${base}/api/verify?token=${token}`;
  await sendMail(e, "Your FRX Lunch sign-in link", link);
  return Response.json({ ok: true, devLink: (process.env.NODE_ENV !== "production" && !process.env.RESEND_API_KEY) || process.env.SHOW_LOGIN_LINK ? link : undefined });
}
