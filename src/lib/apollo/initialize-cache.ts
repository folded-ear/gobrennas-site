import { InMemoryCache } from "@apollo/client";
import { InitializeCacheDocument } from "./__generated__/initializeCache.generated";

type InitialData = {
  deviceKey: string;
};

export function initializeCache(cache: InMemoryCache, data: InitialData) {
  cache.writeQuery({
    query: InitializeCacheDocument,
    data,
    broadcast: false,
  });
}
