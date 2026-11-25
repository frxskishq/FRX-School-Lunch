import { generateDueInvoices } from "@/lib/jackson";
// Optional: call hourly from a Railway cron. Creates invoices for Jackson pickups whose 8 PM, two-days-before cutoff has passed. Idempotent.
export async function POST(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return Response.json({ error: "Forbidden" }, { status: 403 });
  return Response.json({ created: (await generateDueInvoices()).length });
}
