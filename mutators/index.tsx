import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

export function useDataMutation(
  path: string,
  method: string,
  invalidate: string[],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body?: unknown) => {
      const res = await fetch(path, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        throw new Error(`Failed ${method} ${path}`);
      }
      const data = await res.json();
      return data;
    },
    onSuccess: () => {
      invalidate.forEach((key) => {
        queryClient.invalidateQueries({
          queryKey: [key],
        });
      });
    },
  });
}
