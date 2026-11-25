import { redirect } from "next/navigation"; import { db } from "@/lib/db"; import { parentId } from "@/lib/auth"; import { fmtDate, money } from "@/lib/time"; import { jacksonOpen, slotLabel, itemLabel, JACKSON_CUTOFF_HOUR } from "@/lib/jackson"; import JacksonForm from "./JacksonForm";
export const dynamic = "force-dynamic";
export default async function Jackson() {
  const fid = await parentId(); if (!fid) redirect("/login");
  const p = await db(); const f = (await p.query("select email from families where id=$1", [fid])).rows[0]; if (!f) redirect("/login");
  const evs = (await p.query("select e.id, e.pickup_date::text d, e.note, c.id cid, c.name cname from jackson_events e join jackson_companies c on c.id=e.company_id where c.active and e.pickup_date > current_date order by e.pickup_date, c.name")).rows.filter((e: any) => jacksonOpen(e.d));
  const orders = (await p.query("select o.*, o.event_id, e.pickup_date::text d, c.name cname from jackson_orders o join jackson_events e on e.id=o.event_id join jackson_companies c on c.id=e.company_id where o.family_id=$1 order by e.pickup_date desc, o.id desc limit 40", [fid])).rows;
  const hr = JACKSON_CUTOFF_HOUR % 12 || 12;
  return <>
    <div className="row"><div><h1>FRX Jackson WY</h1><div className="muted">{f.email} · <a href="/">All locations</a></div></div>
      <form action="/api/logout" method="post"><button className="sec" style={{width:"auto",marginTop:0,padding:"6px 12px",fontSize:14}}>Sign out</button></form></div>
    <div className="card"><h2 style={{margin:0}}>Catered breakfast and lunch burritos</h2>
      <div className="muted">Choose your company, pickup date and time. Orders close {hr}:00 PM Mountain Time two days before pickup. Payment is collected at pickup.</div></div>
    <JacksonForm events={evs.map((e: any) => ({ id: e.id, companyId: e.cid, company: e.cname, date: e.d, label: fmtDate(e.d), note: e.note }))} />
    <h2>Your orders</h2>
    <div className="card">{orders.length ? <table><tbody>{orders.map((o: any) => <tr key={o.id}><td>{fmtDate(o.d)}<br /><small className="muted">{o.cname}</small></td><td>{o.person}</td><td>{itemLabel(o.option, o.meat)}</td><td>{slotLabel(o.pickup_time)}</td><td>{money(o.price_cents)}</td></tr>)}</tbody></table> : <span className="muted">No orders yet.</span>}</div>
  </>;
}
