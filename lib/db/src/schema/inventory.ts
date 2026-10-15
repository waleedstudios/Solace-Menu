import { pgTable, uuid, text, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { authUsers, restaurants } from "./restaurants";

export const vendors = pgTable("vendors", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurant_id: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const ingredients = pgTable("ingredients", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurant_id: uuid("restaurant_id").references(() => restaurants.id, { onDelete: "cascade" }),
  user_id: uuid("user_id").references(() => authUsers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  brand: text("brand"),
  category: text("category"),
  base_unit: text("base_unit").default("g").notNull(),
  purchase_unit: text("purchase_unit"),
  supplier_code: text("supplier_code"),
  vendor_id: uuid("vendor_id").references(() => vendors.id, { onDelete: "set null" }),
  pack_count: doublePrecision("pack_count"),
  pack_size: doublePrecision("pack_size"),
  pack_unit: text("pack_unit"),
  density_g_per_ml: doublePrecision("density_g_per_ml"),
  yield_pct: doublePrecision("yield_pct").default(100).notNull(),
  current_cost: doublePrecision("current_cost"),
  current_cost_date: text("current_cost_date"),
  current_cost_invoice_id: uuid("current_cost_invoice_id"),
  calories_per_100g: doublePrecision("calories_per_100g").default(0).notNull(),
  protein_per_100g: doublePrecision("protein_per_100g").default(0).notNull(),
  carbs_per_100g: doublePrecision("carbs_per_100g").default(0).notNull(),
  fats_per_100g: doublePrecision("fats_per_100g").default(0).notNull(),
  sat_fat_per_100: doublePrecision("sat_fat_per_100"),
  fiber_per_100: doublePrecision("fiber_per_100"),
  sugar_per_100: doublePrecision("sugar_per_100"),
  added_sugar_per_100: doublePrecision("added_sugar_per_100"),
  sodium_mg_per_100: doublePrecision("sodium_mg_per_100"),
  allergens: text("allergens").array(),
  serving_size_text: text("serving_size_text"),
  servings_per_container: doublePrecision("servings_per_container"),
  nutrition_source: text("nutrition_source"),
  label_image_path: text("label_image_path"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const ingredientAliases = pgTable("ingredient_aliases", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurant_id: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  ingredient_id: uuid("ingredient_id").notNull().references(() => ingredients.id, { onDelete: "cascade" }),
  alias: text("alias").notNull(),
  vendor_name: text("vendor_name"),
  product_code: text("product_code"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const portionUnits = pgTable("portion_units", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  average_grams: doublePrecision("average_grams").notNull(),
  min_grams: doublePrecision("min_grams"),
  max_grams: doublePrecision("max_grams"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
