import { approveSupplierInvoice, type InvoiceApprovalResult } from "@workspace/api-client-react";
export { suggestMatch, lineUnitCost, totalsCheck, STATUS_LABEL, DOC_LABEL, type InvLine, type MatchIng, type Alias } from "@workspace/recipe-engine/invoices";
export { UNITS } from "@workspace/recipe-engine/units";
export type PriceChange = InvoiceApprovalResult["changes"][number];

export async function sha256(file: File) {
  const buf = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

// The server reads persisted invoice lines; caller-supplied prices and identity
// are never used to approve a purchase.
export async function approveInvoice(invoiceId: string, acceptTotalMismatch = false) {
  try {
    const result = await approveSupplierInvoice(invoiceId, { accept_total_mismatch: acceptTotalMismatch });
    return { ok: true, errors: [] as string[], changes: result.changes };
  } catch (error) {
    const e = error as { data?: { error?: { message?: string } }; message?: string };
    return { ok: false, errors: [e.data?.error?.message || e.message || "Approval failed. Please try again."], changes: [] as PriceChange[] };
  }
}
