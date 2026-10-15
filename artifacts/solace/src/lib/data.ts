import type { Database } from "./data.types";

type Result<T> = { data: T | null; error: { message: string } | null };
type Tables = Database["public"]["Tables"];
type Row<K extends keyof Tables> = Tables[K]["Row"];
type Filter = { column: string; operator: "eq" | "neq" | "in"; value: unknown };
type Order = { column: string; ascending?: boolean; nullsFirst?: boolean };

async function request(path: string, body: unknown): Promise<any> {
  const response = await fetch(`/api${path}`, {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : result.error?.message ?? "Request failed.");
  return result;
}

// A small typed data client preserves the imported query flows without the
// Supabase SDK or any requests to its hosted platform.
class Query<T> implements PromiseLike<Result<T[]>> {
  private operation = "select";
  private selection = "*";
  private filters: Filter[] = [];
  private orders: Order[] = [];
  private maxRows?: number;
  private payload?: unknown;
  private onConflict?: string;
  constructor(private table: string) {}
  select(selection = "*") { this.selection = selection; return this; }
  eq(column: string, value: unknown) { this.filters.push({ column, operator: "eq", value }); return this; }
  neq(column: string, value: unknown) { this.filters.push({ column, operator: "neq", value }); return this; }
  in(column: string, value: unknown[]) { this.filters.push({ column, operator: "in", value }); return this; }
  order(column: string, options: Omit<Order, "column"> = {}) { this.orders.push({ column, ...options }); return this; }
  limit(value: number) { this.maxRows = value; return this; }
  insert(payload: unknown) { this.operation = "insert"; this.payload = payload; return this; }
  update(payload: unknown) { this.operation = "update"; this.payload = payload; return this; }
  delete() { this.operation = "delete"; return this; }
  upsert(payload: unknown, options: { onConflict?: string } = {}) { this.operation = "upsert"; this.payload = payload; this.onConflict = options.onConflict; return this; }
  private async run<R>(single?: string): Promise<Result<R>> {
    try {
      return await request("/data/query", { table: this.table, operation: this.operation, selection: this.selection, filters: this.filters, orders: this.orders, limit: this.maxRows, payload: this.payload, onConflict: this.onConflict, single });
    } catch (error) { return { data: null, error: { message: error instanceof Error ? error.message : "Request failed." } }; }
  }
  single(): Promise<Result<T>> { return this.run<T>("single"); }
  maybeSingle(): Promise<Result<T>> { return this.run<T>("maybeSingle"); }
  then<TResult1 = Result<T[]>, TResult2 = never>(
    onfulfilled?: ((value: Result<T[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> { return this.run<T[]>().then(onfulfilled, onrejected); }
}

async function safe<R>(call: () => Promise<R>): Promise<Result<R>> {
  try { return { data: await call(), error: null }; }
  catch (error) { return { data: null, error: { message: error instanceof Error ? error.message : "Request failed." } }; }
}

export const dataApi = {
  from<K extends keyof Tables>(table: K) { return new Query<Row<K>>(table); },
  async rpc<K extends keyof Database["public"]["Functions"]>(name: K, args: Database["public"]["Functions"][K]["Args"]): Promise<Result<Database["public"]["Functions"][K]["Returns"]>> {
    try { return await request("/data/rpc", { name, args }); }
    catch (error) { return { data: null, error: { message: error instanceof Error ? error.message : "Request failed." } }; }
  },
  functions: {
    invoke(name: string, options: { body: unknown }) {
      return safe<any>(() => {
        if (name !== "extract-document") throw new Error("Unknown function.");
        return request("/extract-document", options.body);
      });
    },
  },
  storage: {
    from(_bucket: string) {
      return {
        upload(path: string, file: File, options: { contentType?: string } = {}) {
          return safe(async () => {
            const destination = await request("/storage/uploads/request-url", { logicalPath: path, name: file.name, size: file.size, contentType: options.contentType || file.type });
            const upload = await fetch(destination.uploadURL, { method: "PUT", body: file, headers: { "Content-Type": options.contentType || file.type } });
            if (!upload.ok) throw new Error("The file could not be uploaded. Please try again.");
            await request("/storage/uploads/complete", { path });
            return { path };
          });
        },
        createSignedUrl(path: string, _expiresIn: number) {
          return safe<{ signedUrl: string }>(() => request("/storage/documents/url", { path }));
        },
        remove(paths: string[]) { return safe(() => request("/storage/documents/remove", { paths })); },
      };
    },
  },
};
