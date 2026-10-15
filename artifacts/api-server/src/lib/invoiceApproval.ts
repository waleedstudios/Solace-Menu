import { pool } from "@workspace/db";
import { lineUnitCost, totalsCheck, describePack, norm, type InvoiceDetails, type InvLine, type MatchIng, type Alias } from "@workspace/recipe-engine/invoices";
import { authorizeRestaurant, HttpError } from "./auth";

export async function approveInvoiceTransaction(userId: string, invoiceId: string, acceptMismatch: boolean) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const inv = (await client.query("SELECT * FROM invoices WHERE id = $1 FOR UPDATE", [invoiceId])).rows[0] as InvoiceDetails | undefined;
    if (!inv) throw new HttpError(404, "Invoice not found.");
    await authorizeRestaurant(userId, inv.restaurant_id, true, false, client);
    if (inv.status === "approved") {
      await client.query("COMMIT");
      return { already_approved: true, changes: [] };
    }
    if (inv.status !== "review") throw new HttpError(409, "Extract and review this invoice before approval.");
    // Serialize approvals for the same restaurant as well as edits to each ingredient.
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`invoice-prices:${inv.restaurant_id}`]);
    const lines = (await client.query("SELECT * FROM invoice_lines WHERE invoice_id = $1 ORDER BY position, id FOR UPDATE", [invoiceId])).rows as InvLine[];
    const ingredients = (await client.query("SELECT * FROM ingredients WHERE restaurant_id = $1 ORDER BY id FOR UPDATE", [inv.restaurant_id])).rows as MatchIng[];
    const errors: string[] = [];
    if (!inv.invoice_date || !/^\d{4}-\d{2}-\d{2}$/.test(inv.invoice_date) ||
        !Number.isFinite(Date.parse(inv.invoice_date)) || new Date(inv.invoice_date).toISOString().slice(0, 10) !== inv.invoice_date) errors.push("A valid invoice date (YYYY-MM-DD) is required.");
    if (!["invoice", "corrected_invoice", "credit_note", "return"].includes(inv.doc_type)) errors.push("Choose a valid document type.");
    if (!lines.length) errors.push("Add at least one line item before approval.");
    for (const key of ["subtotal", "discount", "tax", "delivery", "total"] as const) {
      if (inv[key] != null && !Number.isFinite(inv[key])) errors.push(`${key} must be a finite number.`);
    }
    const credit = ["credit_note", "return"].includes(inv.doc_type);
    const purchases: { line: InvLine; ing: MatchIng; cost: number; qty: number }[] = [];
    for (const line of lines) {
      if (line.restaurant_id !== inv.restaurant_id) errors.push("A line belongs to another restaurant.");
      if (!["confirmed", "nonfood"].includes(line.match_status)) errors.push(`"${line.description}": confirm an ingredient or mark as non-food.`);
      for (const field of ["quantity", "pack_count", "pack_size", "unit_price", "line_total"] as const) {
        if (line[field] != null && !Number.isFinite(line[field])) errors.push(`"${line.description}": ${field} must be finite.`);
      }
      if (line.match_status !== "confirmed") continue;
      const ing = ingredients.find(i => i.id === line.ingredient_id);
      if (!ing) { errors.push(`"${line.description}": choose an ingredient from this restaurant.`); continue; }
      if (credit) continue;
      const cost = lineUnitCost(line, ing);
      if (!cost.ok) errors.push(`"${line.description}": ${cost.reason}`);
      else purchases.push({ line, ing, cost: cost.costPerBase, qty: cost.baseQty });
    }
    const check = totalsCheck(inv, lines);
    if (check.issues.length && !acceptMismatch) errors.push(...check.issues, "Explicitly acknowledge the totals mismatch to continue.");
    if (errors.length) throw new HttpError(422, errors.join("\n"));
    for (const { line, ing, cost, qty } of purchases) {
      await client.query(`INSERT INTO price_history
        (restaurant_id, ingredient_id, invoice_id, invoice_line_id, location_id, vendor_name, invoice_date, cost_per_base, base_unit, pack_description, pack_base_qty)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [inv.restaurant_id, ing.id, inv.id, line.id, inv.location_id, inv.vendor_name, inv.invoice_date, cost, ing.base_unit, describePack(line.pack_count, line.pack_size, line.pack_unit), qty]);
    }
    // Mark first inside the transaction so the latest-price query sees only approved purchases.
    await client.query("UPDATE invoices SET status = 'approved', approved_by = $2, approved_at = now(), updated_at = now() WHERE id = $1", [invoiceId, userId]);
    const changes: { ingredient_id: string; prev: number | null; next: number | null; becameCurrent: boolean }[] = [];
    for (const id of [...new Set(purchases.map(p => p.ing.id))]) {
      const top = (await client.query(`SELECT ph.* FROM price_history ph JOIN invoices i ON i.id = ph.invoice_id
        LEFT JOIN invoice_lines il ON il.id = ph.invoice_line_id
        WHERE ph.ingredient_id = $1 AND i.status = 'approved' AND i.doc_type IN ('invoice','corrected_invoice')
        ORDER BY ph.invoice_date DESC, ph.created_at DESC, il.position DESC NULLS LAST, ph.id DESC LIMIT 1`, [id])).rows[0];
      await client.query("UPDATE ingredients SET current_cost = $2, current_cost_date = $3, current_cost_invoice_id = $4 WHERE id = $1",
        [id, top.cost_per_base, top.invoice_date, top.invoice_id]);
      changes.push({ ingredient_id: id, prev: ingredients.find(i => i.id === id)!.current_cost, next: top.cost_per_base, becameCurrent: top.invoice_id === invoiceId });
    }
    const aliases = (await client.query("SELECT * FROM ingredient_aliases WHERE restaurant_id = $1", [inv.restaurant_id])).rows as Alias[];
    const key = (a: Alias) => `${a.ingredient_id}|${norm(a.alias)}|${norm(a.vendor_name)}`;
    const known = new Set(aliases.map(key));
    for (const line of lines.filter(l => l.match_status === "confirmed" && l.ingredient_id)) {
      const alias = { ingredient_id: line.ingredient_id!, alias: line.description, vendor_name: inv.vendor_name, product_code: line.product_code };
      if (known.has(key(alias))) continue;
      await client.query("INSERT INTO ingredient_aliases (restaurant_id, ingredient_id, vendor_name, alias, product_code) VALUES ($1,$2,$3,$4,$5)",
        [inv.restaurant_id, alias.ingredient_id, alias.vendor_name, alias.alias, alias.product_code]);
      known.add(key(alias));
    }
    await client.query("COMMIT");
    return { already_approved: false, changes };
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}
