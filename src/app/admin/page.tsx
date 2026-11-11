import { db } from "@/lib/db"; import { isAdmin } from "@/lib/auth"; import { orderWindow, fmtDate, money } from "@/lib/time"; import { AdminLogin, BillPanel, MenuEditor } from "./Client";
export const dynamic = "force-dynamic";
export default async function Admin({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  if (!(await isAdmin())) return <><h1>FRX staff</h1><AdminLogin /></>;
  const p = await db(); const w = orderWindow(); const date = (await searchParams).date || w.target;
  const rows = (await p.query("select o.item_name, s.name student, f.email from orders o join students s on s.id=o.student_id join families f on f.id=o.family_id where o.lunch_date=$1 order by s.name", [date])).rows;
  const totals: Record<string, number> = {}; rows.forEach((r: any) => totals[r.item_name] = (totals[r.item_name] || 0) + 1);
  const menu = (await p.query("select * from menu_items order by id")).rows;
  const owed = (await p.query("select f.email, sum(o.price_cents)::int t from orders o join families f on f.id=o.family_id where billed_at is null group by f.email order by f.email")).rows;
  return <>
    <h1>Kitchen list: {fmtDate(date)}</h1>
    <form className="noprint" style={{display:"flex",gap:8}}><input type="date" name="date" defaultValue={date} /><button className="sec" style={{width:"auto",marginTop:0,padding:"0 16px"}}>Go</button></form>
    <div className="card"><b>Totals ({rows.length} lunches)</b><table><tbody>{Object.entries(totals).map(([k, v]) => <tr key={k}><td>{k}</td><td><b>{v}</b></td></tr>)}</tbody></table>
      {date === w.target && w.open && <div className="muted">Ordering still open until the cutoff; list may change.</div>}</div>
    <div className="card"><b>By student</b><table><tbody>{rows.map((r: any, i: number) => <tr key={i}><td>{r.student}</td><td>{r.item_name}</td></tr>)}</tbody></table>{!rows.length && <span className="muted">No orders.</span>}</div>
    
    <div className="noprint"><h2>Month-end billing</h2>
      <div className="card"><table><tbody>{owed.map((o: any) => <tr key={o.email}><td>{o.email}</td><td>{money(o.t)}</td></tr>)}</tbody></table>{!owed.length && <span className="muted">Nothing unbilled.</span>}<BillPanel /></div>
      <h2>Menu</h2><MenuEditor menu={menu} /></div>
  </>;
}
