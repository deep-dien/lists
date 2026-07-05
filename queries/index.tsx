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
