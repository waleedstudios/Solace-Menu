import { pool } from "@workspace/db";
import { authorizeRestaurant, HttpError } from "./auth";
import type { TableName } from "./dataTables";

export function accessClause(table: TableName, userId: string | null, write: boolean, params: unknown[]): string {
  if (!userId && write) throw new HttpError(401, "Please sign in.");
  // Public profile projection does not use the caller ID. Do not bind an
  // unused parameter: PostgreSQL cannot infer its type on authenticated reads.
  if (table === "profiles" && !write) return "TRUE";
  const p = (value: unknown) => { params.push(value); return `$${params.length}`; };
  const uid = userId ? p(userId) : "NULL";
  const member = (rid: string, owner = false) => `EXISTS (SELECT 1 FROM restaurant_members rm WHERE rm.restaurant_id = ${rid} AND rm.user_id = ${uid}${write ? ` AND rm.role ${owner ? "= 'owner'" : "IN ('owner','manager')"}` : ""})`;
  const anyMember = (rid: string) => `EXISTS (SELECT 1 FROM restaurant_members rm WHERE rm.restaurant_id = ${rid} AND rm.user_id = ${uid})`;
  switch (table) {
    case "profiles": return write ? `t.id = ${uid}` : "TRUE";
    case "restaurants": return member("t.id", true);
    case "restaurant_members": return member("t.restaurant_id", true);
    case "menu_items": return write ? `t.user_id = ${uid}` : `(t.is_published OR t.user_id = ${uid})`;
    case "portion_units": return write ? `t.user_id = ${uid}` : `(t.user_id = ${uid} OR EXISTS (SELECT 1 FROM recipe_items ri JOIN menu_items mi ON mi.id = ri.menu_item_id WHERE ri.portion_unit_id = t.id AND mi.is_published))`;
    case "recipe_items": return `EXISTS (SELECT 1 FROM menu_items mi WHERE mi.id = t.menu_item_id AND ${write ? `mi.user_id = ${uid}` : `(mi.is_published OR mi.user_id = ${uid})`})`;
    case "recipe_lines": return `EXISTS (SELECT 1 FROM recipes r WHERE r.id = t.recipe_id AND ${member("r.restaurant_id")})`;
    case "ingredients":
      if (!userId) return "(t.user_id IS NULL AND t.restaurant_id IS NULL) OR EXISTS (SELECT 1 FROM recipe_items ri JOIN menu_items mi ON mi.id = ri.menu_item_id WHERE ri.ingredient_id = t.id AND mi.is_published)";
      return write
        ? `((t.restaurant_id IS NOT NULL AND ${member("t.restaurant_id")}) OR (t.restaurant_id IS NULL AND t.user_id = ${uid}))`
        : `((t.restaurant_id IS NULL AND (t.user_id IS NULL OR t.user_id = ${uid})) OR ${member("t.restaurant_id")} OR EXISTS (SELECT 1 FROM recipe_items ri JOIN menu_items mi ON mi.id = ri.menu_item_id WHERE ri.ingredient_id = t.id AND mi.is_published))`;
    case "invoices": return write
      ? `(${member("t.restaurant_id")} OR (t.uploaded_by = ${uid} AND t.status <> 'approved' AND ${anyMember("t.restaurant_id")}))`
      : anyMember("t.restaurant_id");
    case "invoice_lines": return write
      ? `(${member("t.restaurant_id")} OR EXISTS (SELECT 1 FROM invoices i WHERE i.id = t.invoice_id AND i.uploaded_by = ${uid} AND i.status = 'extracting' AND ${anyMember("i.restaurant_id")}))`
      : anyMember("t.restaurant_id");
    default:
      if (!userId) return "FALSE";
      return member("t.restaurant_id", table === "locations");
  }
}

export async function validatePayload(table: TableName, row: Record<string, any>, userId: string, operation: string): Promise<void> {
  if (["profiles", "restaurants", "restaurant_members"].includes(table) && operation === "insert") throw new HttpError(403, "Use the account or team flow to create this record.");
  if (["ingredients", "portion_units", "menu_items"].includes(table) && !row.restaurant_id && row.user_id && row.user_id !== userId) throw new HttpError(403, "The account owner cannot be changed.");
  if (table === "restaurant_members" && row.role && !["manager", "staff"].includes(row.role)) throw new HttpError(400, "Choose manager or staff.");
  let restaurantId = row.restaurant_id;
  if (table === "restaurants") restaurantId = row.id;
  if (table === "recipe_lines") {
    const r = await pool.query("SELECT restaurant_id FROM recipes WHERE id = $1", [row.recipe_id]);
    restaurantId = r.rows[0]?.restaurant_id;
    if (!restaurantId) throw new HttpError(400, "Recipe not found.");
  }
  if (table === "recipe_items") {
    const r = await pool.query("SELECT user_id FROM menu_items WHERE id = $1", [row.menu_item_id]);
    if (r.rows[0]?.user_id !== userId) throw new HttpError(403, "You cannot edit this menu item.");
  }
  if (restaurantId) {
    const invoiceFlow = ["invoices", "invoice_lines"].includes(table);
    const role = await authorizeRestaurant(userId, restaurantId, !invoiceFlow, ["locations", "restaurant_members", "restaurants"].includes(table));
    if (role === "staff" && table === "invoices") {
      if (row.uploaded_by !== userId || row.status === "approved" || row.approved_at || row.approved_by) throw new HttpError(403, "Staff can upload invoices but cannot approve them.");
    }
    if (role === "staff" && table === "invoice_lines") {
      const invoice = (await pool.query("SELECT uploaded_by, status FROM invoices WHERE id = $1", [row.invoice_id])).rows[0];
      if (invoice?.uploaded_by !== userId || invoice?.status !== "extracting") throw new HttpError(403, "Staff cannot edit reviewed invoices.");
    }
  }
  else if (["ingredients", "portion_units", "menu_items"].includes(table)) row.user_id = userId;
  else if (!["profiles", "recipe_items"].includes(table)) throw new HttpError(400, "A restaurant is required.");

  const refs: Record<string, string> = {
    ingredient_id: "ingredients", sub_recipe_id: "recipes", recipe_id: "recipes",
    invoice_id: "invoices", invoice_line_id: "invoice_lines", import_id: "sales_imports",
    location_id: "locations", vendor_id: "vendors", portion_unit_id: "portion_units",
    current_cost_invoice_id: "invoices", corrects_invoice_id: "invoices",
  };
  for (const [field, target] of Object.entries(refs)) {
    if (!row[field]) continue;
    const r = await pool.query(`SELECT * FROM "${target}" WHERE id = $1`, [row[field]]);
    const referenced = r.rows[0];
    if (!referenced) throw new HttpError(400, `The selected ${field.replace(/_id$/, "").replaceAll("_", " ")} no longer exists.`);
    if (referenced.restaurant_id && restaurantId && referenced.restaurant_id !== restaurantId) throw new HttpError(403, "Related records must belong to the same restaurant.");
    if (referenced.restaurant_id) await authorizeRestaurant(userId, referenced.restaurant_id);
    if (referenced.user_id && !referenced.restaurant_id && referenced.user_id !== userId) throw new HttpError(403, "This related record belongs to another account.");
  }
}
