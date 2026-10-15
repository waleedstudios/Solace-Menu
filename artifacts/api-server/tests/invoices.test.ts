import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pool } from "@workspace/db";
import { approveInvoiceTransaction } from "../src/lib/invoiceApproval";
import { lineUnitCost, suggestMatch, totalsCheck, type InvLine, type MatchIng } from "@workspace/recipe-engine/invoices";

test("invoice conversions and suggestions use shared rules", () => {
  const ingredient = { id: "ing", name: "Flour", base_unit: "g", density_g_per_ml: null } as MatchIng;
  const line = { description: "Flour", pack_size: 2, pack_count: 4, pack_unit: "kg", unit_price: 24, quantity: 1, line_total: 24 } as InvLine;
  const converted = lineUnitCost(line, ingredient);
  assert.equal(converted.ok, true);
  if (converted.ok) assert.equal(converted.costPerBase, .003);
  assert.equal(lineUnitCost({ ...line, pack_unit: "l" }, ingredient).ok, false);
  assert.equal(lineUnitCost({ ...line, pack_size: -1 }, ingredient).ok, false);
  assert.equal(lineUnitCost({ ...line, unit_price: Infinity }, ingredient).ok, false);
  assert.equal(suggestMatch(line, "Vendor", [ingredient], [])?.ingredient_id, "ing");
  assert.equal(suggestMatch(line, "Vendor", [], [{ ingredient_id: "foreign", alias: "Flour", vendor_name: "Vendor", product_code: null }]), null);
  assert.ok(totalsCheck({ subtotal: 24, total: 25, discount: null, delivery: null, tax: null }, [line]).issues.length);
});

// Run only against the workspace development database. Every row belongs to a
// fresh test identity and is removed in finally; no existing business is edited.
test("approval transaction: authorization, validation, rollback, concurrency, history and credits", async () => {
  const users: string[] = [], restaurants: string[] = [];
  async function user() {
    const unique = randomUUID();
    const row = (await pool.query("INSERT INTO auth_users (clerk_id,email) VALUES ($1,$2) RETURNING id", [`invoice-test-${unique}`, `invoice-test-${unique}@example.test`])).rows[0];
    users.push(row.id); return row.id as string;
  }
  async function restaurant(owner: string) {
    const row = (await pool.query("INSERT INTO restaurants (name,owner_id) VALUES ('Invoice test',$1) RETURNING id", [owner])).rows[0];
    restaurants.push(row.id); return row.id as string;
  }
  try {
    const owner = await user(), manager = await user(), staff = await user(), outsider = await user();
    const rid = await restaurant(owner), foreignRid = await restaurant(outsider);
    for (const [id, role] of [[owner, "owner"], [manager, "manager"], [staff, "staff"]]) {
      await pool.query("INSERT INTO restaurant_members (restaurant_id,user_id,role) VALUES ($1,$2,$3)", [rid, id, role]);
    }
    const ingredient = (await pool.query("INSERT INTO ingredients (restaurant_id,name,base_unit) VALUES ($1,'Flour','g') RETURNING id", [rid])).rows[0].id;
    const foreignIngredient = (await pool.query("INSERT INTO ingredients (restaurant_id,name) VALUES ($1,'Foreign') RETURNING id", [foreignRid])).rows[0]?.id;
    async function invoice(date = "2026-10-15", price = 20, type = "invoice", ing = ingredient, status = "confirmed") {
      const inv = (await pool.query(`INSERT INTO invoices (restaurant_id,status,invoice_date,doc_type,vendor_name,subtotal,total)
        VALUES ($1,'review',$2,$3,'Test supplier',$4,$4) RETURNING id`, [rid, date, type, price])).rows[0].id;
      await pool.query(`INSERT INTO invoice_lines (restaurant_id,invoice_id,ingredient_id,description,quantity,pack_count,pack_size,pack_unit,unit_price,line_total,match_status)
        VALUES ($1,$2,$3,'Flour',1,1,1,'kg',$4,$4,$5)`, [rid, inv, ing, price, status]);
      return inv as string;
    }
    const purchase = await invoice();
    await assert.rejects(approveInvoiceTransaction(staff, purchase, false), /permission/);
    await assert.rejects(approveInvoiceTransaction(outsider, purchase, false), /permission/);
    const wrongIngredient = await invoice("2026-10-15", 20, "invoice", foreignIngredient);
    await assert.rejects(approveInvoiceTransaction(owner, wrongIngredient, false), /this restaurant/);
    const suggested = await invoice("2026-10-15", 20, "invoice", ingredient, "suggested");
    await assert.rejects(approveInvoiceTransaction(owner, suggested, false), /confirm an ingredient/);
    await pool.query("UPDATE invoice_lines SET match_status = 'unmatched', ingredient_id = NULL WHERE invoice_id = $1", [suggested]);
    await assert.rejects(approveInvoiceTransaction(owner, suggested, false), /confirm an ingredient/);
    const badDate = await invoice("2026-02-30");
    await assert.rejects(approveInvoiceTransaction(owner, badDate, false), /valid invoice date/);
    const mismatch = await invoice();
    await pool.query("UPDATE invoices SET total = 25 WHERE id = $1", [mismatch]);
    await assert.rejects(approveInvoiceTransaction(owner, mismatch, false), /Explicitly acknowledge/);

    // Inject a runtime failure after price and cost writes. PostgreSQL must roll
    // back all of them, not merely leave status unapproved.
    const originalConnect = pool.connect.bind(pool);
    (pool as any).connect = (...args: unknown[]) => {
      if (args.length) return (originalConnect as any)(...args);
      return originalConnect().then(client => {
      const originalQuery = client.query.bind(client);
      (client as any).query = async (sql: string, values?: unknown[]) => {
        if (sql.startsWith("INSERT INTO ingredient_aliases")) throw new Error("Injected alias write failure");
        return originalQuery(sql, values);
      };
      const release = client.release.bind(client);
      client.release = () => { client.query = originalQuery; release(); };
      return client;
      });
    };
    try { await assert.rejects(approveInvoiceTransaction(owner, purchase, false), /Injected/); }
    finally { pool.connect = originalConnect as typeof pool.connect; }
    assert.equal(Number((await pool.query("SELECT count(*) FROM price_history WHERE invoice_id = $1", [purchase])).rows[0].count), 0);
    assert.equal((await pool.query("SELECT status FROM invoices WHERE id = $1", [purchase])).rows[0].status, "review");
    assert.equal((await pool.query("SELECT current_cost FROM ingredients WHERE id = $1", [ingredient])).rows[0].current_cost, null);
    const results = await Promise.all([approveInvoiceTransaction(owner, purchase, false), approveInvoiceTransaction(manager, purchase, false)]);
    assert.equal(results.filter(r => r.already_approved).length, 1);
    assert.equal(results.find(r => !r.already_approved)?.changes[0].next, .02);
    assert.equal(Number((await pool.query("SELECT count(*) FROM price_history WHERE invoice_id = $1", [purchase])).rows[0].count), 1);
    assert.equal(Number((await pool.query("SELECT count(*) FROM ingredient_aliases WHERE restaurant_id = $1", [rid])).rows[0].count), 1);
    const older = await invoice("2026-10-01", 10);
    assert.equal((await approveInvoiceTransaction(manager, older, false)).changes[0].becameCurrent, false);
    assert.equal((await pool.query("SELECT current_cost FROM ingredients WHERE id = $1", [ingredient])).rows[0].current_cost, .02);
    const credit = await invoice("2026-10-16", -20, "credit_note");
    assert.equal((await approveInvoiceTransaction(owner, credit, false)).changes.length, 0);
    assert.equal(Number((await pool.query("SELECT count(*) FROM price_history WHERE invoice_id = $1", [credit])).rows[0].count), 0);
    assert.equal((await approveInvoiceTransaction(owner, mismatch, true)).already_approved, false);
  } finally {
    for (const rid of restaurants) await pool.query("DELETE FROM restaurants WHERE id = $1", [rid]);
    for (const id of users) await pool.query("DELETE FROM auth_users WHERE id = $1", [id]);
    await pool.end();
  }
});
