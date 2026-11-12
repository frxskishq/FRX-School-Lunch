import { db } from "@/lib/db"; import { getSlots } from "@/lib/catering"; import { money } from "@/lib/time"; import CateringForm from "./CateringForm";
export const dynamic = "force-dynamic"; export const metadata = { title: "FRX Catering" };
export default async function Catering() {
  const p = await db(); const items = (await p.query("select * from catering_items where active order by sort, id")).rows; const { slots, settings } = await getSlots();
  return <div className="cwrap">
    <div className="chero"><h1>FRX Catering</h1><p>Team lunches for crews, offices and job sites. Choose your menu, pick a pickup time, and we'll confirm by email.</p>
      <div className="pills"><span className="pill">{settings.leadHours} hours notice</span><span className="pill">Orders from {money(settings.minOrderCents)}</span><span className="pill">Invoiced after pickup</span></div></div>
    {items.length ? <CateringForm items={items} slots={slots} settings={settings} /> : <div className="card"><b>Our catering menu is being updated.</b><p className="muted">Email admin@frxskishq.com and we'll put your order together.</p></div>}
    <p className="muted" style={{marginTop:24}}><a href="/login">School lunch ordering</a></p></div>;
}
