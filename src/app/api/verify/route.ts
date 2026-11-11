import { db } from "@/lib/db"; import { setSession } from "@/lib/auth"; import { redirect } from "next/navigation";
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token"); const p = await db();
  const { rows } = await p.query("delete from login_tokens where token=$1 and expires_at>now() returning email", [token]);
  if (!rows[0]) redirect("/login");
  const f = await p.query("insert into families(email) values($1) on conflict(email) do update set email=excluded.email returning id", [rows[0].email]);
  await setSession("p", String(f.rows[0].id)); redirect("/");
}
