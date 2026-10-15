import { Router } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { pool } from "@workspace/db";
import { DeleteAccountBody, DiscoverRestaurantsQueryParams, DiscoverRestaurantsResponse } from "@workspace/api-zod";
import { HttpError } from "../lib/auth";
import { processAccountDeletions } from "../lib/accountDeletion";

const router = Router();
router.get("/public/restaurants", async (req, res) => {
  const parsed = DiscoverRestaurantsQueryParams.safeParse(req.query);
  if (!parsed.success) throw new HttpError(400, "Search with up to 100 characters.");
  const term = (parsed.data.q ?? "").trim().replace(/[\\%_]/g, "\\$&");
  const result = await pool.query(`WITH visible AS (SELECT p.restaurant_name AS name, p.slug,
    ((SELECT count(*) FROM recipes x JOIN restaurants r ON r.id = x.restaurant_id
      WHERE r.owner_id = p.id AND x.is_published AND NOT x.is_subrecipe)
      + (SELECT count(*) FROM menu_items m WHERE m.user_id = p.id AND m.is_published))::int AS item_count
    FROM profiles p WHERE p.restaurant_name <> '' AND p.slug NOT LIKE 'pending-%'
      AND p.restaurant_name ILIKE $1
      AND NOT EXISTS (SELECT 1 FROM account_deletions d WHERE d.user_id = p.id)
    ) SELECT * FROM visible WHERE item_count > 0 ORDER BY lower(name), slug LIMIT 100`, [`%${term}%`]);
  res.setHeader("Cache-Control", "no-store");
  res.json(DiscoverRestaurantsResponse.parse({ restaurants: result.rows.filter(r => r.item_count > 0) }));
});
router.delete("/account", async (req, res) => {
  const auth = getAuth(req);
  if (!auth.userId || !auth.sessionId) throw new HttpError(401, "Please sign in.");
  if (!DeleteAccountBody.safeParse(req.body).success) throw new HttpError(400, "Type DELETE to confirm permanent deletion.");
  const session = await clerkClient.sessions.getSession(auth.sessionId);
  if (Date.now() - session.createdAt > 10 * 60_000) throw new HttpError(403, "For your security, sign out and sign back in before deleting your account.");
  const found = await pool.query("SELECT id FROM auth_users WHERE clerk_id = $1", [auth.userId]);
  if (!found.rows[0]) {
    await clerkClient.users.deleteUser(auth.userId);
    res.json({ status: "deleted" }); return;
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`INSERT INTO account_deletions (clerk_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [auth.userId, found.rows[0].id]);
    await client.query("UPDATE recipes SET is_published = false WHERE restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = $1)", [found.rows[0].id]);
    await client.query("UPDATE menu_items SET is_published = false WHERE user_id = $1", [found.rows[0].id]);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
  await processAccountDeletions(auth.userId);
  const remaining = await pool.query("SELECT 1 FROM account_deletions WHERE clerk_id = $1", [auth.userId]);
  res.json({ status: remaining.rowCount ? "pending" : "deleted" });
});
export default router;
