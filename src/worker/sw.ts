/// <reference lib="esnext" />
/// <reference lib="webworker" />
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
  type PrecacheEntry,
  type SerwistGlobalConfig,
} from "serwist";
import { IMAGE_CACHE, NEXT_STATIC_CACHE } from "./cache-names";
import {
  isImage,
  isNextStatic,
  isOtherNavigation,
  isRscRequest,
  isShoppingNavigation,
} from "./matchers";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/** Precached from public/, so it carries no user's data. */
const OFFLINE_PAGE = "/offline.html";
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
    { matcher: isShoppingNavigation, handler: new NetworkOnly() },
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

serwist.addEventListeners();
