"use client";

import { useQuery, QueryClient } from "@tanstack/react-query";

async function fetchPath(path: string) {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${path}`);
  }
  const data = await res.json();
  return data;
}

export function useData(path: string) {
  const queryKey = path.split("/").filter(Boolean);
  return useQuery({
    queryKey: queryKey,
    queryFn: () => fetchPath(path),
    // avoid refetching on every mount/focus: while flaky-offline those
    // refetches get the SW's stale cached response, which would overwrite
    // optimistic entries for still-queued mutations
    staleTime: 30 * 1000,
  });
}

// Warm the query cache (and the service worker's api cache) while online so
// pages reached later render from cache when offline.
export function prefetchData(queryClient: QueryClient, path: string) {
  return queryClient.prefetchQuery({
    queryKey: path.split("/").filter(Boolean),
    queryFn: () => fetchPath(path),
    staleTime: 30 * 1000,
  });
}
