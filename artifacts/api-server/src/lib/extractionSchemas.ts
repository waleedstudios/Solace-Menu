const num = { type: ["number", "null"] };
const str = { type: ["string", "null"] };
const invoice = {
  type: "object",
  properties: {
    vendor_name: str, invoice_number: str, invoice_date: { ...str, description: "YYYY-MM-DD" },
    doc_type: { type: "string", enum: ["invoice", "credit_note", "return", "corrected_invoice"] },
    subtotal: num, discount: num, tax: num, delivery: num, total: num,
    uncertain_fields: { type: "array", items: { type: "string" } },
    lines: {
      type: "array", items: {
        type: "object", properties: {
          description: { type: "string" }, product_code: str,
          quantity: { ...num, description: "Purchase units bought; negative for credits/returns" },
          pack_count: { ...num, description: "Inner units per purchase unit" },
          pack_size: { ...num, description: "Size of each inner unit" },
          pack_unit: { type: ["string", "null"], enum: ["g", "kg", "oz", "lb", "ml", "l", "fl_oz", "gal", "each", null] },
          unit_price: num, line_total: num, uncertain: { type: "boolean" }, uncertain_note: str,
        }, required: ["description", "uncertain"],
      },
    },
  }, required: ["lines", "doc_type", "uncertain_fields"],
};
const label = {
  type: "object", properties: {
    product_name: str, brand: str, serving_size_text: str,
    serving_size_amount: { ...num, description: "Serving size in grams or milliliters, only if printed" },
    serving_size_unit: { type: ["string", "null"], enum: ["g", "ml", null] },
    servings_per_container: num, calories: num, protein_g: num, carbs_g: num, fat_g: num,
    sat_fat_g: num, fiber_g: num, sugar_g: num, added_sugar_g: num, sodium_mg: num,
    allergens_statement: { ...str, description: "Exact printed Contains statement, otherwise null" },
    uncertain_fields: { type: "array", items: { type: "string" } },
  }, required: ["uncertain_fields"],
};
const menu = {
  type: "object", properties: {
    items: {
      type: "array", items: {
        type: "object", properties: {
          name: { type: "string" }, description: str, category: str,
          price: { ...num, description: "Printed price, number only" },
          ingredients: { type: "array", items: { type: "string" }, description: "Only printed or explicitly named ingredients" },
        }, required: ["name", "ingredients"],
      },
    },
  }, required: ["items"],
};

function strict(schema: any): any {
  if (schema.type === "object") {
    const properties: Record<string, any> = {};
    for (const [key, value] of Object.entries<any>(schema.properties)) {
      let property = strict(value);
      if (!(schema.required ?? []).includes(key) && typeof property.type === "string") property = { ...property, type: [property.type, "null"] };
      if (property.enum && Array.isArray(property.type) && property.type.includes("null") && !property.enum.includes(null)) property.enum = [...property.enum, null];
      properties[key] = property;
    }
    return { type: "object", properties, required: Object.keys(properties), additionalProperties: false };
  }
  return schema.type === "array" ? { ...schema, items: strict(schema.items) } : schema;
}
export const extractionSchemas = { invoice: strict(invoice), label: strict(label), menu: strict(menu) };
export const extractionPrompts = {
  invoice: "Extract this supplier invoice / receipt (all pages). Read only what is printed; use null for anything not visible. Never guess pack sizes. Flag any field you are unsure of. Credits/returns use negative quantities and totals.",
  menu: "Extract every dish on this restaurant menu. Copy names, descriptions, categories and prices as printed. List only ingredients that are printed or explicitly part of the dish name/description; never invent quantities.",
  label: "Extract this nutrition facts label. Read only printed values; use null when absent. Do not infer allergens; only copy a printed Contains statement.",
};
