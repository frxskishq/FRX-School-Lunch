import { db } from "@/lib/db"; import { isAdmin } from "@/lib/auth"; import { fmtDate, money } from "@/lib/time"; import { generateDueInvoices, jacksonClosed, jacksonCutoffDay } from "@/lib/jackson"; import { AdminLogin } from "../Client"; import { CompanyEditor, EventAdder, Actions, GenerateButton } from "./Client";
export const dynamic = "force-dynamic";
export default async function AdminJackson() {
  if (!(await isAdmin())) return <><h1>FRX staff</h1><AdminLogin /></>;
  await generateDueInvoices(); const p = await db();
  const companies = (await p.query("select * from jackson_companies order by name")).rows;
  const events = (await p.query("select e.id, e.pickup_date::text d, e.note, c.name cname, (select count(*)::int from jackson_orders o where o.event_id=e.id) n, i.id inv, i.status from jackson_events e join jackson_companies c on c.id=e.company_id left join jackson_invoices i on i.event_id=e.id order by e.pickup_date desc, c.name")).rows;
  return <>
    <div className="row"><div><h1>FRX Jackson WY: admin</h1><div className="muted"><a href="/admin">Back to school admin</a></div></div><GenerateButton /></div>
    <h2>Pickup dates and invoices</h2>
    <div className="muted">Invoices are created automatically once orders close (8:00 PM Mountain, two days before pickup). Payment is collected at pickup; mark the invoice paid afterward.</div>
    <div className="card"><table><tbody>{events.map((e: any) => <tr key={e.id}><td><a href={`/admin/jackson/event/${e.id}`}><b>{fmtDate(e.d)}</b></a><br /><small className="muted">{e.cname} · {e.n} order{e.n === 1 ? "" : "s"} · {e.inv ? `invoice #${e.inv} ${e.status}` : jacksonClosed(e.d) ? "closed, no orders" : `open until ${fmtDate(jacksonCutoffDay(e.d))} 8 PM`}</small></td>
      <td style={{ textAlign: "right" }}><Actions kind="event" id={e.id} date={e.d} note={e.note || ""} /></td></tr>)}</tbody></table>{!events.length && <span className="muted">No pickup dates scheduled.</span>}</div>
    {companies.some((c: any) => c.active) && <EventAdder companies={companies} />}
    <h2>Companies</h2>
    {companies.map((c: any) => <CompanyEditor key={c.id} c={c} />)}<CompanyEditor />
  </>;
}
