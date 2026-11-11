"use client";
import { useEffect, useState } from "react";
function CardBox({ sq, onSaved, setErr }: any) {
  const [card, setCard] = useState<any>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { let c: any; (async () => {
    if (!(window as any).Square) await new Promise((res, rej) => { const s = document.createElement("script"); s.src = sq.scriptUrl; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    const payments = (window as any).Square.payments(sq.appId, sq.locationId); c = await payments.card(); await c.attach("#card-container"); setCard(c);
  })().catch(() => setErr("Could not load the card form")); return () => { c?.destroy?.(); }; }, []);
  return <><div id="card-container" style={{ marginTop: 12, minHeight: 90 }} />
    <button disabled={!card || busy} onClick={async () => { setBusy(true); setErr("");
      const t = await card.tokenize(); if (t.status !== "OK") { setErr(t.errors?.[0]?.message || "Card declined"); setBusy(false); return; }
      const r = await fetch("/api/orders", { method: "POST", body: JSON.stringify({ action: "card", sourceId: t.token }) }); const j = await r.json();
      if (!r.ok) { setErr(j.error); setBusy(false); } else onSaved(); }}>Save card</button></>;
}
export default function OrderForm({ students, menu, hasCard, open, sq }: any) {
  const [sel, setSel] = useState<Record<number, number>>({}); const [name, setName] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const total = Object.values(sel).reduce((a: number, id) => a + menu.find((m: any) => m.id === id).price_cents, 0);
  async function post(body: any) { setBusy(true); setErr(""); const r = await fetch("/api/orders", { method: "POST", body: JSON.stringify(body) }); const j = await r.json(); setBusy(false); if (!r.ok) { setErr(j.error); return false; } return true; }
  const refresh = () => location.reload();
  return <>
    {err && <div className="err">{err}</div>}
    {!hasCard && <div className="card"><b>Step 1: Add a card</b><p className="muted">Your card is charged once a month for all lunches. Only Square's secure card reference is stored.</p>
      {sq ? <CardBox sq={sq} onSaved={refresh} setErr={setErr} /> : <button disabled={busy} onClick={async () => (await post({ action: "card" })) && refresh()}>Add card (demo)</button>}</div>}
    <div className="card"><b>{students.length ? "Students" : "Add your student"}</b>
      <div style={{display:"flex",gap:8}}><input placeholder="Student name" value={name} onChange={e => setName(e.target.value)} />
      <button className="sec" style={{width:"auto",marginTop:0,padding:"0 16px"}} disabled={busy || !name.trim()} onClick={async () => (await post({ action: "student", name })) && refresh()}>Add</button></div></div>
    {open && hasCard && students.map((s: any) => <div className="card" key={s.id}><b>{s.name}</b>
      {menu.map((m: any) => <label key={m.id} className="opt"><input type="radio" name={"s" + s.id} checked={sel[s.id] === m.id} onChange={() => setSel({ ...sel, [s.id]: m.id })} /><span><b>{m.name}</b><br /><small className="muted">{m.description}</small></span><span>${(m.price_cents / 100).toFixed(2)}</span></label>)}
      {sel[s.id] && <button className="sec" style={{marginTop:4,padding:8,fontSize:14}} onClick={() => { const n = { ...sel }; delete n[s.id]; setSel(n); }}>No lunch</button>}</div>)}
    {open && hasCard && students.length > 0 && <>
      <button disabled={busy || done || !total} onClick={async () => { if (!confirm("Orders are final once submitted. No edits or cancellations. Place order?")) return;
        if (await post({ action: "order", items: Object.entries(sel).map(([s, m]) => ({ studentId: +s, menuItemId: m })) })) { setDone(true); refresh(); } }}>Place Order — ${(total / 100).toFixed(2)}</button>
      <p className="muted">Final once submitted. Billed to your card at month-end.</p></>}
  </>;
}
