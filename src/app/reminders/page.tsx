"use client";
import { useState } from "react";
export default function Reminders() {
  const [email, setEmail] = useState(""); const [done, setDone] = useState(false); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const status = typeof window !== "undefined" ? new URLSearchParams(location.search).get("status") : null;
  const notes: Record<string, string> = { confirmed: "You're signed up. We'll email you when ordering opens.", unsubscribed: "You've been unsubscribed. No more reminders.", invalid: "That link is no longer valid. Sign up again below." };
  async function go(e: React.FormEvent) { e.preventDefault(); setBusy(true); setErr("");
    const r = await fetch("/api/reminders/subscribe", { method: "POST", body: JSON.stringify({ email }) }); const j = await r.json(); setBusy(false); r.ok ? setDone(true) : setErr(j.error); }
  return <>
    <h1>FRX Lunch reminders</h1><p className="muted">Get one email when ordering opens for the next lunch day (Wednesdays and Fridays). Orders close at 8 PM the night before.</p>
    {status && notes[status] && <div className={status === "invalid" ? "err" : "ok"}>{notes[status]}</div>}
    {done ? <div className="ok">Check your email and tap the confirmation link to finish signing up.</div> :
    <form className="card" onSubmit={go}><label>Email</label><input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
      {err && <div className="err" style={{marginTop:8}}>{err}</div>}<button disabled={busy}>Sign me up</button></form>}
    <p className="muted"><a href="/login">Go to ordering</a></p>
  </>;
}
