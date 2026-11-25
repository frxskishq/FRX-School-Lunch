"use client";
import { useState } from "react";
const call = (b: any) => fetch("/api/admin/jackson", { method: "POST", body: JSON.stringify(b) }).then(async r => ({ ok: r.ok, ...(await r.json()) }));
import { JACKSON_SLOTS } from "@/lib/jackson-slots";
const sec = { width: "auto", marginTop: 0, padding: "6px 12px", fontSize: 14 } as const;
export function useRun() { const [err, setErr] = useState(""); return { err, run: async (b: any, ask?: string) => { if (ask && !confirm(ask)) return; const r: any = await call(b); r.ok ? location.reload() : setErr(r.error); }, setErr }; }
export function CompanyEditor({ c }: { c?: any }) {
  const [v, setV] = useState(c || { name: "", contact_name: "", contact_email: "", phone: "", notes: "", active: true }); const { err, run } = useRun();
  const f = (k: string, ph: string) => <input placeholder={ph} value={v[k] ?? ""} onChange={e => setV({ ...v, [k]: e.target.value })} style={{ margin: "4px 0" }} />;
  return <div className="card"><b>{c ? c.name : "Add a company"}</b>{err && <div className="err">{err}</div>}
    {f("name", "Company name")}{f("contact_name", "Contact name")}{f("contact_email", "Contact email (invoice is sent here)")}{f("phone", "Phone")}{f("notes", "Notes")}
    {c && <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input style={{ width: "auto" }} type="checkbox" checked={v.active} onChange={e => setV({ ...v, active: e.target.checked })} />Active (shown in the ordering dropdown)</label>}
    <button disabled={!v.name.trim()} onClick={() => run({ action: "saveCompany", ...v })}>{c ? "Save" : "Add company"}</button></div>;
}
export function EventAdder({ companies }: { companies: any[] }) {
  const [cid, setCid] = useState(companies[0]?.id ?? ""); const [d, setD] = useState(""); const [time, setTime] = useState("08:00"); const [note, setNote] = useState(""); const { err, run } = useRun();
  return <div className="card"><b>Schedule a pickup date</b>{err && <div className="err">{err}</div>}
    <label>Company</label><select value={cid} onChange={e => setCid(+e.target.value)}>{companies.filter(c => c.active).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
    <label>Pickup date</label><input type="date" value={d} onChange={e => setD(e.target.value)} />
    <label>Pickup time</label><select value={time} onChange={e => setTime(e.target.value)}>{JACKSON_SLOTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
    <label>Note shown to customers (optional)</label><input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Pickup at the Jackson kitchen" />
    <button disabled={!cid || !d} onClick={() => run({ action: "addEvent", companyId: cid, date: d, time, note })}>Add pickup date</button></div>;
}
export function Actions({ kind, id, paid, date, time, note }: { kind: "event" | "invoice" | "order"; id: number; paid?: boolean; date?: string; time?: string; note?: string }) {
  const { err, run } = useRun(); const [d, setD] = useState(date || ""); const [tm, setTm] = useState(time || "08:00"); const [n, setN] = useState(note || "");
  return <span className="noprint">{err && <span className="err">{err} </span>}
    {kind === "event" && <><input type="date" value={d} onChange={e => setD(e.target.value)} style={{ width: 150, padding: 6, margin: 0 }} /> <select value={tm} onChange={e => setTm(e.target.value)} style={{ width: 110, padding: 6, margin: 0 }}>{JACKSON_SLOTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select> <input value={n} placeholder="note" onChange={e => setN(e.target.value)} style={{ width: 150, padding: 6, margin: 0 }} /> <button className="sec" style={{ ...sec, display: "inline-block" }} disabled={d === date && tm === time && n === (note || "")} onClick={() => run({ action: "updateEvent", id, date: d, time: tm, note: n })}>Save</button> <button className="sec" style={{ ...sec, display: "inline-block" }} onClick={() => run({ action: "deleteEvent", id }, "Delete this pickup date?")}>Delete</button></>}
    {kind === "invoice" && <button className="sec" style={{ ...sec, display: "inline-block" }} onClick={() => run({ action: "markPaid", id, paid: !paid })}>{paid ? "Mark unpaid" : "Mark paid"}</button>}
    {kind === "order" && <button className="sec" style={{ ...sec, display: "inline-block" }} onClick={() => run({ action: "deleteOrder", id }, "Remove this order?")}>Remove</button>}</span>;
}
export function GenerateButton() { const { run } = useRun(); return <button className="sec" style={{ ...sec, display: "inline-block" }} onClick={() => run({ action: "generateInvoices" })}>Generate due invoices now</button>; }
