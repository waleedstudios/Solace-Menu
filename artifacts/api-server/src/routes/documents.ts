import { Readable } from "node:stream";
import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import {
  RequestUploadUrlBody, RequestUploadUrlResponse, CompleteUploadBody,
  GetDocumentUrlBody, GetDocumentUrlResponse, RemoveDocumentsBody, GetDocumentParams,
} from "@workspace/api-zod";
import { localUser, authorizeRestaurant, HttpError } from "../lib/auth";
import { authorizedDocument, documentStorage } from "../lib/documents";
import { ObjectNotFoundError } from "../lib/objectStorage";

const router: IRouter = Router();
router.post("/storage/uploads/request-url", async (req, res): Promise<void> => {
  const user = (await localUser(req))!;
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "Upload a PDF, JPG, PNG, or WEBP up to 20 MB.");
  const { logicalPath, name, size, contentType } = parsed.data;
  if (!/^[0-9a-f-]{36}\/[a-zA-Z0-9_./-]+$/.test(logicalPath) || logicalPath.includes("..")) throw new HttpError(400, "Invalid document path.");
  const restaurantId = logicalPath.split("/")[0];
  await authorizeRestaurant(user.id, restaurantId);
  if ((await pool.query("SELECT 1 FROM stored_files WHERE logical_path = $1", [logicalPath])).rowCount) throw new HttpError(409, "A document already exists at this path.");
  const uploadURL = await documentStorage.getObjectEntityUploadURL();
  // Recheck after signing: a deletion requested while storage was responding
  // must not issue a fresh upload link for a frozen business.
  await authorizeRestaurant(user.id, restaurantId);
  const objectPath = documentStorage.normalizeObjectEntityPath(uploadURL);
  await pool.query(`INSERT INTO stored_files (logical_path, object_path, restaurant_id, uploaded_by, content_type, name, size)
    VALUES ($1, $2, $3, $4, $5, $6, $7)`, [logicalPath, objectPath, restaurantId, user.id, contentType, name, size]);
  res.json(RequestUploadUrlResponse.parse({ uploadURL, objectPath }));
});

router.post("/storage/uploads/complete", async (req, res): Promise<void> => {
  const user = (await localUser(req))!;
  const parsed = CompleteUploadBody.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "A document path is required.");
  const record = await authorizedDocument(user.id, parsed.data.path);
  try {
    const file = await documentStorage.getObjectEntityFile(record.object_path);
    const [metadata] = await file.getMetadata();
    if (Number(metadata.size) > 20971520 || Number(metadata.size) !== record.size || metadata.contentType !== record.content_type) {
      await file.delete({ ignoreNotFound: true });
      await pool.query("DELETE FROM stored_files WHERE id = $1", [record.id]);
      throw new HttpError(400, "The uploaded file size or type is invalid.");
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) throw new HttpError(404, "The upload has not completed.");
    throw error;
  }
  res.json({ path: record.logical_path });
});

router.post("/storage/documents/url", async (req, res): Promise<void> => {
  const user = (await localUser(req))!;
  const parsed = GetDocumentUrlBody.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "A document path is required.");
  const record = await authorizedDocument(user.id, parsed.data.path);
  // The browser URL is authenticated on every request, rather than exposing
  // a bearer URL that another person could use after a team member is removed.
  res.json(GetDocumentUrlResponse.parse({ signedUrl: `/api/storage/documents/${record.id}` }));
});

router.get("/storage/documents/:fileId", async (req, res): Promise<void> => {
  const user = (await localUser(req))!;
  const parsed = GetDocumentParams.safeParse(req.params);
  if (!parsed.success) throw new HttpError(400, "Invalid document.");
  const record = (await pool.query("SELECT * FROM stored_files WHERE id = $1", [parsed.data.fileId])).rows[0];
  if (!record) throw new HttpError(404, "Document not found.");
  await authorizeRestaurant(user.id, record.restaurant_id);
  const file = await documentStorage.getObjectEntityFile(record.object_path);
  const response = await documentStorage.downloadObject(file);
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Content-Type", record.content_type);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Disposition", `inline; filename="${record.name.replace(/[^a-zA-Z0-9._ -]/g, "_")}"`);
  if (response.body) Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res);
  else res.end();
});

router.post("/storage/documents/remove", async (req, res): Promise<void> => {
  const user = (await localUser(req))!;
  const parsed = RemoveDocumentsBody.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "Invalid document paths.");
  for (const path of parsed.data.paths) {
    const record = await authorizedDocument(user.id, path);
    if (record.uploaded_by !== user.id) await authorizeRestaurant(user.id, record.restaurant_id, true);
    try { const file = await documentStorage.getObjectEntityFile(record.object_path); await file.delete({ ignoreNotFound: true }); }
    catch (error) { if (!(error instanceof ObjectNotFoundError)) throw error; }
    await pool.query("DELETE FROM stored_files WHERE id = $1", [record.id]);
  }
  res.json({ removed: true });
});

router.get("/storage/public-objects/*filePath", async (req, res): Promise<void> => {
  const raw = req.params.filePath;
  const path = Array.isArray(raw) ? raw.join("/") : raw;
  if (!path || path.includes("..")) throw new HttpError(400, "Invalid asset path.");
  const file = await documentStorage.searchPublicObject(path);
  if (!file) throw new HttpError(404, "Asset not found.");
  const response = await documentStorage.downloadObject(file);
  response.headers.forEach((value, key) => res.setHeader(key, value));
  if (response.body) Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res);
  else res.end();
});

export default router;
