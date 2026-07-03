"use client";

import { useQuery } from "@tanstack/react-query";

export function useData(path: string) {
  const queryKey = path.split("/").filter(Boolean);
  console.log(queryKey);
  return useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      const res = await fetch(path);
      if (!res.ok) {
        throw new Error(`Failed to fetch ${path}`);
      }
      const data = await res.json();
      return data;
    },
  });
}
