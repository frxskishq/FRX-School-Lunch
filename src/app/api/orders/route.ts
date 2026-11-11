import { db } from "@/lib/db"; import { parentId } from "@/lib/auth"; import { orderWindow } from "@/lib/time"; import { saveCard, squareConfigured } from "@/lib/square"; import { sendMail } from "@/lib/mail"; import { money, fmtDate } from "@/lib/time";
export async function POST(req: Request) {
  const fid = await parentId(); if (!fid) return Response.json({ error: "Not signed in" }, { status: 401 });
  const b = await req.json(); const p = await db(); const w = orderWindow();
  if (!w.open && b.action === "order") return Response.json({ error: "Ordering is closed for " + fmtDate(w.target) }, { status: 400 });
  switch (b.action) {
    case "student": {
      const n = String(b.name || "").trim(); if (!n) return Response.json({ error: "Name required" }, { status: 400 });
      await p.query("insert into students(family_id,name) values($1,$2)", [fid, n]); return Response.json({ ok: true });
    }
    case "card": {
      const f = (await p.query("select * from families where id=$1", [fid])).rows[0];
      if (!squareConfigured()) { await p.query("update families set square_card_id=coalesce(square_card_id,'stub-card') where id=$1", [fid]); return Response.json({ ok: true }); }
      if (!b.sourceId) return Response.json({ error: "Missing card token" }, { status: 400 });
      const r = await saveCard({ email: f.email, customerId: f.square_customer_id, sourceId: b.sourceId, key: "fam" + fid });
      if (!r.ok) return Response.json({ error: r.error }, { status: 400 });
      await p.query("update families set square_customer_id=$2, square_card_id=$3 where id=$1", [fid, r.customerId, r.cardId]); return Response.json({ ok: true });
    }
    case "order": {
      const f = (await p.query("select * from families where id=$1", [fid])).rows[0];
      if (!f.square_card_id) return Response.json({ error: "Add a card before ordering" }, { status: 400 });
      const items: { studentId: number; menuItemId: number }[] = b.items || [];
      if (!items.length) return Response.json({ error: "Pick a lunch" }, { status: 400 });
      const c = await p.connect(); let total = 0; const lines: string[] = [];
      try {
        await c.query("begin");
        for (const i of items) {
          const s = await c.query("select name from students where id=$1 and family_id=$2", [i.studentId, fid]);
          const m = await c.query("select * from menu_items where id=$1 and active", [i.menuItemId]);
          if (!s.rows[0] || !m.rows[0]) throw new Error("Invalid selection");
          await c.query("insert into orders(family_id,student_id,menu_item_id,item_name,price_cents,lunch_date) values($1,$2,$3,$4,$5,$6)", [fid, i.studentId, i.menuItemId, m.rows[0].name, m.rows[0].price_cents, w.target]);
          total += m.rows[0].price_cents; lines.push(`${s.rows[0].name}: ${m.rows[0].name} ${money(m.rows[0].price_cents)}`);
        }
        await c.query("commit");
      } catch (e: any) { await c.query("rollback"); return Response.json({ error: e.message }, { status: 400 }); } finally { c.release(); }
      await sendMail(f.email, `FRX Lunch confirmation for ${fmtDate(w.target)}`, lines.join("\n") + `\nTotal ${money(total)}, billed at month-end. Orders are final.`);
      return Response.json({ ok: true });
    }
  }
  return Response.json({ error: "Bad request" }, { status: 400 });
}
