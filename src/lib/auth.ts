import { cookies } from "next/headers";
import crypto from "crypto";
const secret = () => process.env.SESSION_SECRET || "dev";
const sign = (v: string) => v + "." + crypto.createHmac("sha256", secret()).update(v).digest("hex");
const unsign = (s?: string) => { if (!s) return null; const i = s.lastIndexOf("."); if (i < 0) return null; const v = s.slice(0, i); const a = Buffer.from(sign(v)), b = Buffer.from(s); return a.length === b.length && crypto.timingSafeEqual(a, b) ? v : null; };
export async function setSession(kind: "p" | "a", id: string) { (await cookies()).set("frx", sign(`${kind}:${id}`), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 }); }
export async function clearSession() { (await cookies()).delete("frx"); }
export async function session() { const v = unsign((await cookies()).get("frx")?.value); if (!v) return null; const [kind, id] = v.split(":"); return { kind, id }; }
export const isAdmin = async () => (await session())?.kind === "a";
export const parentId = async () => { const s = await session(); return s?.kind === "p" ? Number(s.id) : null; };
