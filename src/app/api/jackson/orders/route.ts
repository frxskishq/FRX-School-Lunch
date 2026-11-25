import { db } from "@/lib/db"; import { parentId } from "@/lib/auth"; import { fmtDate, money } from "@/lib/time"; import { sendMail } from "@/lib/mail";
import { JACKSON_SLOTS, JACKSON_MENU, BURRITO_PRICE_CENTS, jacksonOpen, slotLabel, itemLabel } from "@/lib/jackson";
export async function POST(req: Request) {
  const fid = await parentId(); if (!fid) return Response.json({ error: "Not signed in" }, { status: 401 });
  const b = await req.json(); const p = await db();
  const ev = (await p.query("select e.id, e.pickup_date::text d, c.name cname, c.active from jackson_events e join jackson_companies c on c.id=e.company_id where e.id=$1", [Number(b.eventId)])).rows[0];
  if (!ev || !ev.active) return Response.json({ error: "Choose a company and pickup date" }, { status: 400 });
  if (!jacksonOpen(ev.d)) return Response.json({ error: "Ordering is closed for " + fmtDate(ev.d) }, { status: 400 });
  const items: any[] = Array.isArray(b.items) ? b.items : []; if (!items.length || items.length > 50) return Response.json({ error: "Add at least one burrito" }, { status: 400 });
  const rows: { person: string; option: string; meat: string | null; time: string }[] = [];
  for (const i of items) {
    const person = String(i.person || "").trim().slice(0, 80); const m = JACKSON_MENU.find(x => x.id === i.option);
    if (!person) return Response.json({ error: "Enter a name for each order" }, { status: 400 });
    if (!m) return Response.json({ error: "Invalid option" }, { status: 400 });
    if (!JACKSON_SLOTS.some(s => s.id === i.time)) return Response.json({ error: "Invalid pickup time" }, { status: 400 });
    const meat = m.meats.length ? (m.meats as readonly string[]).find(x => x === i.meat) : null; if (m.meats.length && !meat) return Response.json({ error: "Choose sausage or bacon" }, { status: 400 });
    rows.push({ person, option: m.id, meat: meat ?? null, time: i.time });
  }
  const c = await p.connect();
  try { await c.query("begin"); for (const r of rows) await c.query("insert into jackson_orders(event_id,family_id,person,option,meat,pickup_time,price_cents) values($1,$2,$3,$4,$5,$6,$7)", [ev.id, fid, r.person, r.option, r.meat, r.time, BURRITO_PRICE_CENTS]); await c.query("commit"); }
  catch (e: any) { await c.query("rollback"); return Response.json({ error: "Could not save order" }, { status: 500 }); } finally { c.release(); }
  const f = (await p.query("select email from families where id=$1", [fid])).rows[0];
  await sendMail(f.email, `FRX Jackson order for ${fmtDate(ev.d)} (${ev.cname})`, rows.map(r => `${r.person}: ${itemLabel(r.option, r.meat)}, pickup ${slotLabel(r.time)}`).join("\n") + `\nTotal ${money(rows.length * BURRITO_PRICE_CENTS)}, paid at pickup. Orders are final.`);
  return Response.json({ ok: true });
}
