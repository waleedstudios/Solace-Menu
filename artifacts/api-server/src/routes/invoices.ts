import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { ApproveSupplierInvoiceBody, ApproveSupplierInvoiceParams, ApproveSupplierInvoiceResponse, ExtractSupplierInvoiceParams, ExtractSupplierInvoiceResponse } from "@workspace/api-zod";
import { suggestMatch, type MatchIng, type Alias } from "@workspace/recipe-engine/invoices";
import { localUser, authorizeRestaurant, HttpError } from "../lib/auth";
import { approveInvoiceTransaction } from "../lib/invoiceApproval";
import { extractPrivateDocument } from "./extraction";

const router: IRouter = Router();
router.post("/invoices/:invoiceId/approve", async (req, res): Promise<void> => {
  const user = (await localUser(req))!;
  const params = ApproveSupplierInvoiceParams.safeParse(req.params), body = ApproveSupplierInvoiceBody.safeParse(req.body);
  if (!params.success || !body.success) throw new HttpError(400, "Invalid approval request.");
  const result = await approveInvoiceTransaction(user.id, params.data.invoiceId, body.data.accept_total_mismatch ?? false);
  res.setHeader("Cache-Control", "private, no-store");
  res.json(ApproveSupplierInvoiceResponse.parse(result));
});
router.post("/invoices/:invoiceId/extract", async (req, res): Promise<void> => {
  const user = (await localUser(req))!;
  const parsed = ExtractSupplierInvoiceParams.safeParse(req.params);
  if (!parsed.success) throw new HttpError(400, "Invalid invoice.");
  const id = parsed.data.invoiceId;
  const invoice = (await pool.query("SELECT * FROM invoices WHERE id = $1", [id])).rows[0];
  if (!invoice) throw new HttpError(404, "Invoice not found.");
  await authorizeRestaurant(user.id, invoice.restaurant_id, true);
  if (!invoice.file_paths.length || invoice.file_paths.length > 10) throw new HttpError(400, "Choose between 1 and 10 documents.");
  const started = await pool.query(`UPDATE invoices SET status = 'extracting', extraction_error = NULL, updated_at = now()
    WHERE id = $1 AND status <> 'approved' AND (status <> 'extracting' OR updated_at < now() - interval '5 minutes')
    RETURNING *, updated_at::text AS extraction_generation`, [id]);
  if (!started.rowCount) throw new HttpError(409, "This invoice is approved or is already being read. Retry after five minutes if reading was interrupted.");
  // Preserve PostgreSQL microseconds; a JS Date loses precision and cannot be
  // used in the failure-state compare-and-set below.
  const generation = started.rows[0].extraction_generation;
  try {
    const response = await extractPrivateDocument(user.id, { kind: "invoice", restaurant_id: invoice.restaurant_id, paths: started.rows[0].file_paths });
    const result = response.data as Record<string, any>;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const current = (await client.query("SELECT *, updated_at::text AS extraction_generation FROM invoices WHERE id = $1 FOR UPDATE", [id])).rows[0];
      if (current?.status !== "extracting" || current.extraction_generation !== generation) throw new HttpError(409, "This invoice changed while reading. Reload it.");
      const ingredients = (await client.query("SELECT * FROM ingredients WHERE restaurant_id = $1", [invoice.restaurant_id])).rows as MatchIng[];
      const aliases = (await client.query("SELECT * FROM ingredient_aliases WHERE restaurant_id = $1", [invoice.restaurant_id])).rows as Alias[];
      const vendor = result.vendor_name || invoice.vendor_name || null;
      await client.query("DELETE FROM invoice_lines WHERE invoice_id = $1", [id]);
      for (const [position, l] of (result.lines || []).entries()) {
        const match = suggestMatch(l, vendor, ingredients, aliases);
        await client.query(`INSERT INTO invoice_lines
          (invoice_id, restaurant_id, position, description, product_code, quantity, pack_count, pack_size, pack_unit, unit_price, line_total, uncertain, uncertain_note, match_status, ingredient_id, match_confidence, match_reason)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
        [id, invoice.restaurant_id, position, l.description || "", l.product_code, l.quantity, l.pack_count, l.pack_size, l.pack_unit, l.unit_price, l.line_total,
          !!l.uncertain, l.uncertain_note, match ? "suggested" : "unmatched", match?.ingredient_id ?? null, match?.confidence ?? null, match?.reason ?? null]);
      }
      await client.query(`UPDATE invoices SET status = 'review', vendor_name = $2, invoice_number = $3, invoice_date = $4,
        doc_type = $5, subtotal = $6, discount = $7, tax = $8, delivery = $9, total = $10, uncertain_fields = $11, updated_at = now() WHERE id = $1`,
      [id, vendor, result.invoice_number, result.invoice_date, result.doc_type || "invoice", result.subtotal, result.discount, result.tax, result.delivery, result.total, result.uncertain_fields || []]);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
    res.json(ExtractSupplierInvoiceResponse.parse({ status: "review" }));
  } catch (error) {
    await pool.query("UPDATE invoices SET status = 'failed', extraction_error = $2, updated_at = now() WHERE id = $1 AND status = 'extracting' AND updated_at = $3",
      [id, error instanceof Error ? error.message : "Could not read this invoice.", generation]);
    throw error;
  }
});
export default router;
