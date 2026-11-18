"use client";
import { useState } from "react";
const call = (b: any) => fetch("/api/admin/bill", { method: "POST", body: JSON.stringify(b) }).then(async r => ({ ok: r.ok, ...(await r.json()) }));
export function AdminLogin() {
  const [pw, setPw] = useState(""); const [err, setErr] = useState("");
  return <form className="card" onSubmit={async e => { e.preventDefault(); const r: any = await call({ action: "login", password: pw }); r.ok ? location.reload() : setErr(r.error); }}>
    <label>Password</label><input type="password" value={pw} onChange={e => setPw(e.target.value)} />{err && <div className="err">{err}</div>}<button>Sign in</button></form>;
}
export function BillPanel() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); const [res, setRes] = useState<any>(null);
  return <><label>Bill through month</label><input type="month" value={month} onChange={e => setMonth(e.target.value)} />
    <button onClick={async () => { if (confirm(`Charge every family's unbilled orders through ${month}?`)) setRes(await call({ action: "bill", month })); }}>Charge families</button>
    {res?.results && <div className="ok" style={{marginTop:12}}>{res.results.length ? res.results.map((r: any) => <div key={r.email}>{r.email}: {r.total} {r.status}</div>) : "Nothing to bill."}</div>}</>;
}
export function MenuEditor({ menu }: any) {
  const [m, setM] = useState(menu);
  const save = (x: any) => call({ action: "price", id: x.id, name: x.name, price_cents: x.price_cents, active: x.active });
  return <div className="card">{m.map((x: any, i: number) => { const set = (patch: any) => setM(m.map((y: any, j: number) => j === i ? { ...y, ...patch } : y));
    return <div key={x.id} style={{display:"flex",gap:6,marginBottom:8}}><input value={x.name} onChange={e => set({ name: e.target.value })} />
      <input style={{width:90}} type="number" step="0.01" value={x.price_cents / 100} onChange={e => set({ price_cents: Math.round(+e.target.value * 100) })} />
      <label style={{margin:0,display:"flex",alignItems:"center",gap:4}}><input style={{width:"auto"}} type="checkbox" checked={x.active} onChange={e => set({ active: e.target.checked })} />on</label>
      <button className="sec" style={{width:"auto",marginTop:0,padding:"0 12px"}} onClick={() => save(x)}>Save</button></div>; })}</div>;
}
export function ReportButtons({ date }: { date: string }) {
  const [msg, setMsg] = useState("");
  return <div className="noprint" style={{display:"flex",gap:8,flexWrap:"wrap"}}>
    <button className="sec" style={{flex:1}} onClick={async () => { const r: any = await call({ action: "emailReport", date }); setMsg(r.ok ? "Sent to admin@frxskishq.com" : r.error); }}>Email this list</button>
    <a className="btn sec" style={{flex:1,background:"#fff",color:"#1d1d1b",border:"1px solid #cfcdc5"}} href={"/api/admin/export?date=" + date}>Download CSV</a>
    {msg && <div className="ok" style={{width:"100%"}}>{msg}</div>}</div>;
}
export function OrderRow({ o, menu }: any) {
  const [mid, setMid] = useState(o.menu_item_id); const [msg, setMsg] = useState("");
  const run = async (b: any, ask?: string) => { if (ask && !confirm(ask)) return; const r: any = await call({ id: o.id, ...b }); r.ok ? location.reload() : setMsg(r.error); };
  const btn = { width: "auto", marginTop: 0, padding: "0 10px" };
  return <tr><td>{o.student}</td><td>{o.refunded ? <s>{o.item_name}</s> : o.billed ? o.item_name : <select value={mid} onChange={e => setMid(+e.target.value)}>{menu.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>}
    {o.refunded && " (refunded)"}{msg && <div className="err">{msg}</div>}</td>
    <td className="noprint" style={{whiteSpace:"nowrap"}}>
      {!o.billed && <><button className="sec" style={btn} disabled={mid === o.menu_item_id} onClick={() => run({ action: "updateOrder", menuItemId: mid })}>Save</button>{" "}
        <button className="sec" style={btn} onClick={() => run({ action: "deleteOrder" }, `Remove ${o.student}'s order?`)}>Remove</button></>}
      {o.billed && !o.refunded && <button className="sec" style={btn} onClick={() => run({ action: "refundOrder" }, `Refund $${(o.price_cents / 100).toFixed(2)} to the family's card?`)}>Refund</button>}
      {o.refunded && <button className="sec" style={btn} onClick={() => run({ action: "deleteOrder" }, "Remove this refunded order record?")}>Remove</button>}</td></tr>;
}
