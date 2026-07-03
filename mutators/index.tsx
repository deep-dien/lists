import { GearList, GearListItem } from "@/lib/domain/models/gearList";
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
        (old: DraftGearList | undefined) => {
          if (!old) return old;
          return old.filter((i) => i.id != itemId);
        },
      );
    },
    onSuccess: async () => {
      // await Promise.all([
      //   queryClient.invalidateQueries({ queryKey: ["api", "gear-lists"] }),
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
      //   queryClient.invalidateQueries({ queryKey: ["api", "gear-lists"] }),
      // ]);
    },
  });
}

// gear lists

export function useMutationGearListClone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ gearList }: { gearList: GearList }) => {
      const res = await fetch(`/api/gear-lists/${gearList.id}/clone`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to clone gear");
      const clonedGearList = await res.json();
      return clonedGearList;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["api", "gear-lists"] }),
        queryClient.invalidateQueries({ queryKey: ["api", "items"] }),
      ]);
    },
  });
}

export function useMutationGearListItemSave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      gearListId,
      itemId,
      item,
    }: {
      gearListId: string;
      itemId: string;
      item: GearListItem;
    }) => {
      const res = await fetch(`/api/gear-lists/${gearListId}/items/${itemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(item),
      });
      if (!res.ok) {
        throw new Error("Failed to update item status");
      }
      const gearList = await res.json();
      return gearList;
    },
    onMutate: async ({ gearListId, itemId, item }) => {
      queryClient.setQueryData(
        ["api", "gear-lists", gearListId],
        (old: DraftGearList | undefined) => {
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
    onSuccess: async ({ gearListId }) => {
      // await Promise.all([
      //   queryClient.invalidateQueries({
      //     queryKey: ["api", "gear-lists", gearListId],
      //   }),
      //   queryClient.invalidateQueries({ queryKey: ["api", "gear-lists"] }),
      //   queryClient.invalidateQueries({ queryKey: ["api", "items"] }),
      // ]);
    },
  });
}

export function useMutationGearListDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ gearListId }: { gearListId: string }) => {
      console.log(gearListId);
      const res = await fetch(`/api/gear-lists/${gearListId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        throw new Error("Failed to update item status");
      }
      return { gearListId };
    },
    onMutate: async ({ gearListId }) => {
      queryClient.setQueryData(
        ["api", "gear-lists"],
        (old: GearList[] | undefined) => {
          if (!old) return old;
          return old.filter((gearList) => gearList.id != gearListId);
        },
      );
    },
    onSuccess: async () => {
      // await Promise.all([
      //   queryClient.invalidateQueries({ queryKey: ["api", "gear-lists"] }),
      // ]);
    },
  });
}

export function useMutationGearListSave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ gearList }: { gearList: GearList }) => {
      const res = await fetch(`/api/gear-lists`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(gearList),
      });
      if (!res.ok) {
        throw new Error("Failed to update item status");
      }
      const newGearList = await res.json();
      return { gearList: newGearList };
    },
    onMutate: async ({ gearList }) => {
      // set invidiual gear list
      queryClient.setQueryData(
        [`api`, `gear-lists`, gearList.id],
        (old: GearList | undefined) => {
          if (!old) return old;
          return { ...old, ...gearList };
        },
      );
      // set all gear lists
      queryClient.setQueryData(
        [`api`, `gear-lists`],
        (old: GearList[] | undefined) => {
          if (!old) return old;
          return old.map((gl) =>
            gl.id === gearList.id ? { ...gl, ...gearList } : gl,
          );
        },
      );
      // set all gear lists
      queryClient.setQueryData(
        [`api`, `gear-lists`, "defaults"],
        (old: GearList[] | undefined) => {
          if (!old) return old;
          return old.map((gl) =>
            gl.id === gearList.id ? { ...gl, ...gearList } : gl,
          );
        },
      );
    },
    onSuccess: async ({ gearList }) => {
      // await Promise.all([
      //   queryClient.invalidateQueries({
      //     queryKey: ["api", "gear-lists", gearList.id],
      //   }),
      //   queryClient.invalidateQueries({ queryKey: ["api", "gear-lists"] }),
      // ]);
    },
  });
}
