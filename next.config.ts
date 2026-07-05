import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import { readdirSync } from "node:fs";
import path from "node:path";

// Every static page route in the app directory, so new pages are precached
// automatically. Dynamic segments ([param]) are skipped — their URLs aren't
// knowable at build time; the service worker caches them at runtime instead.
function staticRoutes(dir: string, base = ""): string[] {
  const routes: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile() && /^page\.(tsx|ts|jsx|js)$/.test(entry.name)) {
      routes.push(base || "/");
    }
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith("[")) continue;
    // route groups like (marketing) don't appear in the URL
    const segment = entry.name.startsWith("(") ? "" : `/${entry.name}`;
    routes.push(...staticRoutes(path.join(dir, entry.name), base + segment));
  }
  return routes;
}

// The precached HTML shells reference that build's content-hashed JS bundles,
// so they must be re-fetched on every deploy — a fixed revision (or null)
// would pin users to stale JS forever.
const buildRevision = Date.now().toString();

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  // Precache the app-shell HTML for every page so they load offline even if
  // the user has never navigated there directly.
  additionalPrecacheEntries: staticRoutes(path.join(process.cwd(), "app")).map(
    (url) => ({ url, revision: buildRevision }),
  ),
});

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {},
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
