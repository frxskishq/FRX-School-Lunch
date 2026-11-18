import { db } from "@/lib/db"; import { isAdmin, setSession, clearSession } from "@/lib/auth"; import { chargeCard, refundPayment } from "@/lib/square"; import { sendMail } from "@/lib/mail"; import { sendKitchenReport } from "@/lib/report"; import { money, fmtDate } from "@/lib/time";
export async function POST(req: Request) {
  const b = await req.json();
  if (b.action === "login") { if (b.password && b.password === process.env.ADMIN_PASSWORD) { await setSession("a", "admin"); return Response.json({ ok: true }); } return Response.json({ error: "Wrong password" }, { status: 401 }); }
  if (!(await isAdmin())) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (b.action === "logout") { await clearSession(); return Response.json({ ok: true }); }
  const p = await db();
  if (b.action === "emailReport") { if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date)) return Response.json({ error: "Bad date" }, { status: 400 }); const ok = await sendKitchenReport(b.date); return ok ? Response.json({ ok: true }) : Response.json({ error: "Email failed" }, { status: 500 }); }
  if (b.action === "price") { await p.query("update menu_items set price_cents=$2, name=$3, active=$4 where id=$1", [b.id, b.price_cents, b.name, b.active]); return Response.json({ ok: true }); }
  if (b.action === "updateOrder" || b.action === "deleteOrder" || b.action === "refundOrder") {
    const o = (await p.query("select * from orders where id=$1", [Number(b.id)])).rows[0]; if (!o) return Response.json({ error: "Order not found" }, { status: 404 });
    const fam = (await p.query("select email from families where id=$1", [o.family_id])).rows[0];
    const stu = (await p.query("select name from students where id=$1", [o.student_id])).rows[0]?.name || "your student";
    if (b.action === "updateOrder") {
      if (o.billed_at) return Response.json({ error: "Already billed; refund it instead" }, { status: 400 });
      const m = (await p.query("select * from menu_items where id=$1", [Number(b.menuItemId)])).rows[0]; if (!m) return Response.json({ error: "Bad menu item" }, { status: 400 });
      await p.query("update orders set menu_item_id=$2, item_name=$3, price_cents=$4 where id=$1", [o.id, m.id, m.name, m.price_cents]);
      await sendMail(fam.email, `FRX Lunch order changed for ${fmtDate(o.lunch_date)}`, `Your order for ${stu} on ${fmtDate(o.lunch_date)} was changed by FRX staff.\nWas: ${o.item_name} ${money(o.price_cents)}\nNow: ${m.name} ${money(m.price_cents)}\nYou'll be billed the new price at month-end.`); return Response.json({ ok: true });
    }
    if (b.action === "deleteOrder") {
      if (o.billed_at && !o.refunded_at) return Response.json({ error: "Already billed; refund it first" }, { status: 400 });
      await p.query("delete from orders where id=$1", [o.id]);
      if (!o.refunded_at) await sendMail(fam.email, `FRX Lunch order cancelled for ${fmtDate(o.lunch_date)}`, `Your order for ${stu} on ${fmtDate(o.lunch_date)} (${o.item_name}, ${money(o.price_cents)}) was cancelled by FRX staff. You will not be billed for it.`);
      return Response.json({ ok: true });
    }
    if (!o.billed_at) return Response.json({ error: "Not billed yet; just remove the order" }, { status: 400 });
    if (o.refunded_at) return Response.json({ error: "Already refunded" }, { status: 400 });
    const inv = (await p.query("select * from invoices where family_id=$1 and status='paid' and month>=to_char($2::date,'YYYY-MM') order by month limit 1", [o.family_id, o.lunch_date])).rows[0];
    if (!inv?.square_payment_id) return Response.json({ error: "No paid invoice found for this order" }, { status: 400 });
    const r = await refundPayment({ paymentId: inv.square_payment_id, cents: o.price_cents, key: `frx-refund-${o.id}`, reason: "FRX School Lunch order refund" });
    if (!r.ok) return Response.json({ error: "Refund failed: " + (r as any).error }, { status: 400 });
    await p.query("update orders set refunded_cents=price_cents, refunded_at=now() where id=$1", [o.id]);
    await sendMail(fam.email, "FRX Lunch refund", `Refunded ${money(o.price_cents)} for ${o.item_name} on ${fmtDate(o.lunch_date)}.`);
    return Response.json({ ok: true });
  }
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
