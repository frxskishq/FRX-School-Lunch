import { db } from "./db"; import { fmtDate } from "./time"; import { sendMail } from "./mail";
export async function kitchenData(date: string) {
  const p = await db();
  const rows = (await p.query("select o.item_name, s.name student from orders o join students s on s.id=o.student_id where o.lunch_date=$1 order by o.item_name, s.name", [date])).rows;
  const menu = (await p.query("select name, description from menu_items order by id")).rows;
  const byType: Record<string, string[]> = {}; rows.forEach((r: any) => (byType[r.item_name] ||= []).push(r.student));
  const types = Object.keys(byType).sort((a, b) => menu.findIndex((m: any) => m.name === a) - menu.findIndex((m: any) => m.name === b));
  return { rows, byType, types, menu, total: rows.length };
}
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
export async function sendKitchenReport(date: string, to = process.env.REPORT_TO || "admin@frxskishq.com") {
  const { rows, byType, types, menu, total } = await kitchenData(date);
  const desc = (n: string) => menu.find((m: any) => m.name === n)?.description || "";
  const title = `FRX Lunch order list for ${fmtDate(date)}: ${total} lunch${total === 1 ? "" : "es"}`;
  const text = [title, "", "TOTALS TO PREPARE", ...types.map(t => `  ${byType[t].length} x ${t} (${desc(t)})`), total ? "" : "  No orders for this day.", "", "BY LUNCH TYPE (student names)",
    ...types.flatMap(t => [`${t} (${byType[t].length})`, ...byType[t].map(s => `  [ ] ${s}`), ""])].join("\n");
  const html = `<div style="font-family:system-ui,sans-serif;max-width:560px"><h2>Lunch orders for ${fmtDate(date)}</h2><p><b>${total}</b> lunch${total === 1 ? "" : "es"} to prepare. Orders are closed.</p>
<table style="border-collapse:collapse;width:100%"><tr><th align=left style="border-bottom:2px solid #333;padding:6px">Lunch</th><th align=right style="border-bottom:2px solid #333;padding:6px">Qty</th></tr>
${types.map(t => `<tr><td style="padding:6px;border-bottom:1px solid #ddd"><b>${esc(t)}</b><br><small>${esc(desc(t))}</small></td><td align=right style="padding:6px;border-bottom:1px solid #ddd;font-size:20px"><b>${byType[t].length}</b></td></tr>`).join("") || `<tr><td colspan=2>No orders for this day.</td></tr>`}</table>
${types.map(t => `<h3>${esc(t)} (${byType[t].length})</h3><ul style="list-style:none;padding:0;margin:0">${byType[t].map(s => `<li>&#9744; ${esc(s)}</li>`).join("")}</ul>`).join("")}</div>`;
  const csv = "Lunch,Student\n" + rows.map((r: any) => `"${r.item_name.replace(/"/g, '""')}","${r.student.replace(/"/g, '""')}"`).join("\n") + "\n";
  return sendMail(to, title, text, { html, attachments: [{ filename: `frx-lunch-${date}.csv`, content: csv }], footer: false });
}
