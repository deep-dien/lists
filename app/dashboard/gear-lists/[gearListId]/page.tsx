"use client";

import { Loading } from "@/components/Loading";
import {
  GearListItemStatus,
  STATUS_SORT_ORDER,
} from "@/lib/domain/models/gearList";
import { useDataMutation } from "@/mutators";
import { useData } from "@/queries";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { redirect, useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  FaArrowLeft,
  FaBoxOpen,
  FaLayerGroup,
  FaPlaneDeparture,
  FaSuitcase,
  FaSortAmountDown,
} from "react-icons/fa";

type SortMode = "status" | "category";

type DisplayItem = {
  itemId: string;
  status: GearListItemStatus;
  name: string;
  category?: string;
  weight?: number;
};

function compareByStatus(a: DisplayItem, b: DisplayItem) {
  return STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status];
}

function compareByCategory(a: DisplayItem, b: DisplayItem) {
  const catA = (a.category?.trim() || "Uncategorized").toLowerCase();
  const catB = (b.category?.trim() || "Uncategorized").toLowerCase();
  if (catA !== catB) return catA.localeCompare(catB);
  return compareByStatus(a, b);
}

function groupByCategory(items: DisplayItem[]) {
  const groups = new Map<string, DisplayItem[]>();
  for (const item of items) {
    const category = item.category?.trim() || "Uncategorized";
    const group = groups.get(category) ?? [];
    group.push(item);
    groups.set(category, group);
  }
  for (const group of groups.values()) {
    group.sort(compareByStatus);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function statusCardClass(status: GearListItemStatus) {
  switch (status) {
    case "leave":
      return "border-warning bg-warning/10";
    case "packed":
      return "border-success bg-success/10";
    default:
      return "border-error bg-error/10";
  }
}

function ItemCard({
  item,
  onLeave,
  onPacked,
  isUpdating,
}: {
  item: DisplayItem;
  onLeave: () => void;
  onPacked: () => void;
  isUpdating: boolean;
}) {
  return (
    <div className={`card card-bordered shadow-sm ${statusCardClass(item.status)}`}>
      <div className="card-body gap-2 p-3">
        <h3 className="card-title text-base">{item.name}</h3>
        <div className="flex flex-wrap gap-2 text-sm opacity-80">
          {item.category && (
            <span className="badge badge-ghost badge-sm">{item.category}</span>
          )}
          {item.weight !== undefined && (
            <span className="badge badge-ghost badge-sm">{item.weight}g</span>
          )}
        </div>
        <div className="card-actions justify-end">
          <button
            type="button"
            className={`btn btn-sm gap-1 ${
              item.status === "leave" ? "btn-warning" : "btn-outline btn-warning"
            }`}
            disabled={isUpdating}
            onClick={onLeave}
          >
            <FaPlaneDeparture />
            Leave
          </button>
          <button
            type="button"
            className={`btn btn-sm gap-1 ${
              item.status === "packed" ? "btn-success" : "btn-outline btn-success"
            }`}
            disabled={isUpdating}
            onClick={onPacked}
          >
            <FaSuitcase />
            Packed
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GearList() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const params = useParams();
  const gearListId = params.gearListId as string;

  const [sortMode, setSortMode] = useState<SortMode>("status");
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  const { data: gear_lists, isLoading: gearListsLoading } = useData(
    "/api/gear-lists",
    {
      includeDefaults: true,
      gearListIds: [gearListId],
    },
  );
  const gear_list = gear_lists?.find(
    (list: { id: string }) => list.id === gearListId,
  );

  const itemIds = gear_list?.items?.map(
    (item: { itemId: string }) => item.itemId,
  ) ?? [];
  const { data: items, isLoading: itemsLoading } = useData("/api/items", {
    itemIds,
  });

  const cloneGearList = useDataMutation(
    `/api/gear-lists/${gearListId}/clone`,
    "POST",
    ["/api/gear-lists", "/api/items"],
  );

  const updateStatus = useMutation({
    mutationFn: async ({
      itemId,
      status,
    }: {
      itemId: string;
      status: GearListItemStatus;
    }) => {
      const res = await fetch(
        `/api/gear-lists/${gearListId}/items/${itemId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      if (!res.ok) throw new Error("Failed to update item status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gear-lists"] });
    },
    onSettled: () => setUpdatingItemId(null),
  });

  useEffect(() => {
    (async () => {
      if (!gear_list) return;
      if (!session?.user?.id) return;
      if (gear_list.userId && gear_list.userId === session.user.id) return;
      if (cloneGearList.isPending) return;
      const cloned = await cloneGearList.mutateAsync({});
      router.replace(`/dashboard/gear-lists/${cloned.id}`);
    })();
  }, [session?.user?.id, gear_list]);

  const displayItems = useMemo<DisplayItem[]>(() => {
    if (!gear_list?.items || !items) return [];

    type ItemRecord = {
      id?: string;
      name?: string;
      category?: string;
      weight?: number;
    };
    const itemById = new Map<string, ItemRecord>(
      (items as ItemRecord[]).map((item) => [item.id ?? "", item]),
    );

    return gear_list.items
      .map(
        (entry: { itemId: string; status?: GearListItemStatus }) => {
          const item = itemById.get(entry.itemId);
          if (!item) return null;
          return {
            itemId: entry.itemId,
            status: entry.status ?? "unpacked",
            name: item.name ?? "Unnamed item",
            category: item.category,
            weight: item.weight,
          };
        },
      )
      .filter(Boolean) as DisplayItem[];
  }, [gear_list, items]);

  const sortedItems = useMemo(() => {
    const copy = [...displayItems];
    copy.sort(sortMode === "category" ? compareByCategory : compareByStatus);
    return copy;
  }, [displayItems, sortMode]);

  const categoryGroups = useMemo(
    () => groupByCategory(displayItems),
    [displayItems],
  );

  const handleStatusChange = (
    itemId: string,
    currentStatus: GearListItemStatus,
    nextStatus: GearListItemStatus,
  ) => {
    const status =
      currentStatus === nextStatus ? "unpacked" : nextStatus;
    setUpdatingItemId(itemId);
    updateStatus.mutate({ itemId, status });
  };

  if (gearListsLoading || itemsLoading) return <Loading />;
  if (!gear_list) return <Loading />;

  return (
    <div className="flex h-full w-full min-h-0 flex-col">
      <header className="flex w-full flex-shrink-0 flex-col gap-2">
        <div className="flex w-full flex-row items-center justify-between">
          <h1 className="text-lg font-bold">{gear_list.name}</h1>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => redirect("/dashboard/gear-lists")}
          >
            <FaArrowLeft />
          </button>
        </div>

        <div className="join md:hidden">
          <button
            type="button"
            className={`btn btn-sm join-item gap-1 ${
              sortMode === "status" ? "btn-active" : ""
            }`}
            onClick={() => setSortMode("status")}
          >
            <FaSortAmountDown />
            Status
          </button>
          <button
            type="button"
            className={`btn btn-sm join-item gap-1 ${
              sortMode === "category" ? "btn-active" : ""
            }`}
            onClick={() => setSortMode("category")}
          >
            <FaLayerGroup />
            Category
          </button>
        </div>
      </header>

      <div className="divider m-0 my-2"></div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {displayItems.length === 0 ? (
          <div className="alert">
            <FaBoxOpen />
            <span>No items in this gear list.</span>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 md:hidden">
              {sortedItems.map((item) => (
                <ItemCard
                  key={item.itemId}
                  item={item}
                  isUpdating={updatingItemId === item.itemId}
                  onLeave={() =>
                    handleStatusChange(item.itemId, item.status, "leave")
                  }
                  onPacked={() =>
                    handleStatusChange(item.itemId, item.status, "packed")
                  }
                />
              ))}
            </div>

            <div className="hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {categoryGroups.map(([category, categoryItems]) => (
                <div key={category} className="flex flex-col gap-2">
                  <h2 className="sticky top-0 z-10 bg-base-100 py-1 text-sm font-bold uppercase tracking-wide opacity-70">
                    {category}
                  </h2>
                  <div className="flex flex-col gap-2">
                    {categoryItems.map((item) => (
                      <ItemCard
                        key={item.itemId}
                        item={item}
                        isUpdating={updatingItemId === item.itemId}
                        onLeave={() =>
                          handleStatusChange(item.itemId, item.status, "leave")
                        }
                        onPacked={() =>
                          handleStatusChange(
                            item.itemId,
                            item.status,
                            "packed",
                          )
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
