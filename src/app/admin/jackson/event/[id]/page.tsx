import { notFound } from "next/navigation"; import { db } from "@/lib/db"; import { isAdmin } from "@/lib/auth"; import { fmtDate, money } from "@/lib/time"; import { generateDueInvoices, JACKSON_SLOTS, itemLabel, slotLabel, jacksonCutoffDay } from "@/lib/jackson"; import { AdminLogin } from "../../../Client"; import { Actions } from "../../Client";
export const dynamic = "force-dynamic";
export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return <><h1>FRX staff</h1><AdminLogin /></>;
  const id = Number((await params).id); if (!Number.isInteger(id)) notFound();
  await generateDueInvoices(); const p = await db();
  const e = (await p.query("select e.id, e.pickup_date::text d, e.note, c.name, c.contact_name, c.contact_email, c.phone from jackson_events e join jackson_companies c on c.id=e.company_id where e.id=$1", [id])).rows[0]; if (!e) notFound();
  const orders = (await p.query("select o.*, f.email from jackson_orders o left join families f on f.id=o.family_id where o.event_id=$1 order by o.pickup_time, o.person", [id])).rows;
  const inv = (await p.query("select * from jackson_invoices where event_id=$1", [id])).rows[0];
  const total = orders.reduce((a: number, o: any) => a + o.price_cents, 0);
  const byLabel = (l: any[]) => Object.entries(l.reduce((m: any, o: any) => { const k = itemLabel(o.option, o.meat); m[k] = (m[k] || 0) + 1; return m; }, {}));
  return <>
    <div className="noprint muted"><a href="/admin/jackson">Back to Jackson admin</a></div>
    <h1>{e.name}: pickup {fmtDate(e.d)}</h1>
    <div className="muted">{[e.contact_name, e.contact_email, e.phone].filter(Boolean).join(" · ")}</div>
    <h2>Prep list</h2>
    {JACKSON_SLOTS.map(s => { const o = orders.filter((x: any) => x.pickup_time === s.id); return o.length ? <div className="card" key={s.id}><b>{s.label}</b> ({o.length}): {byLabel(o).map(([k, v]) => `${v} x ${k}`).join(", ")}
      <table><tbody>{o.map((x: any) => <tr key={x.id}><td>{x.person}</td><td>{itemLabel(x.option, x.meat)}</td><td className="noprint">{x.email}</td><td className="noprint" style={{ textAlign: "right" }}>{!inv && <Actions kind="order" id={x.id} />}</td></tr>)}</tbody></table></div> : null; })}
    {!orders.length && <div className="card muted">No orders yet.</div>}
    <h2>Invoice</h2>
    {inv ? <div className="card"><div className="row"><b>Invoice #{inv.id} · {inv.status === "paid" ? "PAID" : "due at pickup"}</b><Actions kind="invoice" id={inv.id} paid={inv.status === "paid"} /></div>
      <div className="muted">Bill to {e.name} · pickup {fmtDate(e.d)} · issued {new Date(inv.created_at).toLocaleDateString("en-US")}</div>
      <table><tbody>{byLabel(orders).map(([k, v]) => <tr key={k}><td>{k}</td><td>{String(v)} x $9.50</td><td>{money(Number(v) * 950)}</td></tr>)}<tr><td colSpan={2}><b>Total due at pickup</b></td><td><b>{money(inv.total_cents)}</b></td></tr></tbody></table>
      <div className="muted noprint" style={{marginTop:8}}>Use your browser's Print to save a PDF.</div></div>
      : <div className="card muted">No invoice yet. It is created after orders close ({fmtDate(jacksonCutoffDay(e.d))}, 8:00 PM Mountain). Current total: {money(total)}.</div>}
  </>;
}
