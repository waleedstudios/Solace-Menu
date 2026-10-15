import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { ExtractDocumentBody, ExtractDocumentResponse } from "@workspace/api-zod";
import { localUser, authorizeRestaurant, HttpError } from "../lib/auth";
import { authorizedDocument, documentStorage } from "../lib/documents";
import { extractionSchemas, extractionPrompts } from "../lib/extractionSchemas";

const router: IRouter = Router();
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});
router.post("/extract-document", async (req, res): Promise<void> => {
  const user = (await localUser(req))!;
  const parsed = ExtractDocumentBody.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "Choose up to 10 documents.");
  const { kind, restaurant_id, paths } = parsed.data;
  await authorizeRestaurant(user.id, restaurant_id, kind !== "invoice");
  const content: any[] = [{ type: "input_text", text: extractionPrompts[kind] }];
  let totalSize = 0;
  for (const path of paths) {
    const record = await authorizedDocument(user.id, path);
    if (record.restaurant_id !== restaurant_id) throw new HttpError(403, "The document belongs to another restaurant.");
    totalSize += record.size;
    if (totalSize > 52428800) throw new HttpError(400, "Use documents totaling no more than 50 MB.");
    const file = await documentStorage.getObjectEntityFile(record.object_path);
    const [bytes] = await file.download();
    const dataUrl = `data:${record.content_type};base64,${bytes.toString("base64")}`;
    content.push(record.content_type === "application/pdf"
      ? { type: "input_file", filename: record.name, file_data: dataUrl }
      : { type: "input_image", image_url: dataUrl });
  }
  try {
    const response = await openai.responses.create({
      model: "gpt-6-astra", store: false, reasoning: { effort: "low" },
      input: [{ role: "user", content }],
      text: { format: { type: "json_schema", name: "record", strict: true, schema: extractionSchemas[kind] } },
    });
    if (!response.output_text) throw new HttpError(422, "Nothing could be extracted.");
    res.json(ExtractDocumentResponse.parse({ data: JSON.parse(response.output_text) }));
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (error instanceof OpenAI.APIError && error.status === 429) throw new HttpError(429, "AI is busy. Try again in a minute.");
    if (error instanceof OpenAI.APIError && error.status === 402) throw new HttpError(402, "AI credits are exhausted.");
    req.log.error({ err: error }, "Document extraction failed");
    throw new HttpError(502, "Document extraction failed. Please try again.");
  }
});
export default router;
