import { pool } from "@workspace/db";
import { authorizeRestaurant, HttpError } from "./auth";
import { ObjectStorageService } from "./objectStorage";

export const documentStorage = new ObjectStorageService();
export async function authorizedDocument(userId: string, logicalPath: string, manage = false) {
  const file = (await pool.query("SELECT * FROM stored_files WHERE logical_path = $1", [logicalPath])).rows[0];
  if (!file) throw new HttpError(404, "Document not found.");
  await authorizeRestaurant(userId, file.restaurant_id, manage);
  return file;
}
