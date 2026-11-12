import { Pool, types } from "pg";
types.setTypeParser(1082, (v: string) => v);
const g = globalThis as any;
export const pool: Pool = g.__pool ??= new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL ? { rejectUnauthorized: false } : undefined });
export const DEFAULT_CATERING = { leadHours: 48, minOrderCents: 10000, slotMinutes: 30, maxPerSlot: 2, windowDays: 60, blackout: [] as string[], notifyEmail: "admin@frxskishq.com",
  notice: "Orders are confirmed by email from FRX. Payment is by invoice after pickup.",
  hours: { "0": null, "1": ["08:00", "16:00"], "2": ["08:00", "16:00"], "3": ["08:00", "16:00"], "4": ["08:00", "16:00"], "5": ["08:00", "16:00"], "6": null } as Record<string, string[] | null> };
const schema = `
create table if not exists families(id serial primary key, email text unique not null, name text, square_customer_id text, square_card_id text, created_at timestamptz default now());
create table if not exists students(id serial primary key, family_id int references families(id), name text not null);
create table if not exists menu_items(id serial primary key, name text not null, description text, price_cents int not null, active bool default true);
create table if not exists orders(id serial primary key, family_id int references families(id), student_id int references students(id), menu_item_id int references menu_items(id), item_name text not null, price_cents int not null, lunch_date date not null, created_at timestamptz default now(), billed_at timestamptz);
create table if not exists login_tokens(token text primary key, email text not null, expires_at timestamptz not null);
create table if not exists report_log(lunch_date date primary key, sent_at timestamptz default now());
create table if not exists reminder_subscribers(email text primary key, token text not null, confirmed_at timestamptz, unsubscribed_at timestamptz, created_at timestamptz default now());
create table if not exists reminder_log(lunch_date date primary key, sent_at timestamptz default now(), recipients int);
create table if not exists catering_items(id serial primary key, name text not null, description text, category text not null default 'Entrees', price_cents int not null, unit text not null default 'each', min_qty int not null default 1, active bool not null default false, sort int not null default 0);
create table if not exists catering_orders(id serial primary key, company text not null, contact_name text not null, email text not null, phone text not null, headcount int, pickup_date date not null, pickup_time text not null, notes text, subtotal_cents int not null, status text not null default 'requested', created_at timestamptz default now());
create table if not exists catering_order_items(id serial primary key, order_id int references catering_orders(id) on delete cascade, item_name text not null, price_cents int not null, qty int not null);
create table if not exists catering_settings(id int primary key, data jsonb not null);
create table if not exists invoices(id serial primary key, family_id int references families(id), month text, total_cents int, status text, square_payment_id text, created_at timestamptz default now(), unique(family_id, month));
`;
export async function db() {
  if (!g.__init) g.__init = (async () => {
    await pool.query(schema);
    const { rows } = await pool.query("select count(*)::int c from menu_items");
    if (!rows[0].c) await pool.query("insert into menu_items(name,description,price_cents) values ('Lunch A','Chicken sandwich, chips, and a piece of fruit',1200),('Lunch B','Sandwich, mac and cheese, and fruit',1500),('Lunch C','Sandwich, mac and cheese, candy, and fruit',2000)");
    const c = await pool.query("select count(*)::int c from catering_items");
    if (!c.rows[0].c) await pool.query(`insert into catering_items(name,description,category,price_cents,unit,min_qty,active,sort) values
      ('Boxed Lunch','Sandwich, chips, fruit, and a cookie (sample item: set your real menu in admin)','Boxed Lunches',1400,'per person',10,false,1),
      ('Sandwich Platter','Assorted sandwiches, serves 10 (sample item)','Platters',12000,'per platter',1,false,2),
      ('Mac and Cheese Tray','Full hotel pan, serves 15 (sample item)','Sides',9000,'per tray',1,false,3)`);
    await pool.query("insert into catering_settings values(1,$1) on conflict do nothing", [JSON.stringify(DEFAULT_CATERING)]);
  })();
  await g.__init;
  return pool;
}
