import { Pool, types } from "pg";
types.setTypeParser(1082, (v: string) => v);
const g = globalThis as any;
export const pool: Pool = g.__pool ??= new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL ? { rejectUnauthorized: false } : undefined });
const schema = `
create table if not exists families(id serial primary key, email text unique not null, name text, square_customer_id text, square_card_id text, created_at timestamptz default now());
create table if not exists students(id serial primary key, family_id int references families(id), name text not null);
create table if not exists menu_items(id serial primary key, name text not null, description text, price_cents int not null, active bool default true);
create table if not exists orders(id serial primary key, family_id int references families(id), student_id int references students(id), menu_item_id int references menu_items(id), item_name text not null, price_cents int not null, lunch_date date not null, created_at timestamptz default now(), billed_at timestamptz);
create table if not exists login_tokens(token text primary key, email text not null, expires_at timestamptz not null);
create table if not exists report_log(lunch_date date primary key, sent_at timestamptz default now());
create table if not exists reminder_subscribers(email text primary key, token text not null, confirmed_at timestamptz, unsubscribed_at timestamptz, created_at timestamptz default now());
create table if not exists reminder_log(lunch_date date primary key, sent_at timestamptz default now(), recipients int);
create table if not exists invoices(id serial primary key, family_id int references families(id), month text, total_cents int, status text, square_payment_id text, created_at timestamptz default now(), unique(family_id, month));
`;
export async function db() {
  if (!g.__init) g.__init = (async () => {
    await pool.query(schema);
    const { rows } = await pool.query("select count(*)::int c from menu_items");
    if (!rows[0].c) await pool.query("insert into menu_items(name,description,price_cents) values ('Lunch A','Chicken sandwich, chips, and a piece of fruit',1200),('Lunch B','Sandwich, mac and cheese, and fruit',1500),('Lunch C','Sandwich, mac and cheese, candy, and fruit',2000)");
  })();
  await g.__init;
  return pool;
}
