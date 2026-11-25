import { SCHOOLS, schoolById } from "@/lib/schools"; import { db } from "@/lib/db"; import { isAdmin } from "@/lib/auth"; import { orderWindow, fmtDate, money, TZ } from "@/lib/time"; import { AdminLogin, BillPanel, MenuEditor, ReportButtons, OrderRow } from "./Client";
export const dynamic = "force-dynamic";
export default async function Admin({ searchParams }: { searchParams: Promise<{ date?: string; school?: string }> }) {
  if (!(await isAdmin())) return <><h1>FRX staff</h1><AdminLogin /></>;
  const p = await db(); const sp = await searchParams; const school = schoolById(sp.school) || SCHOOLS[0]; const w = orderWindow(new Date(), [school.day]); const date = sp.date || w.target;
  const rows = (await p.query("select o.id, o.menu_item_id, o.billed_at is not null billed, o.refunded_at is not null refunded, o.price_cents, o.item_name, s.name student, f.email from orders o join students s on s.id=o.student_id join families f on f.id=o.family_id where o.lunch_date=$1 and o.school=$2 order by s.name", [date, school.id])).rows;
  const totals: Record<string, number> = {}; rows.filter((r: any) => !r.refunded).forEach((r: any) => totals[r.item_name] = (totals[r.item_name] || 0) + 1);
  const reported = (await p.query("select sent_at from report_log where lunch_date=$1", [date])).rows[0];
  const menu = (await p.query("select * from menu_items order by id")).rows;
  const owed = (await p.query("select f.email, sum(o.price_cents)::int t from orders o join families f on f.id=o.family_id where o.billed_at is null and o.refunded_at is null and o.school=$1 group by f.email order by f.email", [school.id])).rows;
  return <>
    <div className="noprint muted" style={{marginBottom:8}}><a href="/admin/jackson">FRX Jackson WY admin (companies, pickups, invoices)</a></div>
    <div className="noprint" style={{display:"flex",gap:8,marginBottom:8}}>{SCHOOLS.map(s => <a key={s.id} href={`/admin?school=${s.id}`} className="btn sec" style={{flex:1,textAlign:"center",...(s.id === school.id ? {background:"#1d1d1b",color:"#fff"} : {background:"#fff",color:"#1d1d1b",border:"1px solid #cfcdc5"})}}>{s.name}</a>)}</div>
    <h1>{school.name} kitchen list: {fmtDate(date)}</h1>
    <form className="noprint" style={{display:"flex",gap:8}}><input type="hidden" name="school" value={school.id} /><input type="date" name="date" defaultValue={date} /><button className="sec" style={{width:"auto",marginTop:0,padding:"0 16px"}}>Go</button></form>
    <ReportButtons date={date} />
    {reported && <div className="err noprint">The kitchen list for this date was already emailed on {new Date(reported.sent_at).toLocaleString("en-US", { timeZone: TZ, dateStyle: "medium", timeStyle: "short" })}. Changes made now will not reach the kitchen; tell them directly.</div>}
    <div className="card"><b>Totals ({rows.filter((r: any) => !r.refunded).length} lunches)</b><table><tbody>{Object.entries(totals).map(([k, v]) => <tr key={k}><td>{k}</td><td><b>{v}</b></td></tr>)}</tbody></table>
      {date === w.target && w.open && <div className="muted">Ordering still open until the cutoff; list may change.</div>}</div>
    <div className="card"><b>By student</b><table><tbody>{rows.map((r: any) => <OrderRow key={r.id} reported={!!reported} o={r} menu={menu.filter((m: any) => m.active || m.id === r.menu_item_id)} />)}</tbody></table>{!rows.length && <span className="muted">No orders.</span>}</div>
    
    <div className="noprint"><h2>Month-end billing: {school.name}</h2>
      <div className="card"><div className="muted" style={{marginBottom:8}}>Unbilled orders at {school.name} only. Families with orders at both schools are charged separately for each.</div><table><tbody>{owed.map((o: any) => <tr key={o.email}><td>{o.email}</td><td>{money(o.t)}</td></tr>)}</tbody></table>{!owed.length && <span className="muted">Nothing unbilled.</span>}<BillPanel school={school.id} schoolName={school.name} /></div>
      <h2>Menu</h2><MenuEditor menu={menu} /></div>
  </>;
}
