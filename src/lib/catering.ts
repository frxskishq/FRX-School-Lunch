import { db, DEFAULT_CATERING } from "./db"; import { localClock, addDays, fmtDate, fmtTime } from "./time";
export type CSettings = typeof DEFAULT_CATERING;
export async function getSettings(): Promise<CSettings> { const p = await db(); const r = await p.query("select data from catering_settings where id=1"); return { ...DEFAULT_CATERING, ...(r.rows[0]?.data || {}) }; }
const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const dow = (s: string) => new Date(s + "T12:00:00Z").getUTCDay();
const dayNum = (s: string) => Math.floor(new Date(s + "T00:00:00Z").getTime() / 86400000);
/** Available pickup slots from now, honoring lead time, hours, blackout dates and per-slot capacity. */
export async function getSlots(now = new Date()) {
  const st = await getSettings(); const p = await db(); const n = localClock(now);
  const taken = (await p.query("select pickup_date::text d, pickup_time t, count(*)::int c from catering_orders where status <> 'cancelled' and pickup_date >= $1 group by 1,2", [n.date])).rows;
  const used: Record<string, number> = {}; taken.forEach((r: any) => used[r.d + " " + r.t] = r.c);
  const nowMin = dayNum(n.date) * 1440 + n.minutes; const out: { date: string; label: string; times: { t: string; label: string; left: number }[] }[] = [];
  for (let i = 0; i <= st.windowDays; i++) {
    const d = addDays(n.date, i); const h = st.hours[String(dow(d))]; if (!h || st.blackout.includes(d)) continue;
    const times: { t: string; label: string; left: number }[] = [];
    for (let m = toMin(h[0]); m < toMin(h[1]); m += st.slotMinutes) {
      const t = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
      if (dayNum(d) * 1440 + m < nowMin + st.leadHours * 60) continue;
      const left = st.maxPerSlot - (used[d + " " + t] || 0); if (left > 0) times.push({ t, label: fmtTime(t), left });
    }
    if (times.length) out.push({ date: d, label: fmtDate(d), times });
  }
  return { slots: out, settings: st };
}
