"use client";
import { useMemo, useState } from "react";
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
export default function CateringForm({ items, slots, settings }: any) {
  const [qty, setQty] = useState<Record<number, number>>({}); const [date, setDate] = useState(""); const [time, setTime] = useState("");
  const [f, setF] = useState<any>({ company: "", contactName: "", email: "", phone: "", headcount: "", notes: "", website: "" }); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [done, setDone] = useState<any>(null);
  const cats = useMemo(() => { const m: Record<string, any[]> = {}; items.forEach((i: any) => (m[i.category] ||= []).push(i)); return m; }, [items]);
  const chosen = items.filter((i: any) => (qty[i.id] || 0) > 0); const subtotal = chosen.reduce((a: number, i: any) => a + i.price_cents * qty[i.id], 0);
  const set = (id: number, q: number) => setQty({ ...qty, [id]: Math.max(0, Math.min(5000, q || 0)) });
  const day = slots.find((s: any) => s.date === date); const set_ = (k: string, v: string) => setF({ ...f, [k]: v });
  const short = settings.minOrderCents - subtotal;
  async function submit(e: React.FormEvent) { e.preventDefault(); setErr(""); if (!chosen.length) return setErr("Add at least one item"); if (!date || !time) return setErr("Choose a pickup date and time");
    setBusy(true); const r = await fetch("/api/catering/order", { method: "POST", body: JSON.stringify({ ...f, pickupDate: date, pickupTime: time, items: chosen.map((i: any) => ({ id: i.id, qty: qty[i.id] })) }) }); const j = await r.json(); setBusy(false); r.ok ? setDone(j) : setErr(j.error); }
  if (done) return <div className="card" style={{textAlign:"center",padding:32}}><h1>Request received</h1><p>Your reference is <b>{done.ref}</b>.</p><p>Pickup: <b>{done.when}</b><br />Subtotal: <b>{money(done.subtotal)}</b></p><p className="muted">A confirmation was sent to {f.email}. {settings.notice}</p></div>;
  return <form onSubmit={submit} className="cgrid"><div>
    <div className="step">Step 1</div><h2 style={{margin:"0 0 4px"}}>Build your order</h2>
    {Object.entries(cats).map(([c, list]: any) => <div className="card" key={c}><b>{c}</b>{list.map((i: any) => <div className="citem" key={i.id}>
      <div className="d"><b style={{fontWeight:600}}>{i.name}</b><small>{i.description}</small><small>{money(i.price_cents)} {i.unit}{i.min_qty > 1 ? ` · minimum ${i.min_qty}` : ""}</small></div>
      <div className="qty"><button type="button" aria-label="less" onClick={() => set(i.id, (qty[i.id] || 0) - (qty[i.id] > i.min_qty ? 1 : qty[i.id]))}>-</button>
        <input inputMode="numeric" value={qty[i.id] || ""} placeholder="0" onChange={e => set(i.id, parseInt(e.target.value.replace(/\D/g, "")))} />
        <button type="button" aria-label="more" onClick={() => set(i.id, (qty[i.id] || 0) === 0 ? i.min_qty : qty[i.id] + 1)}>+</button></div></div>)}</div>)}
    <div className="step">Step 2</div><h2 style={{margin:"0 0 4px"}}>Pickup date and time</h2>
    <div className="card">{!slots.length ? <span className="muted">No pickup times are open right now. Email admin@frxskishq.com.</span> : <>
      <label style={{marginTop:0}}>Date (we need {settings.leadHours} hours notice)</label>
      <div className="chips">{slots.slice(0, 21).map((s: any) => <button type="button" key={s.date} className={"chip" + (s.date === date ? " on" : "")} onClick={() => { setDate(s.date); setTime(""); }}>{s.label.replace(/^(\w{3})\w*, (\w{3})\w* (\d+)$/, "$1, $2 $3")}</button>)}</div>
      {day && <><label>Time (Mountain)</label><div className="chips">{day.times.map((t: any) => <button type="button" key={t.t} className={"chip" + (t.t === time ? " on" : "")} onClick={() => setTime(t.t)}>{t.label}</button>)}</div></>}</>}</div>
    <div className="step">Step 3</div><h2 style={{margin:"0 0 4px"}}>Your team</h2>
    <div className="card"><div className="two">
      <div><label style={{marginTop:0}}>Company</label><input required value={f.company} onChange={e => set_("company", e.target.value)} autoComplete="organization" /></div>
      <div><label style={{marginTop:0}}>Contact name</label><input required value={f.contactName} onChange={e => set_("contactName", e.target.value)} autoComplete="name" /></div>
      <div><label>Email</label><input type="email" required value={f.email} onChange={e => set_("email", e.target.value)} autoComplete="email" /></div>
      <div><label>Phone</label><input type="tel" required value={f.phone} onChange={e => set_("phone", e.target.value)} autoComplete="tel" /></div>
      <div><label>Number of people (optional)</label><input inputMode="numeric" value={f.headcount} onChange={e => set_("headcount", e.target.value.replace(/\D/g, ""))} /></div></div>
      <label>Notes: allergies, delivery instructions, anything else</label><input value={f.notes} onChange={e => set_("notes", e.target.value)} />
      <div className="hp" aria-hidden="true"><label>Website</label><input tabIndex={-1} autoComplete="off" value={f.website} onChange={e => set_("website", e.target.value)} /></div></div>
  </div>
  <div className="csum card"><b>Order summary</b>
    {chosen.length ? chosen.map((i: any) => <div className="sumrow" key={i.id}><span>{qty[i.id]} x {i.name}</span><span>{money(i.price_cents * qty[i.id])}</span></div>) : <p className="muted">Nothing added yet.</p>}
    <div className="sumrow sumtot"><span>Subtotal</span><span>{money(subtotal)}</span></div>
    {chosen.length > 0 && short > 0 && <div className="muted" style={{marginTop:6}}>Minimum order {money(settings.minOrderCents)}. Add {money(short)} more.</div>}
    {date && time && <div className="muted" style={{marginTop:8}}>Pickup {day?.label} at {day?.times.find((t: any) => t.t === time)?.label}</div>}
    {err && <div className="err" style={{marginTop:10}}>{err}</div>}
    <button disabled={busy || (chosen.length > 0 && short > 0)}>Submit order request</button>
    <p className="muted" style={{marginTop:10}}>{settings.notice}</p></div></form>;
}
