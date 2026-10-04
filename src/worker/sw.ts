/// <reference lib="esnext" />
/// <reference lib="webworker" />
import {
  CacheableResponsePlugin,
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
  type PrecacheEntry,
  type SerwistGlobalConfig,
} from "serwist";
import {
  IMAGE_CACHE,
  NEXT_STATIC_CACHE,
  SHOPPING_PAGE_CACHE,
} from "./cache-names";
import {
  isImage,
  isNextStatic,
  isOtherNavigation,
  isRscRequest,
  isShoppingNavigation,
  SHOPPING_PATH,
} from "./matchers";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/** Precached from public/, so it carries no user's data. */
const OFFLINE_PAGE = "/offline.html";
const SHOPPING_NETWORK_TIMEOUT_SECONDS = 5;
const HTTP_OK = 200;
const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;
const MAX_STATIC_ENTRIES = 300;
const MAX_IMAGE_ENTRIES = 150;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // A new worker waits, so the page can offer the update and send its held
  // changes first.
  skipWaiting: false,
  clientsClaim: true,
  runtimeCaching: [
    { matcher: isRscRequest, handler: new NetworkOnly() },
    {
      matcher: isShoppingNavigation,
      handler: new NetworkFirst({
        cacheName: SHOPPING_PAGE_CACHE,
        networkTimeoutSeconds: SHOPPING_NETWORK_TIMEOUT_SECONDS,
        // A signed-out or failed render never replaces a good page.
        plugins: [new CacheableResponsePlugin({ statuses: [HTTP_OK] })],
        matchOptions: { ignoreVary: true },
      }),
    },
    { matcher: isOtherNavigation, handler: new NetworkOnly() },
    {
      matcher: isNextStatic,
      handler: new CacheFirst({
        cacheName: NEXT_STATIC_CACHE,
        plugins: [
          new ExpirationPlugin({
            maxEntries: MAX_STATIC_ENTRIES,
            maxAgeSeconds: THIRTY_DAYS_SECONDS,
          }),
        ],
      }),
    },
    {
      matcher: isImage,
      handler: new StaleWhileRevalidate({
        cacheName: IMAGE_CACHE,
        plugins: [
          new ExpirationPlugin({
            maxEntries: MAX_IMAGE_ENTRIES,
            maxAgeSeconds: THIRTY_DAYS_SECONDS,
          }),
        ],
      }),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: OFFLINE_PAGE,
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

/**
 * I keep the cached shopping page from this worker's build: fetched again,
 * or gone, so it never loads bundles this build no longer has.
 */
async function refreshShoppingPage() {
  const cache = await caches.open(SHOPPING_PAGE_CACHE);
  try {
    const response = await fetch(SHOPPING_PATH);
    if (response.status === HTTP_OK) {
      await cache.put(SHOPPING_PATH, response);
      return;
    }
  } catch {
    // Unreachable: the old page goes, as below.
  }
  await cache.delete(SHOPPING_PATH, { ignoreVary: true });
}

self.addEventListener("activate", (event) =>
  event.waitUntil(refreshShoppingPage()),
);

serwist.addEventListeners();
