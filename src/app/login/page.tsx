"use client";
import { useState } from "react";
export default function Login() {
  const [email, setEmail] = useState(""); const [msg, setMsg] = useState<any>(null); const [busy, setBusy] = useState(false);
  async function go(e: React.FormEvent) { e.preventDefault(); setBusy(true);
    const r = await fetch("/api/login", { method: "POST", body: JSON.stringify({ email }) }); setMsg(await r.json()); setBusy(false); }
  return <>
    <h1>FRX School Lunch</h1><p className="muted">Sign in with your email. We'll send you a link, no password needed.</p>
    <form className="card" onSubmit={go}>
      <label>Email</label><input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
      <button disabled={busy}>Email me a sign-in link</button>
      {msg?.ok && <div className="ok" style={{marginTop:12}}>Check your email for the link.{msg.devLink && <> Dev mode: <a href={msg.devLink}>open sign-in link</a></>}</div>}
    </form>
    <p className="muted"><a href="/reminders">Get an email when ordering opens</a> · <a href="/catering">FRX Catering for teams</a> · <a href="/admin">FRX staff login</a></p>
  </>;
}
