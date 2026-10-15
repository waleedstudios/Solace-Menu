import { getTableColumns } from "drizzle-orm";
import {
  profiles, restaurants, restaurantMembers, locations, ingredients, ingredientAliases, portionUnits,
  menuItems, recipeItems, recipes, recipeLines, recipeVersions, invoices, invoiceLines, priceHistory,
  salesImports, salesLines, salesMappings, vendors,
} from "@workspace/db";

export const dataTables = {
  profiles, restaurants, restaurant_members: restaurantMembers, locations, ingredients,
  ingredient_aliases: ingredientAliases, portion_units: portionUnits, menu_items: menuItems,
  recipe_items: recipeItems, recipes, recipe_lines: recipeLines, recipe_versions: recipeVersions,
  invoices, invoice_lines: invoiceLines, price_history: priceHistory, sales_imports: salesImports,
  sales_lines: salesLines, sales_mappings: salesMappings, vendors,
};
export type TableName = keyof typeof dataTables;
export function columnsFor(table: TableName): Set<string> {
  return new Set(Object.keys(getTableColumns(dataTables[table])));
}
export function isTable(value: string): value is TableName {
  return Object.prototype.hasOwnProperty.call(dataTables, value);
}
