import { redirect, notFound } from "next/navigation"; import { schoolById } from "@/lib/schools"; import { db } from "@/lib/db"; import { parentId } from "@/lib/auth";
import { openDates, fmtDate, money, CUTOFF_HOUR } from "@/lib/time"; import { squareConfigured, squareScriptUrl } from "@/lib/square"; import OrderForm from "../../OrderForm";
export const dynamic = "force-dynamic";
export default async function Order({ params }: { params: Promise<{ school: string }> }) {
  const school = schoolById((await params).school); if (!school) notFound();
  const fid = await parentId(); if (!fid) redirect("/login");
  const p = await db(); const dates = openDates(new Date(), [school.day]).map(d => ({ date: d, label: fmtDate(d) }));
  const f = (await p.query("select * from families where id=$1", [fid])).rows[0]; if (!f) redirect("/login");
  const students = (await p.query("select * from students where family_id=$1 and school=$2 order by id", [fid, school.id])).rows;
  const menu = (await p.query("select * from menu_items where active order by id")).rows;
  const orders = (await p.query("select o.*, s.name student from orders o join students s on s.id=o.student_id where o.family_id=$1 and o.school=$2 order by lunch_date desc, o.id desc limit 30", [fid, school.id])).rows;
  const month = (await p.query("select coalesce(sum(price_cents),0)::int t from orders where family_id=$1 and billed_at is null", [fid])).rows[0].t;
  const hr = CUTOFF_HOUR % 12 || 12, ap = CUTOFF_HOUR >= 12 ? "PM" : "AM";
  return <>
    <div className="row"><div><h1>FRX School Lunch</h1><div className="muted">{f.email} · {school.name} · <a href="/">Change school</a></div></div>
      <form action="/api/logout" method="post"><button className="sec" style={{width:"auto",marginTop:0,padding:"6px 12px",fontSize:14}}>Sign out</button></form></div>
    <div className="card"><h2 style={{margin:0}}>Order {school.dayName} lunch for {school.name}</h2>
      <div className="muted">{dates.length ? `Pick a lunch date. Orders for each lunch close ${hr}:00 ${ap} Mountain Time the night before.` : `No ${school.dayName} lunch dates are open for ordering right now.`}</div></div>
    <OrderForm school={school.id} students={students} menu={menu} hasCard={!!f.square_card_id} dates={dates} sq={squareConfigured() ? { appId: process.env.SQUARE_APPLICATION_ID, locationId: process.env.SQUARE_LOCATION_ID, scriptUrl: squareScriptUrl() } : null} />
    <h2>Your orders</h2><div className="muted">Unbilled balance this month: <b>{money(month)}</b></div>
    <div className="card">{orders.length ? <table><tbody>{orders.map((o: any) => <tr key={o.id}><td>{fmtDate(o.lunch_date)}</td><td>{o.student}</td><td>{o.item_name}</td><td>{money(o.price_cents)}</td></tr>)}</tbody></table> : <span className="muted">No orders yet.</span>}</div>
  </>;
}
