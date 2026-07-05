import { List, ListItem } from "@/lib/domain/models/list";
import { Item } from "@/lib/domain/models/item";
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
      const remove = (old: Item[] | undefined) =>
        old?.filter((i) => i.id != itemId);
      queryClient.setQueryData(["api", "items"], remove);
      queryClient.setQueryData(["api", "items", "defaults"], remove);
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
      const savedItem = (await res.json()) as Item;
      return { item: savedItem };
    },
    onMutate: async ({ item }) => {
      // new items have no id until the server assigns one; give the
      // optimistic entry a temp id so list keys stay unique
      const tempId = item.id ?? `temp-${crypto.randomUUID()}`;
      const optimistic = { ...item, id: tempId };
      const upsert = (old: Item[] | undefined) => {
        if (!old) return [optimistic];
        if (old.map((i) => i.id).includes(optimistic.id)) {
          return old.map((i) =>
            i.id === optimistic.id ? { ...i, ...optimistic } : i,
          );
        } else {
          return [...old, optimistic];
        }
      };
      queryClient.setQueryData(["api", "items"], upsert);
      queryClient.setQueryData(
        ["api", "items", "defaults"],
        (old: Item[] | undefined) => {
          if (!optimistic.isDefault) {
            return old?.filter((i) => i.id !== optimistic.id);
          }
          return upsert(old);
        },
      );
      return { tempId };
    },
    onSuccess: async ({ item }, _variables, context) => {
      // offline: the SW queues the request and returns a synthetic
      // { offline: true } response — keep the optimistic entry until replay
      if (!item?.id) return;
      // swap the optimistic entry for the server item (real id)
      const upsert = (old: Item[] | undefined, include: boolean) => {
        if (!old) return include ? [item] : old;
        const rest = old.filter(
          (i) => i.id !== context?.tempId && i.id !== item.id,
        );
        return include ? [...rest, item] : rest;
      };
      queryClient.setQueryData(["api", "items"], (old: Item[] | undefined) =>
        upsert(old, true),
      );
      queryClient.setQueryData(
        ["api", "items", "defaults"],
        (old: Item[] | undefined) => upsert(old, Boolean(item.isDefault)),
      );
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
      const clonedList = (await res.json()) as List;
      return clonedList;
    },
    onSuccess: async (clonedList) => {
      // offline: the SW queues the request and returns a synthetic
      // { offline: true } response — the clone appears after replay
      if (clonedList?.id) {
        queryClient.setQueryData(["api", "lists", clonedList.id], clonedList);
        queryClient.setQueryData(
          ["api", "lists"],
          (old: List[] | undefined) => {
            if (!old) return [clonedList];
            if (old.some((l) => l.id === clonedList.id)) return old;
            return [...old, clonedList];
          },
        );
      }
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
      item: Partial<ListItem> & { itemId: string };
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
        (old: List | undefined) => {
          if (!old) return old;
          let items;
          if (old.items.map((i) => i.itemId).includes(itemId)) {
            items = old.items.map((i) =>
              i.itemId === itemId ? { ...i, ...item } : i,
            );
          } else {
            items = [...old.items, item];
          }
          return {
            ...old,
            items: items,
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
      const remove = (old: List[] | undefined) =>
        old?.filter((list) => list.id != listId);
      queryClient.setQueryData(["api", "lists"], remove);
      queryClient.setQueryData(["api", "lists", "defaults"], remove);
      queryClient.removeQueries({ queryKey: ["api", "lists", listId] });
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
      // new lists have no id until the server assigns one; give the
      // optimistic entry a temp id so list keys stay unique
      const tempId = list.id ?? `temp-${crypto.randomUUID()}`;
      const optimistic = { ...list, id: tempId };
      // set individual list
      queryClient.setQueryData(
        ["api", "lists", tempId],
        (old: List | undefined) => {
          if (!old) return optimistic;
          return { ...old, ...optimistic };
        },
      );
      const upsert = (old: List[] | undefined) => {
        if (!old) return [optimistic];
        if (old.map((l) => l.id).includes(optimistic.id)) {
          return old.map((l) =>
            l.id === optimistic.id ? { ...l, ...optimistic } : l,
          );
        } else {
          return [...old, optimistic];
        }
      };
      // set all lists
      queryClient.setQueryData(["api", "lists"], upsert);
      // set default lists (only when the list is a default)
      queryClient.setQueryData(
        ["api", "lists", "defaults"],
        (old: List[] | undefined) => {
          if (!optimistic.isDefault) {
            return old?.filter((l) => l.id !== optimistic.id);
          }
          return upsert(old);
        },
      );
      return { tempId };
    },
    onSuccess: async ({ list }, _variables, context) => {
      // offline: the SW queues the request and returns a synthetic
      // { offline: true } response — keep the optimistic entry until replay
      if (!list?.id) return;
      // swap the optimistic entry for the server list (real id)
      const upsert = (old: List[] | undefined, include: boolean) => {
        if (!old) return include ? [list] : old;
        const rest = old.filter(
          (l) => l.id !== context?.tempId && l.id !== list.id,
        );
        return include ? [...rest, list] : rest;
      };
      queryClient.setQueryData(["api", "lists"], (old: List[] | undefined) =>
        upsert(old, true),
      );
      queryClient.setQueryData(
        ["api", "lists", "defaults"],
        (old: List[] | undefined) => upsert(old, Boolean(list.isDefault)),
      );
      queryClient.setQueryData(["api", "lists", list.id], list);
      if (context?.tempId !== list.id) {
        queryClient.removeQueries({
          queryKey: ["api", "lists", context?.tempId],
        });
      }
    },
  });
}
