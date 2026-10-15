import { clerkClient, getAuth } from "@clerk/express";
import { pool } from "@workspace/db";
import type { Request } from "express";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export type LocalUser = { id: string; email: string; full_name: string | null; onboarding_complete: boolean };

const starters: [string, number, number, number, number][] = [
  ["Chicken Breast", 165, 31, 0, 3.6], ["Salmon", 208, 20, 0, 13],
  ["White Rice (cooked)", 130, 2.7, 28, 0.3], ["Brown Rice (cooked)", 112, 2.6, 24, 0.9],
  ["Quinoa (cooked)", 120, 4.4, 21, 1.9], ["Avocado", 160, 2, 9, 15],
  ["Olive Oil", 884, 0, 0, 100], ["Cheddar Cheese", 402, 25, 1.3, 33],
  ["Mozzarella", 280, 28, 3.1, 17], ["Egg", 155, 13, 1.1, 11],
  ["Spinach", 23, 2.9, 3.6, 0.4], ["Tomato", 18, 0.9, 3.9, 0.2],
  ["Lettuce", 15, 1.4, 2.9, 0.2], ["Bread (white)", 265, 9, 49, 3.2],
  ["Pasta (cooked)", 131, 5, 25, 1.1], ["Ground Beef (lean)", 217, 26, 0, 12],
  ["Bacon", 541, 37, 1.4, 42], ["Butter", 717, 0.9, 0.1, 81],
  ["Tofu", 76, 8, 1.9, 4.8], ["Black Beans (cooked)", 132, 8.9, 24, 0.5],
  ["Sweet Potato", 86, 1.6, 20, 0.1], ["Potato", 77, 2, 17, 0.1],
  ["Almonds", 579, 21, 22, 50], ["Greek Yogurt", 59, 10, 3.6, 0.4],
  ["Honey", 304, 0.3, 82, 0],
];

// Keep the app's UUID identity separate from Clerk's provider ID. This preserves
// the imported data model and leaves a stable identity for a future data export.
export async function localUser(req: Request, required = true, allowIncomplete = false): Promise<LocalUser | null> {
  const clerkId = getAuth(req).userId;
  if (!clerkId) {
    if (required) throw new HttpError(401, "Please sign in.");
    return null;
  }
  const user = await findOrCreateIdentity(clerkId);
  if (!user.onboarding_complete && !allowIncomplete) {
    if (!required) return null;
    throw new HttpError(403, "Complete your business details before using the dashboard.");
  }
  return user;
}

async function findOrCreateIdentity(clerkId: string): Promise<LocalUser> {
  const identityFields = "id, email, full_name, onboarding_completed_at IS NOT NULL AS onboarding_complete";
  const existing = await pool.query(`SELECT ${identityFields} FROM auth_users WHERE clerk_id = $1`, [clerkId]);
  if (existing.rows[0]) return existing.rows[0];

  const clerkUser = await clerkClient.users.getUser(clerkId);
  const email = clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) throw new HttpError(400, "An email address is required.");
  const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim().slice(0, 120) || null;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [clerkId]);
    const found = await client.query(`SELECT ${identityFields} FROM auth_users WHERE clerk_id = $1`, [clerkId]);
    if (found.rows[0]) { await client.query("COMMIT"); return found.rows[0]; }
    const { rows: [user] } = await client.query(`INSERT INTO auth_users (clerk_id, email, full_name) VALUES ($1, $2, $3) RETURNING ${identityFields}`, [clerkId, email, fullName]);
    // Signing in establishes identity only. A business is created only after
    // its owner explicitly supplies and saves the business details.
    await client.query("INSERT INTO profiles (id, restaurant_name, slug, email) VALUES ($1, '', $2, $3)", [user.id, `pending-${user.id}`, email]);
    await client.query("SELECT pg_advisory_xact_lock(734201)");
    for (const [n, calories, protein, carbs, fats] of starters) {
      await client.query(`INSERT INTO ingredients (name, calories_per_100g, protein_per_100g, carbs_per_100g, fats_per_100g, nutrition_source)
        SELECT $1, $2, $3, $4, $5, 'starter' WHERE NOT EXISTS
        (SELECT 1 FROM ingredients WHERE name = $1 AND user_id IS NULL AND restaurant_id IS NULL)`, [n, calories, protein, carbs, fats]);
    }
    await client.query("COMMIT");
    return user;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally { client.release(); }
}

export async function memberRole(userId: string, restaurantId: string): Promise<string | null> {
  const result = await pool.query("SELECT role FROM restaurant_members WHERE user_id = $1 AND restaurant_id = $2", [userId, restaurantId]);
  return result.rows[0]?.role ?? null;
}
export async function authorizeRestaurant(userId: string, restaurantId: string, manage = false, owner = false): Promise<string> {
  const role = await memberRole(userId, restaurantId);
  if (!role || (manage && role === "staff") || (owner && role !== "owner")) throw new HttpError(403, "You don't have permission for this restaurant.");
  return role;
}
