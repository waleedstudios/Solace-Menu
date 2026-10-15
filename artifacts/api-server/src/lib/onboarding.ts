import { pool } from "@workspace/db";
import type { LocalUser } from "./auth";

export type BusinessDetails = {
  full_name: string;
  email: string;
  business_name: string;
  business_address: string;
  business_phone: string;
};

export async function accountView(user: LocalUser) {
  const restaurant = (await pool.query("SELECT name, address, phone FROM restaurants WHERE owner_id = $1 ORDER BY created_at LIMIT 1", [user.id])).rows[0];
  return {
    ...user,
    business_name: restaurant?.name ?? null,
    business_address: restaurant?.address ?? null,
    business_phone: restaurant?.phone ?? null,
  };
}

export async function completeBusinessSetup(user: LocalUser, details: BusinessDetails): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const identity = (await client.query("SELECT onboarding_completed_at FROM auth_users WHERE id = $1 FOR UPDATE", [user.id])).rows[0];
    // A repeated submission cannot create a second restaurant or replace a
    // completed setup. Account settings remain a separate owner-only flow.
    if (identity.onboarding_completed_at) { await client.query("COMMIT"); return; }
    let restaurant = (await client.query("SELECT id FROM restaurants WHERE owner_id = $1 ORDER BY created_at LIMIT 1 FOR UPDATE", [user.id])).rows[0];
    if (restaurant) {
      await client.query("UPDATE restaurants SET name = $2, address = $3, phone = $4 WHERE id = $1", [restaurant.id, details.business_name, details.business_address, details.business_phone]);
    } else {
      restaurant = (await client.query("INSERT INTO restaurants (owner_id, name, address, phone) VALUES ($1, $2, $3, $4) RETURNING id", [user.id, details.business_name, details.business_address, details.business_phone])).rows[0];
      await client.query("INSERT INTO restaurant_members (restaurant_id, user_id, role, email) VALUES ($1, $2, 'owner', $3)", [restaurant.id, user.id, user.email]);
    }
    const location = (await client.query("SELECT id FROM locations WHERE restaurant_id = $1 ORDER BY created_at LIMIT 1", [restaurant.id])).rows[0];
    if (location) await client.query("UPDATE locations SET address = $2 WHERE id = $1", [location.id, details.business_address]);
    else await client.query("INSERT INTO locations (restaurant_id, name, address) VALUES ($1, 'Main location', $2)", [restaurant.id, details.business_address]);
    const profile = (await client.query("SELECT slug FROM profiles WHERE id = $1 FOR UPDATE", [user.id])).rows[0];
    let slug = profile?.slug;
    if (!slug || slug.startsWith("pending-")) {
      const base = details.business_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "restaurant";
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`solace-slug:${base}`]);
      slug = base;
      for (let i = 1; (await client.query("SELECT 1 FROM profiles WHERE slug = $1 AND id <> $2", [slug, user.id])).rowCount; i++) slug = `${base}-${i}`;
    }
    await client.query(`INSERT INTO profiles (id, restaurant_name, slug, email) VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET restaurant_name = EXCLUDED.restaurant_name, slug = EXCLUDED.slug, email = EXCLUDED.email, updated_at = now()`,
      [user.id, details.business_name, slug, user.email]);
    await client.query("UPDATE auth_users SET full_name = $2, onboarding_completed_at = now() WHERE id = $1", [user.id, details.full_name]);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}
