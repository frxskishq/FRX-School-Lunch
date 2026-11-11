import { isAdmin } from "@/lib/auth"; import { kitchenData } from "@/lib/report";
export async function GET(req: Request) {
  if (!(await isAdmin())) return new Response("Forbidden", { status: 403 });
  const date = new URL(req.url).searchParams.get("date") || ""; if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return new Response("Bad date", { status: 400 });
  const { rows } = await kitchenData(date); const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  return new Response("Lunch,Student\n" + rows.map((r: any) => `${q(r.item_name)},${q(r.student)}`).join("\n") + "\n", { headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="frx-lunch-${date}.csv"` } });
}
