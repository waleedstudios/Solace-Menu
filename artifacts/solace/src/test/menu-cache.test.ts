import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { getGetPublicMenuQueryKey, getGetRestaurantMenuQueryKey } from "@workspace/api-client-react";
import { resetPrivateQueries } from "@/lib/menu-cache";

describe("authentication cache boundaries", () => {
  it("keeps a pending anonymous menu fetch alive while clearing private data", async () => {
    const client = new QueryClient();
    const publicKey = getGetPublicMenuQueryKey("fixture");
    const privateKey = getGetRestaurantMenuQueryKey("private-restaurant");
    client.setQueryData(privateKey, { private: true });
    let finish!: (value: { items: string[] }) => void;
    const pending = client.fetchQuery({
      queryKey: publicKey,
      retry: false,
      queryFn: ({ signal }) => new Promise<{ items: string[] }>((resolve, reject) => {
        finish = resolve;
        signal.addEventListener("abort", () => reject(new Error("Public menu fetch was cancelled")));
      }),
    });
    resetPrivateQueries(client);
    expect(client.getQueryData(privateKey)).toBeUndefined();
    expect(client.getQueryState(publicKey)?.fetchStatus).toBe("fetching");
    finish({ items: ["Guest dish"] });
    await expect(pending).resolves.toEqual({ items: ["Guest dish"] });
    expect(client.getQueryData(publicKey)).toEqual({ items: ["Guest dish"] });
    client.clear();
  });

  it("retains loaded public menus across sign-out and onboarding resets", () => {
    const client = new QueryClient();
    const publicKey = getGetPublicMenuQueryKey("fixture");
    client.setQueryData(publicKey, { items: ["Guest dish"] });
    client.setQueryData(["account-data"], { owner: "old-session" });
    resetPrivateQueries(client);
    resetPrivateQueries(client);
    expect(client.getQueryData(publicKey)).toEqual({ items: ["Guest dish"] });
    expect(client.getQueryData(["account-data"])).toBeUndefined();
    client.clear();
  });
});
