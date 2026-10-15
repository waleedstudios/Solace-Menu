import type { QueryClient } from "@tanstack/react-query";
import { getGetRestaurantMenuQueryKey } from "@workspace/api-client-react";

export function refreshMenus(client: QueryClient, restaurantId: string) {
  void client.invalidateQueries({ queryKey: getGetRestaurantMenuQueryKey(restaurantId) });
  void client.invalidateQueries({ predicate: q => typeof q.queryKey[0] === "string" && q.queryKey[0].startsWith("/api/public-menu/") });
}

// Authentication changes must erase private account data, but removing an
// active anonymous menu query can cancel its fetch and strand its observer.
export function resetPrivateQueries(client: QueryClient) {
  client.removeQueries({
    predicate: q => !(typeof q.queryKey[0] === "string" && q.queryKey[0].startsWith("/api/public-menu/")),
  });
}
