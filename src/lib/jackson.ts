import { db } from "./db"; import { localNow, addDays, fmtDate, money } from "./time"; import { sendMail } from "./mail";
/** FRX Jackson WY: catered breakfast/lunch burritos for contracted companies, picked up and paid for at pickup. */
import { JACKSON_SLOTS } from "./jackson-slots"; export { JACKSON_SLOTS };
export const slotLabel = (id: string) => JACKSON_SLOTS.find(s => s.id === id)?.label ?? id;
export const BURRITO_PRICE_CENTS = 950;
export const JACKSON_MENU = [
  { id: "A", name: "Veggie Burrito", description: "Hashbrowns, eggs, cheese, peppers, onions", meats: [] as string[] },
  { id: "B", name: "Meat Burrito", description: "Sausage or bacon, eggs, cheese, hashbrowns", meats: ["Sausage", "Bacon"] },
] as const;
/** Orders for a pickup date are final at this hour (Mountain) two days before pickup. */
export const JACKSON_CUTOFF_HOUR = 20; export const JACKSON_CUTOFF_DAYS_BEFORE = 2;
export const jacksonCutoffDay = (pickup: string) => addDays(pickup, -JACKSON_CUTOFF_DAYS_BEFORE);
export function jacksonOpen(pickup: string, d = new Date()) { const n = localNow(d); const c = jacksonCutoffDay(pickup); return n.date < c || (n.date === c && n.hour < JACKSON_CUTOFF_HOUR); }
export const jacksonClosed = (pickup: string, d = new Date()) => !jacksonOpen(pickup, d);
export const itemLabel = (option: string, meat?: string | null) => option === "A" ? "Veggie Burrito" : `Meat Burrito (${meat || "Sausage"})`;

/** Creates an invoice for every pickup whose cutoff has passed, that has orders and no invoice yet. Safe to call repeatedly. */
export async function generateDueInvoices() {
  const p = await db(); const made: number[] = [];
  const evs = (await p.query("select e.id, e.pickup_date::text d from jackson_events e where not exists (select 1 from jackson_invoices i where i.event_id=e.id) and exists (select 1 from jackson_orders o where o.event_id=e.id)")).rows;
  for (const e of evs) { if (!jacksonClosed(e.d)) continue;
    const r = await p.query("insert into jackson_invoices(event_id, total_cents) select $1, coalesce(sum(price_cents),0) from jackson_orders where event_id=$1 on conflict(event_id) do nothing returning id, total_cents", [e.id]);
    if (!r.rowCount) continue; made.push(r.rows[0].id);
    const c = (await p.query("select c.name, c.contact_email from jackson_events e join jackson_companies c on c.id=e.company_id where e.id=$1", [e.id])).rows[0];
    if (c?.contact_email) await sendMail(c.contact_email, `FRX Jackson invoice #${r.rows[0].id} for ${fmtDate(e.d)} pickup`, `Orders for ${c.name} are final. Invoice #${r.rows[0].id}: ${money(r.rows[0].total_cents)}, due at pickup on ${fmtDate(e.d)}. Full details: ${process.env.SITE_URL || ""}/admin/jackson/event/${e.id}`);
  }
  return made;
}
