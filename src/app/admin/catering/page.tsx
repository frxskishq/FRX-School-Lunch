import { db } from "@/lib/db"; import { isAdmin } from "@/lib/auth"; import { getSettings } from "@/lib/catering"; import { money, fmtDate, fmtTime } from "@/lib/time"; import { AdminLogin } from "../Client"; import { CateringAdmin } from "./Client";
export const dynamic = "force-dynamic";
export default async function Page() {
  if (!(await isAdmin())) return <><h1>FRX staff</h1><AdminLogin /></>;
  const p = await db(); const settings = await getSettings();
  const items = (await p.query("select * from catering_items order by sort, id")).rows;
  const orders = (await p.query("select o.*, (select json_agg(json_build_object('n',i.item_name,'q',i.qty,'p',i.price_cents) order by i.id) from catering_order_items i where i.order_id=o.id) lines from catering_orders o order by (o.status in ('requested','confirmed')) desc, o.pickup_date, o.pickup_time limit 100")).rows
    .map((o: any) => ({ ...o, ref: `FRX-C-${1000 + o.id}`, when: `${fmtDate(o.pickup_date)} at ${fmtTime(o.pickup_time)}`, total: money(o.subtotal_cents), created_at: undefined }));
  return <div className="cwrap"><div className="row"><h1>Catering</h1><a className="nav" href="/admin">Back to school lunch</a></div><CateringAdmin orders={orders} items={items} settings={settings} /></div>;
}
