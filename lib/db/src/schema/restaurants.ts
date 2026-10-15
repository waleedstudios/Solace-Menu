import { pgTable, uuid, text, timestamp, doublePrecision, integer, uniqueIndex } from "drizzle-orm/pg-core";

export const authUsers = pgTable("auth_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerk_id: text("clerk_id").notNull().unique(),
  email: text("email").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().references(() => authUsers.id, { onDelete: "cascade" }),
  restaurant_name: text("restaurant_name").notNull(),
  slug: text("slug").notNull().unique(),
  email: text("email"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const restaurants = pgTable("restaurants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  owner_id: uuid("owner_id").notNull().references(() => authUsers.id),
  price_alert_threshold_pct: doublePrecision("price_alert_threshold_pct").default(5).notNull(),
  invoice_retention_days: integer("invoice_retention_days"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const restaurantMembers = pgTable("restaurant_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurant_id: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  user_id: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  role: text("role").default("staff").notNull(),
  email: text("email"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [uniqueIndex("restaurant_members_restaurant_user").on(t.restaurant_id, t.user_id)]);

export const locations = pgTable("locations", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurant_id: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  address: text("address"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const userRoles = pgTable("user_roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
});

export const storedFiles = pgTable("stored_files", {
  id: uuid("id").defaultRandom().primaryKey(),
  logical_path: text("logical_path").notNull().unique(),
  object_path: text("object_path").notNull().unique(),
  restaurant_id: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  uploaded_by: uuid("uploaded_by").notNull().references(() => authUsers.id),
  content_type: text("content_type").notNull(),
  name: text("name").notNull(),
  size: integer("size").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
