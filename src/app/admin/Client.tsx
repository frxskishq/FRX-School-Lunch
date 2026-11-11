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
