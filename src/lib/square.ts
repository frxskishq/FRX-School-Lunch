// Square integration. Falls back to demo mode when SQUARE_ACCESS_TOKEN is unset.
export const squareConfigured = () => !!(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_APPLICATION_ID && process.env.SQUARE_LOCATION_ID);
const prod = () => process.env.SQUARE_ENV === "production";
export const squareScriptUrl = () => prod() ? "https://web.squarecdn.com/v1/square.js" : "https://sandbox.web.squarecdn.com/v1/square.js";
async function sq(path: string, body: any) {
  const r = await fetch((prod() ? "https://connect.squareup.com" : "https://connect.squareupsandbox.com") + path, { method: "POST",
    headers: { Authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`, "Content-Type": "application/json", "Square-Version": "2024-10-17" }, body: JSON.stringify(body) });
  const j: any = await r.json(); return { ok: r.ok, j, error: j.errors?.[0]?.detail || "Square error" };
}
/** Create a Square customer (if needed) and save the tokenized card on file. Returns ids only, never card data. */
export async function saveCard(opts: { email: string; customerId?: string | null; sourceId: string; key: string }) {
  let customerId = opts.customerId;
  if (!customerId) {
    const c = await sq("/v2/customers", { idempotency_key: "c-" + opts.key, email_address: opts.email, reference_id: opts.key });
    if (!c.ok) return { ok: false as const, error: c.error }; customerId = c.j.customer.id;
  }
  const r = await sq("/v2/cards", { idempotency_key: "k-" + opts.key + "-" + Date.now(), source_id: opts.sourceId, card: { customer_id: customerId } });
  return r.ok ? { ok: true as const, customerId, cardId: r.j.card.id as string } : { ok: false as const, error: r.error };
}
export async function chargeCard(opts: { customerId?: string | null; cardId?: string | null; cents: number; key: string; note: string }) {
  if (!squareConfigured()) return { ok: true, id: "stub-" + opts.key, stub: true };
  if (!opts.cardId) return { ok: false, error: "No card on file" };
  const r = await sq("/v2/payments", { idempotency_key: opts.key, source_id: opts.cardId, customer_id: opts.customerId, amount_money: { amount: opts.cents, currency: "USD" }, location_id: process.env.SQUARE_LOCATION_ID, note: opts.note, autocomplete: true });
  return r.ok ? { ok: true, id: r.j.payment.id as string } : { ok: false, error: r.error };
}
