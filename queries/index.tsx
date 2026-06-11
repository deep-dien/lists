"use client";

import { useQuery } from "@tanstack/react-query";

export function useData(path: string, params?: Record<string, any>) {
  const queryKey = [path, params];
  return useQuery({
    queryKey,
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      Object.entries(params ?? {}).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        if (Array.isArray(value)) {
          searchParams.set(key, value.join(","));
        } else {
          searchParams.set(key, String(value));
        }
      });
      const url = searchParams.size
        ? `${path}?${searchParams.toString()}`
        : path;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch ${url}`);
      }
      return res.json();
    },
  });
}
