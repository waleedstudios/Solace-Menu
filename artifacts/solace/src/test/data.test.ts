import { afterEach, describe, expect, it, vi } from "vitest";
import { dataApi } from "../lib/data";

afterEach(() => vi.unstubAllGlobals());

describe("Replit data transport", () => {
  it("preserves filters, sorting, and the data envelope", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [{ id: "ingredient", name: "Rice" }], error: null }) });
    vi.stubGlobal("fetch", fetchMock);
    const result = await dataApi.from("ingredients").select("id,name").eq("restaurant_id", "restaurant").order("name").limit(50);
    expect(result.data?.[0].name).toBe("Rice");
    expect(fetchMock).toHaveBeenCalledWith("/api/data/query", expect.objectContaining({ credentials: "include" }));
    const input = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(input).toMatchObject({ table: "ingredients", operation: "select", filters: [{ column: "restaurant_id", operator: "eq", value: "restaurant" }], orders: [{ column: "name" }], limit: 50 });
  });

  it("sends create and single-record behavior together", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { id: "recipe", name: "Soup" }, error: null }) });
    vi.stubGlobal("fetch", fetchMock);
    const result = await dataApi.from("recipes").insert({ name: "Soup", restaurant_id: "restaurant" }).select("id").single();
    expect(result.data?.id).toBe("recipe");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ operation: "insert", single: "single", payload: { name: "Soup" } });
  });

  it("surfaces authorization failures instead of reporting a save", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: { message: "Forbidden" } }) }));
    const result = await dataApi.from("recipes").update({ name: "Soup" }).eq("id", "recipe");
    expect(result).toEqual({ data: null, error: { message: "Forbidden" } });
  });

  it("preserves the extraction function's nested payload", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { lines: [], doc_type: "invoice" } }) }));
    const result = await dataApi.functions.invoke("extract-document", { body: { kind: "invoice" } });
    expect(result.data.data.doc_type).toBe("invoice");
  });
});
