import { db } from "@/lib/db"; import { isAdmin, setSession, clearSession } from "@/lib/auth"; import { chargeCard } from "@/lib/square"; import { sendMail } from "@/lib/mail"; import { sendKitchenReport } from "@/lib/report"; import { money, fmtDate } from "@/lib/time";
export async function POST(req: Request) {
  const b = await req.json();
  if (b.action === "login") { if (b.password && b.password === process.env.ADMIN_PASSWORD) { await setSession("a", "admin"); return Response.json({ ok: true }); } return Response.json({ error: "Wrong password" }, { status: 401 }); }
  if (!(await isAdmin())) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (b.action === "logout") { await clearSession(); return Response.json({ ok: true }); }
  const p = await db();
  if (b.action === "emailReport") { if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date)) return Response.json({ error: "Bad date" }, { status: 400 }); const ok = await sendKitchenReport(b.date); return ok ? Response.json({ ok: true }) : Response.json({ error: "Email failed" }, { status: 500 }); }
  if (b.action === "price") { await p.query("update menu_items set price_cents=$2, name=$3, active=$4 where id=$1", [b.id, b.price_cents, b.name, b.active]); return Response.json({ ok: true }); }
  if (b.action === "bill") { // month = YYYY-MM; bills all unbilled orders up to the end of that month, once per family
    const month: string = b.month; if (!/^\d{4}-\d{2}$/.test(month)) return Response.json({ error: "Bad month" }, { status: 400 });
    const fams = (await p.query(`select f.*, sum(o.price_cents)::int total from families f join orders o on o.family_id=f.id where o.billed_at is null and to_char(o.lunch_date,'YYYY-MM')<=$1 group by f.id`, [month])).rows;
    const results: any[] = [];
    for (const f of fams) {
      const done = await p.query("select 1 from invoices where family_id=$1 and month=$2 and status='paid'", [f.id, month]);
      if (done.rowCount) continue;
      const r = await chargeCard({ customerId: f.square_customer_id, cardId: f.square_card_id, cents: f.total, key: `frx-${f.id}-${month}`, note: `FRX School Lunch ${month}` });
      await p.query("insert into invoices(family_id,month,total_cents,status,square_payment_id) values($1,$2,$3,$4,$5) on conflict(family_id,month) do update set status=excluded.status, total_cents=excluded.total_cents, square_payment_id=excluded.square_payment_id", [f.id, month, f.total, r.ok ? "paid" : "failed", r.ok ? r.id : null]);
      if (r.ok) {
        const lines = (await p.query(`select o.*, s.name student from orders o join students s on s.id=o.student_id where o.family_id=$1 and o.billed_at is null and to_char(o.lunch_date,'YYYY-MM')<=$2 order by lunch_date`, [f.id, month])).rows;
        await p.query(`update orders set billed_at=now() where family_id=$1 and billed_at is null and to_char(lunch_date,'YYYY-MM')<=$2`, [f.id, month]);
        await sendMail(f.email, `FRX Lunch receipt for ${month}`, lines.map((l: any) => `${fmtDate(l.lunch_date)}  ${l.student}  ${l.item_name}  ${money(l.price_cents)}`).join("\n") + `\nTotal charged: ${money(f.total)}`);
      }
      results.push({ email: f.email, total: money(f.total), status: r.ok ? "paid" : "failed: " + (r as any).error });
    }
    return Response.json({ ok: true, results });
  }
  return Response.json({ error: "Bad request" }, { status: 400 });
}
