"use client";
import { useState } from "react";
const SLOTS = [["07:00", "7:00 AM"], ["08:00", "8:00 AM"], ["11:00", "11:00 AM"], ["12:00", "12:00 PM"], ["13:00", "1:00 PM"]];
const PRICE = 9.5;
type Line = { person: string; option: "A" | "B"; meat: string; time: string };
export default function JacksonForm({ events }: { events: { id: number; companyId: number; company: string; date: string; label: string; note?: string }[] }) {
  const companies = Array.from(new Map(events.map(e => [e.companyId, e.company])).entries());
  const [cid, setCid] = useState<number | "">(companies[0]?.[0] ?? ""); const dates = events.filter(e => e.companyId === cid);
  const [eid, setEid] = useState<number | "">(dates[0]?.id ?? "");
  const blank = (): Line => ({ person: "", option: "A", meat: "Sausage", time: "08:00" });
  const [lines, setLines] = useState<Line[]>([blank()]); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false);
  if (!events.length) return <div className="card muted">No pickup dates are open for ordering right now. Check back after your company is scheduled.</div>;
  const set = (i: number, patch: Partial<Line>) => setLines(lines.map((l, j) => j === i ? { ...l, ...patch } : l));
  const ready = eid !== "" && lines.every(l => l.person.trim());
  const ev = events.find(e => e.id === eid);
  if (done) return <div className="ok">Order placed. A confirmation was emailed to you. <a href="/jackson">Place another</a></div>;
  return <>
    {err && <div className="err">{err}</div>}
    <div className="card"><label>Company</label>
      <select value={cid} onChange={e => { const c = +e.target.value; setCid(c); setEid(events.find(x => x.companyId === c)?.id ?? ""); }}>{companies.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select>
      <label>Pickup date</label>
      <select value={eid} onChange={e => setEid(+e.target.value)}>{dates.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}</select>
      {ev?.note && <div className="muted" style={{marginTop:8}}>{ev.note}</div>}</div>
    {lines.map((l, i) => <div className="card" key={i}><div className="row"><b>Burrito {i + 1}</b>{lines.length > 1 && <button className="sec" style={{width:"auto",marginTop:0,padding:"4px 10px",fontSize:14}} onClick={() => setLines(lines.filter((_, j) => j !== i))}>Remove</button>}</div>
      <label>Name for this order</label><input value={l.person} placeholder="Who is this for?" onChange={e => set(i, { person: e.target.value })} />
      <label className="opt"><input type="radio" checked={l.option === "A"} onChange={() => set(i, { option: "A" })} /><span><b>Option A: Veggie burrito</b><br /><small className="muted">Hashbrowns, eggs, cheese, peppers, onions</small></span><span>${PRICE.toFixed(2)}</span></label>
      <label className="opt"><input type="radio" checked={l.option === "B"} onChange={() => set(i, { option: "B" })} /><span><b>Option B: Meat burrito</b><br /><small className="muted">Sausage or bacon, eggs, cheese, hashbrowns</small></span><span>${PRICE.toFixed(2)}</span></label>
      {l.option === "B" && <><label>Meat</label><select value={l.meat} onChange={e => set(i, { meat: e.target.value })}><option>Sausage</option><option>Bacon</option></select></>}
      <label>Pickup time</label><select value={l.time} onChange={e => set(i, { time: e.target.value })}>{SLOTS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></div>)}
    <button className="sec" onClick={() => setLines([...lines, { ...blank(), time: lines[lines.length - 1].time }])}>Add another burrito</button>
    <button disabled={busy || !ready} onClick={async () => {
      if (!confirm("Orders are final once submitted. Payment is due at pickup. Place order?")) return; setBusy(true); setErr("");
      const r = await fetch("/api/jackson/orders", { method: "POST", body: JSON.stringify({ eventId: eid, items: lines.map(l => ({ person: l.person, option: l.option, meat: l.option === "B" ? l.meat : null, time: l.time })) }) }); const j = await r.json(); setBusy(false);
      r.ok ? setDone(true) : setErr(j.error); }}>Place Order — ${(lines.length * PRICE).toFixed(2)}</button>
    <p className="muted">Final once submitted. You pay at pickup; no card is charged online.</p>
  </>;
}
