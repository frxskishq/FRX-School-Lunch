"use client";
import { useState } from "react"; import { SCHOOLS } from "@/lib/schools";
export default function Reminders() {
  const [email, setEmail] = useState(""); const [done, setDone] = useState(false); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [picked, setPicked] = useState<string[]>([]);
  const status = typeof window !== "undefined" ? new URLSearchParams(location.search).get("status") : null;
  const notes: Record<string, string> = { confirmed: "You're signed up. We'll email you every Monday at 8 AM.", unsubscribed: "You've been unsubscribed. No more reminders.", invalid: "That link is no longer valid. Sign up again below." };
  async function go(e: React.FormEvent) { e.preventDefault(); setBusy(true); setErr("");
    const r = await fetch("/api/reminders/subscribe", { method: "POST", body: JSON.stringify({ email, schools: picked }) }); const j = await r.json(); setBusy(false); r.ok ? setDone(true) : setErr(j.error); }
  return <>
    <h1>FRX Lunch reminders</h1><p className="muted">Get one email every Monday at 8 AM reminding you to order lunches for the week. Orders close at 8 PM the night before each lunch day.</p>
    {status && notes[status] && <div className={status === "invalid" ? "err" : "ok"}>{notes[status]}</div>}
    {done ? <div className="ok">Check your email and tap the confirmation link to finish signing up.</div> :
    <form className="card" onSubmit={go}><label>Which school(s)?</label>{SCHOOLS.map(s => <label key={s.id} className="opt"><input type="checkbox" checked={picked.includes(s.id)} onChange={e => setPicked(e.target.checked ? [...picked, s.id] : picked.filter(x => x !== s.id))} /><span>{s.name} ({s.dayName}s)</span></label>)}<label>Email</label><input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
      {err && <div className="err" style={{marginTop:8}}>{err}</div>}<button disabled={busy || !picked.length}>Sign me up</button></form>}
    <p className="muted"><a href="/login">Go to ordering</a></p>
  </>;
}
