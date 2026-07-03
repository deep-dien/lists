import { List, ListItem } from "@/lib/domain/models/list";
import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

// items

export function useMutationItemDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId }: { itemId: string }) => {
      const res = await fetch(`/api/items/${itemId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to update item status");
    },
    onMutate: async ({ itemId }) => {
      queryClient.setQueryData(
        [`api`, `items`],
        (old: DraftList | undefined) => {
          if (!old) return old;
          return old.filter((i) => i.id != itemId);
        },
      );
    },
    onSuccess: async () => {
      // await Promise.all([
      //   queryClient.invalidateQueries({ queryKey: ["api", "lists"] }),
      //   queryClient.invalidateQueries({ queryKey: ["api", "items"] }),
      // ]);
    },
  });
}

export function useMutationItemSave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ item }: { item: Item }) => {
      const res = await fetch(`/api/items`, {
        method: "PUT",
        body: JSON.stringify(item),
      });
      if (!res.ok) throw new Error("Failed to update item status");
    },
    onMutate: async ({ item }) => {
      queryClient.setQueryData(["api", "items"], (old: Item[] | undefined) => {
        if (!old) return old;
        return old.map((i) => (i.id === item.id ? { ...i, ...item } : i));
      });
      queryClient.setQueryData(
        ["api", "items", "defaults"],
        (old: Item[] | undefined) => {
          if (!old) return old;
          return old.map((i) => (i.id === item.id ? { ...i, ...item } : i));
        },
      );
    },
    onSuccess: async () => {
      // await Promise.all([
      //   queryClient.invalidateQueries({ queryKey: ["api", "items"] }),
      //   queryClient.invalidateQueries({ queryKey: ["api", "lists"] }),
      // ]);
    },
  });
}

// lists

export function useMutationListClone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ list }: { list: List }) => {
      const res = await fetch(`/api/lists/${list.id}/clone`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to clone list");
      const clonedList = await res.json();
      return clonedList;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["api", "lists"] }),
        queryClient.invalidateQueries({ queryKey: ["api", "items"] }),
      ]);
    },
  });
}

export function useMutationListItemSave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      listId,
      itemId,
      item,
    }: {
      listId: string;
      itemId: string;
      item: ListItem;
    }) => {
      const res = await fetch(`/api/lists/${listId}/items/${itemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(item),
      });
      if (!res.ok) {
        throw new Error("Failed to update item status");
      }
      const list = await res.json();
      return list;
    },
    onMutate: async ({ listId, itemId, item }) => {
      queryClient.setQueryData(
        ["api", "lists", listId],
        (old: DraftList | undefined) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((i) =>
              i.itemId === itemId ? { ...i, ...item } : i,
            ),
          };
        },
      );
    },
    onSuccess: async ({ listId }) => {
      // await Promise.all([
      //   queryClient.invalidateQueries({
      //     queryKey: ["api", "lists", listId],
      //   }),
      //   queryClient.invalidateQueries({ queryKey: ["api", "lists"] }),
      //   queryClient.invalidateQueries({ queryKey: ["api", "items"] }),
      // ]);
    },
  });
}

export function useMutationListDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ listId }: { listId: string }) => {
      console.log(listId);
      const res = await fetch(`/api/lists/${listId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        throw new Error("Failed to update item status");
      }
      return { listId };
    },
    onMutate: async ({ listId }) => {
      queryClient.setQueryData(
        ["api", "lists"],
        (old: List[] | undefined) => {
          if (!old) return old;
          return old.filter((list) => list.id != listId);
        },
      );
    },
    onSuccess: async () => {
      // await Promise.all([
      //   queryClient.invalidateQueries({ queryKey: ["api", "lists"] }),
      // ]);
    },
  });
}

export function useMutationListSave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ list }: { list: List }) => {
      const res = await fetch(`/api/lists`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(list),
      });
      if (!res.ok) {
        throw new Error("Failed to update item status");
      }
      const newList = await res.json();
      return { list: newList };
    },
    onMutate: async ({ list }) => {
      // set individual list
      queryClient.setQueryData(
        [`api`, `lists`, list.id],
        (old: List | undefined) => {
          if (!old) return old;
          return { ...old, ...list };
        },
      );
      // set all lists
      queryClient.setQueryData(
        [`api`, `lists`],
        (old: List[] | undefined) => {
          if (!old) return old;
          return old.map((l) =>
            l.id === list.id ? { ...l, ...list } : l,
          );
        },
      );
      // set default lists
      queryClient.setQueryData(
        [`api`, `lists`, "defaults"],
        (old: List[] | undefined) => {
          if (!old) return old;
          return old.map((l) =>
            l.id === list.id ? { ...l, ...list } : l,
          );
        },
      );
    },
    onSuccess: async ({ list }) => {
      // await Promise.all([
      //   queryClient.invalidateQueries({
      //     queryKey: ["api", "lists", list.id],
      //   }),
      //   queryClient.invalidateQueries({ queryKey: ["api", "lists"] }),
      // ]);
    },
  });
}
