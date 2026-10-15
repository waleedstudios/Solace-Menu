import { pgTable, uuid, text, timestamp, doublePrecision, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { authUsers, restaurants } from "./restaurants";
import { ingredients, portionUnits } from "./inventory";

export const menuItems = pgTable("menu_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  image_url: text("image_url"),
  is_published: boolean("is_published").default(true).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const recipeItems = pgTable("recipe_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  menu_item_id: uuid("menu_item_id").notNull().references(() => menuItems.id, { onDelete: "cascade" }),
  ingredient_id: uuid("ingredient_id").notNull().references(() => ingredients.id),
  grams: doublePrecision("grams"),
  portion_unit_id: uuid("portion_unit_id").references(() => portionUnits.id, { onDelete: "set null" }),
  portion_quantity: doublePrecision("portion_quantity"),
  is_modifier: boolean("is_modifier").default(false).notNull(),
  modifier_type: text("modifier_type"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const recipes = pgTable("recipes", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurant_id: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  image_url: text("image_url"),
  instructions: text("instructions"),
  batch_yield_qty: doublePrecision("batch_yield_qty").default(1).notNull(),
  batch_yield_unit: text("batch_yield_unit").default("g").notNull(),
  servings_per_batch: doublePrecision("servings_per_batch").default(1).notNull(),
  serving_size_text: text("serving_size_text"),
  selling_price: doublePrecision("selling_price"),
  packaging_cost: doublePrecision("packaging_cost").default(0).notNull(),
  is_published: boolean("is_published").default(false).notNull(),
  is_subrecipe: boolean("is_subrecipe").default(false).notNull(),
  public_macros: jsonb("public_macros"),
  version: integer("version").default(1).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const recipeLines = pgTable("recipe_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  recipe_id: uuid("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
  ingredient_id: uuid("ingredient_id").references(() => ingredients.id),
  sub_recipe_id: uuid("sub_recipe_id").references(() => recipes.id),
  quantity: doublePrecision("quantity").default(0).notNull(),
  unit: text("unit").default("g").notNull(),
  position: integer("position").default(0).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const recipeVersions = pgTable("recipe_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  recipe_id: uuid("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
  restaurant_id: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  snapshot: jsonb("snapshot").notNull(),
  created_by: uuid("created_by").references(() => authUsers.id, { onDelete: "set null" }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
