import { pgTable, uuid, text, timestamp, doublePrecision, integer, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { authUsers, restaurants, locations } from "./restaurants";
import { recipes } from "./recipes";

export const salesImports = pgTable("sales_imports", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurant_id: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  location_id: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),
  file_name: text("file_name"),
  row_count: integer("row_count").default(0).notNull(),
  period_start: text("period_start"),
  period_end: text("period_end"),
  created_by: uuid("created_by").references(() => authUsers.id, { onDelete: "set null" }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const salesLines = pgTable("sales_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  import_id: uuid("import_id").notNull().references(() => salesImports.id, { onDelete: "cascade" }),
  restaurant_id: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  location_id: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),
  sale_date: text("sale_date"),
  item_name: text("item_name").notNull(),
  quantity: doublePrecision("quantity").default(0).notNull(),
  net_sales: doublePrecision("net_sales").default(0).notNull(),
  discounts: doublePrecision("discounts").default(0).notNull(),
  refunds: doublePrecision("refunds").default(0).notNull(),
  modifiers: text("modifiers"),
});

export const salesMappings = pgTable("sales_mappings", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurant_id: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  sales_item_name: text("sales_item_name").notNull(),
  recipe_id: uuid("recipe_id").references(() => recipes.id, { onDelete: "set null" }),
  ignored: boolean("ignored").default(false).notNull(),
}, (t) => [uniqueIndex("sales_mappings_restaurant_item").on(t.restaurant_id, t.sales_item_name)]);
