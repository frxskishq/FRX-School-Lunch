"use client";
import { useState } from "react";
const call = (b: any) => fetch("/api/admin/catering", { method: "POST", body: JSON.stringify(b) }).then(async r => ({ ok: r.ok, ...(await r.json()) }));
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const sm = { width: "auto", marginTop: 0, padding: "8px 14px", fontSize: 14 } as const;
export function CateringAdmin({ orders, items, settings }: any) {
  const [tab, setTab] = useState("orders");
  return <><div style={{display:"flex",gap:8,margin:"12px 0"}}>{[["orders", "Orders"], ["menu", "Menu"], ["times", "Pickup times"]].map(([k, l]) => <button key={k} className={tab === k ? "" : "sec"} style={sm} onClick={() => setTab(k)}>{l}</button>)}</div>
    {tab === "orders" && <Orders orders={orders} />}{tab === "menu" && <Menu items={items} />}{tab === "times" && <Times settings={settings} />}</>;
}
function Orders({ orders }: any) {
  const [msg, setMsg] = useState("");
  const act = async (id: number, status: string, notify: boolean) => { if (status === "cancelled" && !confirm("Cancel this order and email the customer?")) return; const r: any = await call({ action: "setStatus", id, status, notify }); r.ok ? location.reload() : setMsg(r.error); };
  if (!orders.length) return <div className="card muted">No catering orders yet.</div>;
  return <>{msg && <div className="err">{msg}</div>}{orders.map((o: any) => <div className="card" key={o.id}>
    <div className="row"><b>{o.ref}: {o.company}</b><span className="pill" style={{background:o.status === "requested" ? "#fde8c8" : o.status === "confirmed" ? "#e4f4e6" : "#eee",color:"#1d1d1b"}}>{o.status}</span></div>
    <div className="muted">Pickup {o.when} · {o.contact_name} · <a href={"mailto:" + o.email}>{o.email}</a> · {o.phone}{o.headcount ? ` · ${o.headcount} people` : ""}</div>
    <table><tbody>{(o.lines || []).map((l: any, i: number) => <tr key={i}><td>{l.q} x {l.n}</td><td>${(l.p * l.q / 100).toFixed(2)}</td></tr>)}<tr><td><b>Subtotal</b></td><td><b>{o.total}</b></td></tr></tbody></table>
    {o.notes && <div className="muted">Notes: {o.notes}</div>}
    <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}} className="noprint">
      {o.status === "requested" && <button style={sm} onClick={() => act(o.id, "confirmed", true)}>Confirm and email</button>}
      {o.status === "confirmed" && <button style={sm} onClick={() => act(o.id, "completed", false)}>Mark completed</button>}
      {(o.status === "requested" || o.status === "confirmed") && <button className="sec" style={sm} onClick={() => act(o.id, "cancelled", true)}>Cancel</button>}</div></div>)}</>;
}
function Menu({ items }: any) {
  const [m, setM] = useState(items); const [msg, setMsg] = useState("");
  const blank = { name: "", description: "", category: "Entrees", price_cents: 0, unit: "each", min_qty: 1, active: false, sort: m.length + 1 };
  const save = async (x: any) => { const r: any = await call({ action: "saveItem", item: x }); r.ok ? location.reload() : setMsg(r.error); };
  const row = (x: any, i: number) => { const set = (p: any) => setM(m.map((y: any, j: number) => j === i ? { ...y, ...p } : y));
    return <div className="card" key={x.id || "new"}><div className="two">
      <div><label style={{marginTop:0}}>Name</label><input value={x.name} onChange={e => set({ name: e.target.value })} /></div>
      <div><label style={{marginTop:0}}>Category (groups the menu)</label><input value={x.category} onChange={e => set({ category: e.target.value })} /></div></div>
      <label>Description</label><input value={x.description || ""} onChange={e => set({ description: e.target.value })} />
      <div className="two"><div><label>Price ($)</label><input type="number" step="0.01" value={x.price_cents / 100} onChange={e => set({ price_cents: Math.round(+e.target.value * 100) })} /></div>
      <div><label>Sold as (per person, per tray...)</label><input value={x.unit} onChange={e => set({ unit: e.target.value })} /></div>
      <div><label>Minimum quantity</label><input type="number" min={1} value={x.min_qty} onChange={e => set({ min_qty: +e.target.value })} /></div>
      <div><label>Sort order</label><input type="number" value={x.sort} onChange={e => set({ sort: +e.target.value })} /></div></div>
      <label style={{display:"flex",gap:8,alignItems:"center"}}><input style={{width:"auto"}} type="checkbox" checked={x.active} onChange={e => set({ active: e.target.checked })} /> Show on the catering menu</label>
      <div style={{display:"flex",gap:8,marginTop:12}}><button style={sm} onClick={() => save(x)}>Save</button>{x.id && <button className="sec" style={sm} onClick={async () => { if (confirm("Delete this item? Past orders keep their copy.")) { await call({ action: "deleteItem", id: x.id }); location.reload(); } }}>Delete</button>}</div></div>; };
  return <>{msg && <div className="err">{msg}</div>}<p className="muted">Items marked off don't appear to customers. Prices apply to new orders only.</p>{m.map(row)}<button className="sec" style={sm} onClick={() => setM([...m, blank])}>Add item</button></>;
}
function Times({ settings }: any) {
  const [s, setS] = useState({ ...settings, blackoutText: (settings.blackout || []).join("\n") }); const [msg, setMsg] = useState("");
  const hours = (d: string, i: number, v: string) => setS({ ...s, hours: { ...s.hours, [d]: [i === 0 ? v : s.hours[d]?.[0] || "08:00", i === 1 ? v : s.hours[d]?.[1] || "16:00"] } });
  return <div className="card"><b>Pickup hours</b><p className="muted">Customers can pick any time slot inside these hours, subject to notice and capacity.</p>
    {days.map((n, d) => { const h = s.hours[String(d)]; return <div key={d} style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
      <label style={{margin:0,width:110,display:"flex",gap:6,alignItems:"center",fontWeight:400}}><input style={{width:"auto"}} type="checkbox" checked={!!h} onChange={e => setS({ ...s, hours: { ...s.hours, [d]: e.target.checked ? ["08:00", "16:00"] : null } })} />{n}</label>
      {h && <><input type="time" value={h[0]} onChange={e => hours(String(d), 0, e.target.value)} /><span>to</span><input type="time" value={h[1]} onChange={e => hours(String(d), 1, e.target.value)} /></>}</div>; })}
    <div className="two"><div><label>Minimum notice (hours)</label><input type="number" min={0} value={s.leadHours} onChange={e => setS({ ...s, leadHours: +e.target.value })} /></div>
      <div><label>Slot length</label><select value={s.slotMinutes} onChange={e => setS({ ...s, slotMinutes: +e.target.value })}><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={60}>60 minutes</option></select></div>
      <div><label>Orders per time slot</label><input type="number" min={1} value={s.maxPerSlot} onChange={e => setS({ ...s, maxPerSlot: +e.target.value })} /></div>
      <div><label>Minimum order ($)</label><input type="number" min={0} step="1" value={s.minOrderCents / 100} onChange={e => setS({ ...s, minOrderCents: Math.round(+e.target.value * 100) })} /></div>
      <div><label>How far ahead can they book (days)</label><input type="number" min={1} max={365} value={s.windowDays} onChange={e => setS({ ...s, windowDays: +e.target.value })} /></div>
      <div><label>Email new orders to</label><input type="email" value={s.notifyEmail} onChange={e => setS({ ...s, notifyEmail: e.target.value })} /></div></div>
    <label>Closed dates (one per line, YYYY-MM-DD)</label><textarea style={{width:"100%",minHeight:70,padding:10,fontSize:16,border:"1px solid #cfcdc5",borderRadius:8}} value={s.blackoutText} onChange={e => setS({ ...s, blackoutText: e.target.value })} />
    <label>Message shown to customers (payment terms, etc.)</label><input value={s.notice} onChange={e => setS({ ...s, notice: e.target.value })} />
    {msg && <div className={msg === "Saved" ? "ok" : "err"} style={{marginTop:10}}>{msg}</div>}
    <button onClick={async () => { const { blackoutText, ...rest } = s; const r: any = await call({ action: "saveSettings", settings: { ...rest, blackout: blackoutText.split(/\s+/).filter(Boolean) } }); setMsg(r.ok ? "Saved" : r.error); }}>Save pickup settings</button></div>;
}
