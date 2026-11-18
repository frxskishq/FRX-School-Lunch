import { redirect } from "next/navigation"; import { db } from "@/lib/db"; import { parentId } from "@/lib/auth"; import { SCHOOLS } from "@/lib/schools";
export const dynamic = "force-dynamic";
export default async function Home() {
  const fid = await parentId(); if (!fid) redirect("/login");
  const f = (await (await db()).query("select email from families where id=$1", [fid])).rows[0]; if (!f) redirect("/login");
  return <>
    <div className="row"><div><h1>FRX School Lunch</h1><div className="muted">{f.email}</div></div>
      <form action="/api/logout" method="post"><button className="sec" style={{width:"auto",marginTop:0,padding:"6px 12px",fontSize:14}}>Sign out</button></form></div>
    <div className="card"><h2 style={{margin:0}}>Which school are you ordering for?</h2><div className="muted">Each school has its own lunch day.</div></div>
    {SCHOOLS.map(s => <a key={s.id} href={`/order/${s.id}`} className="card" style={{display:"block",textDecoration:"none",color:"inherit"}}>
      <b style={{fontSize:18}}>{s.name}</b><div className="muted">Lunch delivered on {s.dayName}s</div></a>)}
  </>;
}
