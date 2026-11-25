import { db } from "@/lib/db"; import { isAdmin } from "@/lib/auth"; import { generateDueInvoices } from "@/lib/jackson";
const date = (s: any) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Forbidden" }, { status: 403 });
  const b = await req.json(); const p = await db(); const t = (v: any) => String(v ?? "").trim() || null;
  switch (b.action) {
    case "saveCompany": {
      const name = t(b.name); if (!name) return Response.json({ error: "Company name required" }, { status: 400 });
      if (b.id) await p.query("update jackson_companies set name=$2, contact_name=$3, contact_email=$4, phone=$5, notes=$6, active=$7 where id=$1", [b.id, name, t(b.contact_name), t(b.contact_email), t(b.phone), t(b.notes), b.active !== false]);
      else await p.query("insert into jackson_companies(name,contact_name,contact_email,phone,notes) values($1,$2,$3,$4,$5)", [name, t(b.contact_name), t(b.contact_email), t(b.phone), t(b.notes)]);
      return Response.json({ ok: true });
    }
    case "addEvent": {
      if (!date(b.date)) return Response.json({ error: "Pick a pickup date" }, { status: 400 });
      const r = await p.query("insert into jackson_events(company_id,pickup_date,note) values($1,$2,$3) on conflict do nothing returning id", [Number(b.companyId), b.date, t(b.note)]);
      return r.rowCount ? Response.json({ ok: true }) : Response.json({ error: "That company already has that pickup date" }, { status: 400 });
    }
    case "updateEvent": await p.query("update jackson_events set pickup_date=$2, note=$3 where id=$1", [Number(b.id), b.date, t(b.note)]); return Response.json({ ok: true });
    case "deleteEvent": {
      if ((await p.query("select 1 from jackson_orders where event_id=$1 limit 1", [Number(b.id)])).rowCount) return Response.json({ error: "This pickup has orders; remove them first" }, { status: 400 });
      await p.query("delete from jackson_events where id=$1", [Number(b.id)]); return Response.json({ ok: true });
    }
    case "deleteOrder": {
      const inv = await p.query("select 1 from jackson_orders o join jackson_invoices i on i.event_id=o.event_id where o.id=$1", [Number(b.id)]);
      if (inv.rowCount) return Response.json({ error: "Invoice already generated for this pickup" }, { status: 400 });
      await p.query("delete from jackson_orders where id=$1", [Number(b.id)]); return Response.json({ ok: true });
    }
    case "generateInvoices": return Response.json({ ok: true, created: (await generateDueInvoices()).length });
    case "markPaid": await p.query("update jackson_invoices set status=$2, paid_at=case when $2='paid' then now() end where id=$1", [Number(b.id), b.paid ? "paid" : "unpaid"]); return Response.json({ ok: true });
  }
  return Response.json({ error: "Bad request" }, { status: 400 });
}
