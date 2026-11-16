export const TZ = process.env.TZ_NAME || "America/Boise";
export const CUTOFF_HOUR = Number(process.env.CUTOFF_HOUR ?? 20);
const parts = (d: Date) => Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: TZ, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit" }).formatToParts(d).map(p => [p.type, p.value]));
export function localNow(d = new Date()) { const p: any = parts(d); return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) % 24 }; }
const addDays = (s: string, n: number) => { const d = new Date(s + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const dow = (s: string) => new Date(s + "T12:00:00Z").getUTCDay();
/** Days of the week lunches are fulfilled (0=Sun..6=Sat). Default Wednesday and Friday. */
export const FULFILLMENT_DAYS = (process.env.FULFILLMENT_DAYS || "3,5").split(",").map(Number);
/** How many calendar days before a fulfillment day ordering opens. 1 = only the day before. */
const OPEN_DAYS_AHEAD = Number(process.env.OPEN_DAYS_AHEAD ?? 1);
export const isFulfillmentDay = (s: string) => FULFILLMENT_DAYS.includes(dow(s));
export { addDays };
/** How many days ahead parents can order lunches. */
const ORDER_DAYS_AHEAD = Number(process.env.ORDER_DAYS_AHEAD ?? 28);
/** A lunch date takes orders any time until CUTOFF_HOUR on the evening before it. */
export function isOpenFor(date: string, d = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) return false;
  const n = localNow(d); const cutoffDay = addDays(date, -1);
  return isFulfillmentDay(date) && date <= addDays(n.date, ORDER_DAYS_AHEAD) && (n.date < cutoffDay || (n.date === cutoffDay && n.hour < CUTOFF_HOUR));
}
/** Upcoming fulfillment dates that can still be ordered right now. */
export function openDates(d = new Date()) {
  const n = localNow(d); const out: string[] = [];
  for (let i = 1; i <= ORDER_DAYS_AHEAD; i++) { const x = addDays(n.date, i); if (isOpenFor(x, d)) out.push(x); }
  return out;
}
/** Next fulfillment day after today's local date; open from OPEN_DAYS_AHEAD days before until CUTOFF_HOUR the evening before. */
export function orderWindow(d = new Date()) {
  const n = localNow(d);
  let target = addDays(n.date, 1);
  while (!isFulfillmentDay(target)) target = addDays(target, 1);
  const cutoffDay = addDays(target, -1);
  const opens = addDays(target, -OPEN_DAYS_AHEAD);
  const open = n.date >= opens && (n.date < cutoffDay || (n.date === cutoffDay && n.hour < CUTOFF_HOUR));
  return { target, open, cutoffDay, opens };
}
export const fmtDate = (s: string) => new Date(s + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
export const money = (c: number) => `$${(c / 100).toFixed(2)}`;
