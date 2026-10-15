import { clerkClient } from "@clerk/express";
import { pool } from "@workspace/db";
import { documentStorage } from "./documents";
import { ObjectNotFoundError } from "./objectStorage";
import { logger } from "./logger";

// Durable retry state bridges Clerk, PostgreSQL and private object storage.
// Never delete another restaurant's documents when a staff member leaves.
export async function initializeAccountDeletion() {
  await pool.query(`CREATE TABLE IF NOT EXISTS account_deletions (
    clerk_id text PRIMARY KEY, user_id uuid NOT NULL, requested_at timestamptz NOT NULL DEFAULT now()
  )`);
  const retry = () => { void processAccountDeletions().catch(err => logger.error({ err }, "Account deletion retry unavailable")); };
  const timer = setInterval(retry, 60_000);
  timer.unref();
  retry();
}

export async function processAccountDeletions(onlyClerkId?: string) {
  // Upload links last 15 minutes. Freeze access immediately, then let previously
  // issued links expire before the final object purge so late uploads cannot
  // recreate orphaned files after their metadata has been removed.
  const jobs = await pool.query("SELECT * FROM account_deletions WHERE requested_at <= now() - interval '20 minutes' AND ($1::text IS NULL OR clerk_id = $1) ORDER BY requested_at LIMIT 5", [onlyClerkId ?? null]);
  for (const job of jobs.rows) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await client.query("SELECT pg_try_advisory_xact_lock(hashtext($1)) AS acquired", [`delete:${job.clerk_id}`]);
      if (!locked.rows[0].acquired) { await client.query("ROLLBACK"); continue; }
      const files = await client.query(`SELECT f.object_path FROM stored_files f JOIN restaurants r ON r.id = f.restaurant_id WHERE r.owner_id = $1`, [job.user_id]);
      for (const file of files.rows) {
        try { await (await documentStorage.getObjectEntityFile(file.object_path)).delete({ ignoreNotFound: true }); }
        catch (error) { if (!(error instanceof ObjectNotFoundError)) throw error; }
      }
      // Remove only the person's attribution, not other businesses' records.
      await client.query(`UPDATE stored_files f SET uploaded_by = r.owner_id FROM restaurants r
        WHERE f.restaurant_id = r.id AND f.uploaded_by = $1 AND r.owner_id <> $1`, [job.user_id]);
      await client.query(`UPDATE ingredients i SET user_id = r.owner_id FROM restaurants r
        WHERE i.restaurant_id = r.id AND i.user_id = $1 AND r.owner_id <> $1`, [job.user_id]);
      await client.query("DELETE FROM menu_items WHERE user_id = $1", [job.user_id]);
      await client.query("DELETE FROM restaurants WHERE owner_id = $1", [job.user_id]);
      await client.query("DELETE FROM auth_users WHERE id = $1 AND clerk_id = $2", [job.user_id, job.clerk_id]);
      try { await clerkClient.users.deleteUser(job.clerk_id); }
      catch (error) { if ((error as { status?: number }).status !== 404) throw error; }
      await client.query("DELETE FROM account_deletions WHERE clerk_id = $1", [job.clerk_id]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error({ err: error }, "Account deletion will retry");
    } finally { client.release(); }
  }
}
