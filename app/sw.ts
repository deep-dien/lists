/// <reference types="@serwist/next/typings" />
import { BackgroundSyncQueue, NetworkFirst, ExpirationPlugin, Serwist } from "serwist";
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Tell open pages the queued mutations reached the server so they can
// refetch fresh data (replacing temp-id optimistic entries).
const notifyReplayed = async () => {
  const clients = await self.clients.matchAll();
  for (const client of clients) {
    client.postMessage("replayed");
  }
};

// Queue for offline mutations — BackgroundSyncQueue handles IndexedDB storage,
// sync event registration, and replay automatically.
const mutationQueue = new BackgroundSyncQueue("offline-mutations", {
  onSync: async ({ queue }) => {
    await queue.replayRequests();
    await notifyReplayed();
  },
});

// Non-GET mutations to lists/items: try network, queue if offline and return
// a synthetic 200 so React Query's optimistic updates don't roll back.
// Registered before serwist.addEventListeners() so this handler wins first.
self.addEventListener("fetch", (event: FetchEvent) => {
  const url = new URL(event.request.url);
  const isData =
    url.pathname.startsWith("/api/lists") ||
    url.pathname.startsWith("/api/items");

  if (event.request.method !== "GET" && isData) {
    event.respondWith(
      fetch(event.request.clone()).catch(async () => {
        await mutationQueue.pushRequest({ request: event.request.clone() });
        return new Response(JSON.stringify({ offline: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      })
    );
  }
});

// Safari / browsers without Background Sync: client sends 'replay' when online.
self.addEventListener("message", (event: ExtendableMessageEvent) => {
  if (event.data === "replay") {
    event.waitUntil(mutationQueue.replayRequests().then(notifyReplayed));
  }
});

const apiCaching: RuntimeCaching = {
  matcher: ({ url, request }) =>
    request.method === "GET" &&
    (url.pathname.startsWith("/api/lists") ||
      url.pathname.startsWith("/api/items")),
  handler: new NetworkFirst({
    cacheName: "api-data",
    networkTimeoutSeconds: 10,
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 86400 }),
    ],
  }),
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [apiCaching, ...defaultCache],
});

serwist.addEventListeners();
