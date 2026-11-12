import { db } from "@/lib/db"; import { isAdmin } from "@/lib/auth"; import { sendMail } from "@/lib/mail"; import { money, fmtDate, fmtTime } from "@/lib/time";
export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Forbidden" }, { status: 403 });
  const b = await req.json(); const p = await db();
  switch (b.action) {
    case "saveItem": { const x = b.item; const v = [String(x.name || "").trim(), String(x.description || ""), String(x.category || "Entrees").trim() || "Entrees", Math.max(0, Math.round(Number(x.price_cents) || 0)), String(x.unit || "each"), Math.max(1, Math.floor(Number(x.min_qty) || 1)), !!x.active, Math.floor(Number(x.sort) || 0)];
      if (!v[0]) return Response.json({ error: "Name required" }, { status: 400 });
      if (x.id) await p.query("update catering_items set name=$1,description=$2,category=$3,price_cents=$4,unit=$5,min_qty=$6,active=$7,sort=$8 where id=$9", [...v, x.id]);
      else await p.query("insert into catering_items(name,description,category,price_cents,unit,min_qty,active,sort) values($1,$2,$3,$4,$5,$6,$7,$8)", v);
      return Response.json({ ok: true }); }
    case "deleteItem": await p.query("delete from catering_items where id=$1", [b.id]); return Response.json({ ok: true });
    case "saveSettings": { const s = b.settings; const num = (v: any, d: number, min = 0) => Math.max(min, Math.floor(Number(v)) || d);
      const clean = { leadHours: num(s.leadHours, 48), minOrderCents: num(s.minOrderCents, 0), slotMinutes: [15, 30, 60].includes(Number(s.slotMinutes)) ? Number(s.slotMinutes) : 30, maxPerSlot: num(s.maxPerSlot, 1, 1), windowDays: Math.min(365, num(s.windowDays, 60, 1)),
        blackout: (s.blackout || []).filter((d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d)), notifyEmail: /^\S+@\S+$/.test(s.notifyEmail) ? s.notifyEmail : "admin@frxskishq.com", notice: String(s.notice || "").slice(0, 600),
        hours: Object.fromEntries(Object.keys(s.hours).map(k => [k, s.hours[k] && /^\d\d:\d\d$/.test(s.hours[k][0]) && /^\d\d:\d\d$/.test(s.hours[k][1]) && s.hours[k][0] < s.hours[k][1] ? s.hours[k] : null])) };
      await p.query("insert into catering_settings values(1,$1) on conflict(id) do update set data=excluded.data", [JSON.stringify(clean)]); return Response.json({ ok: true }); }
    case "setStatus": {
      if (!["requested", "confirmed", "completed", "cancelled"].includes(b.status)) return Response.json({ error: "Bad status" }, { status: 400 });
      const r = await p.query("update catering_orders set status=$2 where id=$1 returning *", [b.id, b.status]); const o = r.rows[0]; if (!o) return Response.json({ error: "Not found" }, { status: 404 });
      const ref = `FRX-C-${1000 + o.id}`; const when = `${fmtDate(o.pickup_date)} at ${fmtTime(o.pickup_time)} Mountain Time`;
      if (b.notify && (b.status === "confirmed" || b.status === "cancelled")) await sendMail(o.email, `FRX Catering order ${ref} ${b.status}`, b.status === "confirmed"
        ? `Hi ${o.contact_name}, your catering order ${ref} is confirmed.\n\nPickup: ${when}\nSubtotal: ${money(o.subtotal_cents)}\n\nQuestions: admin@frxskishq.com` : `Hi ${o.contact_name}, your catering order ${ref} for ${when} has been cancelled. Questions: admin@frxskishq.com`);
      return Response.json({ ok: true }); }
  }
  return Response.json({ error: "Bad request" }, { status: 400 });
}
