import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { QueryDataBody, CallDataFunctionBody, GetCurrentUserResponse, CompleteBusinessOnboardingBody, CompleteBusinessOnboardingResponse } from "@workspace/api-zod";
import { accountView, completeBusinessSetup } from "../lib/onboarding";
import { localUser, authorizeRestaurant, memberRole, HttpError } from "../lib/auth";
import { columnsFor, isTable, type TableName } from "../lib/dataTables";
import { accessClause, validatePayload } from "../lib/dataPolicy";
import { readPublicMenu } from "../lib/menu";

const router: IRouter = Router();
const quote = (s: string) => `"${s}"`;
const publicNutrition = new Set(["id", "name", "calories_per_100g", "protein_per_100g", "carbs_per_100g", "fats_per_100g"]);

router.get("/me", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "private, no-store");
  res.json(GetCurrentUserResponse.parse(await accountView((await localUser(req, true, true))!)));
});

router.post("/onboarding", async (req, res): Promise<void> => {
  const user = (await localUser(req, true, true))!;
  const fields = ["full_name", "email", "business_name", "business_address", "business_phone"];
  const normalized = Object.fromEntries(fields.map((field) => [field, typeof req.body?.[field] === "string" ? req.body[field].trim() : req.body?.[field]]));
  const parsed = CompleteBusinessOnboardingBody.safeParse(normalized);
  if (!parsed.success) throw new HttpError(400, "Enter your name, verified email, business name, full store address, and phone number.");
  if (parsed.data.email.toLowerCase() !== user.email.toLowerCase()) throw new HttpError(400, "Use the verified email address on your sign-in account.");
  const digits = parsed.data.business_phone.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15 || !/^[+()\d\s.-]+$/.test(parsed.data.business_phone)) throw new HttpError(400, "Enter a valid business phone number, including its country code.");
  await completeBusinessSetup(user, parsed.data);
  res.setHeader("Cache-Control", "private, no-store");
  res.json(CompleteBusinessOnboardingResponse.parse(await accountView((await localUser(req, true, true))!)));
});

function projection(table: TableName, rows: any[], selection = "*", userId: string | null = null): Promise<any[]> {
  const parts = selection.split(/,(?![^()]*\))/).map((s) => s.trim());
  const fields = parts.filter((s) => !s.includes("("));
  const allowed = columnsFor(table);
  for (const field of fields) if (field !== "*" && !allowed.has(field)) throw new HttpError(400, "Unknown selected column.");
  return Promise.all(rows.map(async (row) => {
    const output: Record<string, any> = {};
    const publicIngredient = table === "ingredients" && (!userId || (row.user_id !== userId && (!row.restaurant_id || !(await memberRole(userId, row.restaurant_id)))));
    for (const field of fields.includes("*") ? Object.keys(row) : fields) {
      if (publicIngredient && !publicNutrition.has(field)) continue;
      if (table === "profiles" && row.id !== userId && !["id", "restaurant_name", "slug"].includes(field)) continue;
      output[field] = row[field];
    }
    for (const part of parts.filter((s) => s.includes("("))) {
      if (table === "restaurant_members" && part === "restaurants(name)") {
        output.restaurants = (await pool.query("SELECT name FROM restaurants WHERE id = $1", [row.restaurant_id])).rows[0] ?? null;
      } else if (table === "invoices" && part.replaceAll(" ", "") === "invoice_lines(description,product_code)") {
        output.invoice_lines = (await pool.query("SELECT description, product_code FROM invoice_lines WHERE invoice_id = $1", [row.id])).rows;
      } else throw new HttpError(400, "Unknown relation.");
    }
    return output;
  }));
}

router.post("/data/query", async (req, res): Promise<void> => {
  const parsed = QueryDataBody.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "Invalid data request.");
  const input = parsed.data;
  if (!isTable(input.table)) throw new HttpError(400, "Unknown table.");
  const table = input.table;
  const user = await localUser(req, input.operation !== "select");
  const columns = columnsFor(table);
  const params: unknown[] = [];
  const bind = (value: unknown) => { params.push(value); return `$${params.length}`; };
  const clause = accessClause(table, user?.id ?? null, input.operation !== "select", params);
  const filters = (input.filters ?? []).map((filter) => {
    if (!columns.has(filter.column)) throw new HttpError(400, "Unknown filter column.");
    const column = `t.${quote(filter.column)}`;
    if (filter.operator === "in") {
      if (!Array.isArray(filter.value) || filter.value.length > 20000) throw new HttpError(400, "Invalid filter values.");
      if (filter.value.some((v) => v !== null && !["string", "number", "boolean"].includes(typeof v))) throw new HttpError(400, "Invalid filter values.");
      if (!filter.value.length) return "FALSE";
      return `${column} IN (${filter.value.map(bind).join(",")})`;
    }
    if (filter.value === null) return `${column} IS ${filter.operator === "neq" ? "NOT " : ""}NULL`;
    if (!["string", "number", "boolean"].includes(typeof filter.value)) throw new HttpError(400, "Invalid filter value.");
    return `${column} ${filter.operator === "neq" ? "<>" : "="} ${bind(filter.value)}`;
  });
  const where = `(${clause})${filters.length ? ` AND ${filters.join(" AND ")}` : ""}`;
  let rows: any[];
  if (input.operation === "select") {
    const order = (input.orders ?? []).map((o) => {
      if (!columns.has(o.column)) throw new HttpError(400, "Unknown sort column.");
      return `t.${quote(o.column)} ${o.ascending === false ? "DESC" : "ASC"} NULLS ${o.nullsFirst ? "FIRST" : "LAST"}`;
    }).join(",");
    rows = (await pool.query(`SELECT t.* FROM ${quote(table)} t WHERE ${where}${order ? ` ORDER BY ${order}` : ""} LIMIT ${bind(input.limit ?? 20000)}`, params)).rows;
  } else {
    if (!user) throw new HttpError(401, "Please sign in.");
    if (["update", "delete"].includes(input.operation) && !input.filters?.length) throw new HttpError(400, "A record filter is required.");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      if (input.operation === "delete") {
        if (table === "invoices") {
          const selected = (await client.query(`SELECT t.* FROM invoices t WHERE ${where}`, params)).rows;
          for (const row of selected) await authorizeRestaurant(user.id, row.restaurant_id, true);
        }
        if (table === "restaurant_members") {
          const members = (await client.query(`SELECT t.* FROM ${quote(table)} t WHERE ${where}`, params)).rows;
          if (members.some((m) => m.role === "owner")) throw new HttpError(400, "The owner cannot be removed.");
        }
        if (table === "locations") {
          const selected = (await client.query(`SELECT t.* FROM locations t WHERE ${where}`, params)).rows;
          for (const row of selected) {
            const count = await client.query("SELECT count(*) FROM locations WHERE restaurant_id = $1", [row.restaurant_id]);
            if (Number(count.rows[0].count) <= 1) throw new HttpError(400, "Keep at least one location.");
          }
        }
        rows = (await client.query(`DELETE FROM ${quote(table)} t WHERE ${where} RETURNING t.*`, params)).rows;
      } else {
        const payloads = Array.isArray(input.payload) ? input.payload : [input.payload];
        if (!payloads.length || payloads.length > 500) throw new HttpError(400, "Invalid number of records.");
        rows = [];
        for (const payload of payloads) {
          if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new HttpError(400, "Invalid record.");
          const row = { ...payload } as Record<string, any>;
          for (const key of Object.keys(row)) if (!columns.has(key)) throw new HttpError(400, `Unknown field: ${key}`);
          if (input.operation === "update") {
            const originals = (await client.query(`SELECT t.* FROM ${quote(table)} t WHERE ${where}`, params)).rows;
            if (table === "recipes") {
              row.public_menu_synced = true;
              if (row.is_subrecipe === true) row.is_published = false;
              if (row.is_published === true && originals.some(o => row.is_subrecipe === undefined ? o.is_subrecipe : row.is_subrecipe)) {
                throw new HttpError(400, "Sub-recipes stay private.");
              }
            }
            for (const original of originals) {
              for (const key of ["id", "restaurant_id", "user_id", "owner_id", "created_at", "uploaded_by", "created_by"]) {
                if (key in row && String(row[key]) !== String(original[key])) throw new HttpError(403, "Record ownership cannot be changed.");
              }
              if (table === "restaurant_members" && original.role === "owner") throw new HttpError(400, "The owner role cannot be changed.");
              await validatePayload(table, { ...original, ...row }, user.id, "update");
            }
            for (const key of ["id", "restaurant_id", "user_id", "owner_id", "created_at"]) delete row[key];
            if (row.status === "approved") { row.approved_by = user.id; row.approved_at = new Date().toISOString(); }
            if (columns.has("updated_at")) row.updated_at = new Date().toISOString();
            if (!Object.keys(row).length) throw new HttpError(400, "No fields to update.");
            const updateParams = [...params];
            const sets = Object.keys(row).map((key) => { updateParams.push(row[key]); return `${quote(key)} = $${updateParams.length}`; });
            rows.push(...(await client.query(`UPDATE ${quote(table)} t SET ${sets.join(",")} WHERE ${where} RETURNING t.*`, updateParams)).rows);
          } else {
            if (table === "recipes") {
              const existing = input.operation === "upsert" && row.id
                ? (await client.query("SELECT is_published, is_subrecipe FROM recipes WHERE id = $1", [row.id])).rows[0] : undefined;
              row.public_menu_synced = true;
              row.is_published = (row.is_subrecipe ?? existing?.is_subrecipe) === true
                ? false : row.is_published ?? existing?.is_published ?? true;
            }
            await validatePayload(table, row, user.id, "insert");
            if (row.id || row.created_at) throw new HttpError(400, "Record IDs and creation dates are assigned by the server.");
            for (const field of ["uploaded_by", "created_by", "approved_by"]) if (field in row) row[field] = user.id;
            const fields = Object.keys(row);
            const values = fields.map((f) => row[f]);
            let conflict = "";
            if (input.operation === "upsert") {
              if (table !== "sales_mappings" || input.onConflict !== "restaurant_id,sales_item_name") throw new HttpError(400, "Unsupported merge key.");
              conflict = ` ON CONFLICT (restaurant_id, sales_item_name) DO UPDATE SET recipe_id = EXCLUDED.recipe_id, ignored = EXCLUDED.ignored`;
            }
            rows.push(...(await client.query(`INSERT INTO ${quote(table)} (${fields.map(quote).join(",")}) VALUES (${values.map((_, i) => `$${i + 1}`).join(",")})${conflict} RETURNING *`, values)).rows);
          }
        }
      }
      if (["update", "delete"].includes(input.operation) && !rows!.length) {
        throw new HttpError(403, "Record not found or you do not have permission to edit it.");
      }
      await client.query("COMMIT");
    } catch (err) { await client.query("ROLLBACK"); throw err; }
    finally { client.release(); }
  }
  const projected = await projection(table, rows!, input.selection ?? "*", user?.id ?? null);
  if (input.single && (projected.length > 1 || (input.single === "single" && !projected.length))) throw new HttpError(400, "Expected one matching record.");
  res.json({ data: input.single ? projected[0] ?? null : projected, error: null });
});

router.post("/data/rpc", async (req, res): Promise<void> => {
  const parsed = CallDataFunctionBody.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "Invalid request.");
  const { name, args } = parsed.data;
  if (name === "get_public_menu") {
    if (typeof args._slug !== "string") throw new HttpError(400, "A menu slug is required.");
    const menu = await readPublicMenu(args._slug);
    res.setHeader("Cache-Control", "no-store");
    res.json({ data: menu.items.filter(i => i.source === "recipe"), error: null }); return;
  }
  const user = (await localUser(req))!;
  if (typeof args._restaurant !== "string" || typeof args._email !== "string" || !["manager", "staff"].includes(String(args._role))) throw new HttpError(400, "Choose a restaurant, email, and role.");
  await authorizeRestaurant(user.id, args._restaurant, false, true);
  const found = await pool.query("SELECT id, email FROM auth_users WHERE lower(email) = lower($1)", [args._email.trim()]);
  if (!found.rows[0]) { res.json({ data: "not_found", error: null }); return; }
  await pool.query(`INSERT INTO restaurant_members (restaurant_id, user_id, email, role) VALUES ($1, $2, $3, $4)
    ON CONFLICT (restaurant_id, user_id) DO NOTHING`, [args._restaurant, found.rows[0].id, found.rows[0].email, args._role]);
  res.json({ data: "added", error: null });
});

export default router;
