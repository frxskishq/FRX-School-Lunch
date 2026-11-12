import { db } from "@/lib/db"; import { getSlots, getSettings } from "@/lib/catering"; import { sendMail } from "@/lib/mail"; import { money, fmtDate, fmtTime } from "@/lib/time";
const bad = (error: string) => Response.json({ error }, { status: 400 });
export async function POST(req: Request) {
  const b = await req.json();
  if (b.website) return Response.json({ ok: true, ref: "FRX-C-0000" }); // honeypot: bots fill this hidden field
  const company = String(b.company || "").trim().slice(0, 120), name = String(b.contactName || "").trim().slice(0, 120), email = String(b.email || "").trim().toLowerCase().slice(0, 160),
    phone = String(b.phone || "").trim().slice(0, 40), notes = String(b.notes || "").trim().slice(0, 1500), headcount = b.headcount ? Math.min(5000, Math.max(1, Math.floor(Number(b.headcount)))) : null;
  if (!company || !name || !phone) return bad("Company, contact name and phone are required");
  if (!/^\S+@\S+\.\S+$/.test(email)) return bad("Enter a valid email");
  const p = await db(); const st = await getSettings();
  const ids = (b.items || []).map((i: any) => Number(i.id)); const qtys: Record<number, number> = {}; (b.items || []).forEach((i: any) => { const q = Math.floor(Number(i.qty)); if (q > 0) qtys[Number(i.id)] = Math.min(q, 5000); });
  const items = (await p.query("select * from catering_items where active and id = any($1)", [ids])).rows.filter((r: any) => qtys[r.id]);
  if (!items.length) return bad("Add at least one item");
  for (const it of items) if (qtys[it.id] < it.min_qty) return bad(`${it.name} has a minimum of ${it.min_qty}`);
  const subtotal = items.reduce((a: number, it: any) => a + it.price_cents * qtys[it.id], 0);
  if (subtotal < st.minOrderCents) return bad(`The minimum order is ${money(st.minOrderCents)}`);
  const c = await p.connect();
  try {
    await c.query("begin"); await c.query("select pg_advisory_xact_lock(7001)"); // serialize so two teams can't take the last slot
    const avail = await getSlots(); const day = avail.slots.find(s => s.date === b.pickupDate); const slot = day?.times.find(t => t.t === b.pickupTime);
    if (!slot) { await c.query("rollback"); return bad("That pickup time is no longer available. Please choose another."); }
    const o = (await c.query("insert into catering_orders(company,contact_name,email,phone,headcount,pickup_date,pickup_time,notes,subtotal_cents) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id", [company, name, email, phone, headcount, b.pickupDate, b.pickupTime, notes, subtotal])).rows[0];
    for (const it of items) await c.query("insert into catering_order_items(order_id,item_name,price_cents,qty) values($1,$2,$3,$4)", [o.id, it.name, it.price_cents, qtys[it.id]]);
    await c.query("commit");
    const ref = `FRX-C-${1000 + o.id}`; const lines = items.map((it: any) => `${qtys[it.id]} x ${it.name} (${it.unit}) @ ${money(it.price_cents)} = ${money(it.price_cents * qtys[it.id])}`);
    const when = `${fmtDate(b.pickupDate)} at ${fmtTime(b.pickupTime)} Mountain Time`;
    const body = [`Order ${ref}`, `Company: ${company}`, `Contact: ${name}, ${phone}, ${email}`, headcount ? `Headcount: ${headcount}` : "", `Pickup: ${when}`, "", ...lines, "", `Subtotal: ${money(subtotal)} (plus any applicable tax)`, notes ? `\nNotes: ${notes}` : ""].filter(x => x !== "").join("\n");
    await sendMail(email, `FRX Catering request ${ref} received`, `Thank you, ${name}. We received your catering request.\n\n${body}\n\n${st.notice}\nTo change or cancel, contact admin@frxskishq.com.`);
    await sendMail(st.notifyEmail, `New catering order ${ref}: ${company}`, `${body}\n\nReview it at /admin/catering`, { footer: false });
    return Response.json({ ok: true, ref, when, subtotal });
  } catch (e) { await c.query("rollback").catch(() => {}); console.error(e); return Response.json({ error: "Something went wrong. Please try again or email admin@frxskishq.com." }, { status: 500 }); } finally { c.release(); }
}
