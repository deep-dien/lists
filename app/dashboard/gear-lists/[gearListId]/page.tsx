"use client";

import { Loading } from "@/components/Loading";
import { parseItemWeight } from "@/lib/domain/models/item";
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
import { GearListSave } from "@/components/GearListSave";
import {
  FaArrowLeft,
  FaBoxOpen,
  FaLayerGroup,
  FaPlaneDeparture,
  FaSuitcase,
  FaSortAmountDown,
} from "react-icons/fa";
import { str_sanitize } from "@/utilities";

function compareByWeight(a, b) {
  return b.weight - a.weight;
}

function compareByStatus(a, b) {
  if (a.status !== b.status)
    return STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status];
  const catA = str_sanitize(a.category?.trim() || "Uncategorized");
  const catB = str_sanitize(b.category?.trim() || "Uncategorized");
  if (catA !== catB) return compareByCategory(a, b);
  return compareByWeight(a, b);
}

function compareByCategory(a, b) {
  const catA = str_sanitize(a.category?.trim() || "Uncategorized");
  const catB = str_sanitize(b.category?.trim() || "Uncategorized");
  if (catA !== catB) return catA.localeCompare(catB);
  if (a.status !== b.status) return compareByStatus(a, b);
  return compareByWeight(a, b);
}

function statusClass(status: GearListItemStatus) {
  switch (status) {
    case "leave":
      return "border-warning bg-warning/20";
    case "packed":
      return "border-success bg-success/20";
    default:
      return "border-error bg-error/20";
  }
}

function Item({
  item,
  handleStatusChange,
}: {
  item: any;
  handleStatusChange: any;
}) {
  return (
    <div
      className={`
        rounded-box
        border border-base-300
        p-2
        ${statusClass(item.status)}
      `}
    >
      {/* name + weight */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="font-medium capitalize">{item.name}</div>
        {item.weight !== undefined && (
          <div className="badge badge-outline">{item.weight}g</div>
        )}
      </div>

      {/* buttons */}
      <div className="flex gap-2">
        <button
          className={`btn btn-xl flex-1 btn-warning ${
            item.status === "leave" ? "" : "btn-outline"
          }`}
          onClick={() => handleStatusChange(item.itemId, item.status, "leave")}
        >
          <FaPlaneDeparture />
          Leave
        </button>

        <button
          className={`btn btn-xl flex-1 btn-success ${
            item.status === "packed" ? "" : "btn-outline"
          }`}
          onClick={() => handleStatusChange(item.itemId, item.status, "packed")}
        >
          <FaSuitcase />
          Packed
        </button>
      </div>
    </div>
  );
}

export function GearListItemsNil() {
  return (
    <div className="alert">
      <FaBoxOpen />
      <span>No items in this gear list.</span>
    </div>
  );
}

export function GearListItemsSmall({ itemsGrouped, handleStatusChange }) {
  return (
    <div className="flex flex-col gap-3 md:hidden">
      {itemsGrouped.map(([group, itemsGroup]) => {
        return (
          <div key={group}>
            <div className="capitalize">{group}</div>
            <div className="flex flex-col gap-1">
              {itemsGroup.map((item) => {
                return (
                  <Item
                    key={item.itemId}
                    item={item}
                    handleStatusChange={handleStatusChange}
                  />
                );
              })}
            </div>
            <div className="divider p-0 m-0"></div>
          </div>
        );
      })}
    </div>
  );
}

export function GearListItemsLarge({ itemsGrouped, handleStatusChange }) {
  return (
    <div className="hidden md:flex w-full h-full flex-row gap-1">
      {itemsGrouped.map(([group, itemsGrouped]) => {
        if (!itemsGrouped?.length) return null;
        return (
          <div
            key={group}
            className="flex flex-shrink-0 min-h-0 h-full w-fit flex-col gap-2"
          >
            <div className="capitalize">{group}</div>
            <div className="flex flex-col gap-2">
              {itemsGrouped.map((item) => (
                <Item
                  key={item.itemId}
                  item={item}
                  handleStatusChange={handleStatusChange}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function GearList() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const params = useParams();
  const gearListId = params.gearListId as string;

  // sort mode
  const [sortMode, setSortMode] = useState("category");

  // get gear list
  const { data: gearList, isLoading: gearListLoading } = useData(
    `/api/gear-lists/${gearListId}`,
  );
  console.log("gearList", gearList);

  // // if gear list is being shared, clone and add to users gear lists
  // const cloneGearList = useDataMutation(
  //   `/api/gear-lists/${gearListId}/clone`,
  //   "POST",
  //   ["/api/gear-lists", "/api/items"],
  // );
  // useEffect(() => {
  //   (async () => {
  //     if (!gearList) return;
  //     if (!session?.user?.id) return;
  //     if (gearList.userId && gearList.userId === session.user.id) return;
  //     if (cloneGearList.isPending) return;
  //     const cloned = await cloneGearList.mutateAsync({
  //       gearListId: gearListId.id,
  //     });
  //     router.replace(`/dashboard/gear-lists/${cloned.id}`);
  //   })();
  // }, [session?.user?.id, gearList]);

  // go through gear list items and fetch item info for each item from items db
  const { data: items, isLoading: itemsLoading } = useData("/api/items");
  const gearListItems = useMemo(() => {
    if (!gearList?.items || !items) return [];
    return gearList.items
      .map((gearListItem) => {
        const item = items.find((item) => item.id === gearListItem.itemId);
        if (!item) return null;
        return {
          // info from gearListItem
          itemId: gearListItem.itemId,
          status: gearListItem.status ?? "unpacked",
          // info from item
          name: item.name ?? "Unnamed item",
          category: item.category,
          weight: parseItemWeight(item.weight),
        };
      })
      .filter(Boolean);
  }, [gearList, items]);
  console.log("items", items);

  // group items by status or category to display
  const itemsGrouped = useMemo(() => {
    if (sortMode === "status") {
      const statuses = ["unpacked", "leave", "packed"];
      return statuses.map((status) => {
        const itemsStatus = gearListItems.filter(
          (item) => item.status === status,
        );
        itemsStatus.sort(compareByCategory);
        return [status, itemsStatus];
      });
    }
    if (sortMode === "category") {
      const categories = [
        ...new Set(gearListItems.map((item) => item.category)),
      ].sort();
      return categories
        .map((category) => {
          const itemsCategory = gearListItems.filter(
            (item) => item.category === category,
          );
          itemsCategory.sort(compareByStatus);
          return [category, itemsCategory];
        })
        .sort((a, b) => {
          const [itemsA, itemsB] = [a[1], b[1]];
          const packedA = Number(itemsA.every((i) => i.status === "packed"));
          const packedB = Number(itemsB.every((i) => i.status === "packed"));
          if (packedA !== packedB) return packedA - packedB;
          const leaveA = Number(
            itemsA.every((i) => ["leave", "packed"].includes(i.status)),
          );
          const leaveB = Number(
            itemsB.every((i) => ["leave", "packed"].includes(i.status)),
          );
          if (leaveA !== leaveB) return leftA - leftB;
          return 0;
        });
    }
  }, [gearListItems, items, sortMode]);

  // functions to update status when changed by user
  const handleStatusChange = (
    itemId: string,
    currentStatus: GearListItemStatus,
    nextStatus: GearListItemStatus,
  ) => {
    const status = currentStatus === nextStatus ? "unpacked" : nextStatus;
    updateStatus.mutate({ itemId, status });
  };
  const updateStatus = useMutation({
    mutationFn: async ({ itemId, status }) => {
      const res = await fetch(`/api/gear-lists/${gearListId}/items/${itemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        throw new Error("Failed to update item status");
      }
      return { itemId, status };
    },
    onMutate: async ({ itemId, status }) => {
      console.log(
        queryClient
          .getQueryCache()
          .getAll()
          .map((q) => q.queryKey),
      );
      queryClient.setQueryData(
        [`/api/gear-lists/${gearListId}`, undefined],
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((item: any) =>
              item.itemId === itemId ? { ...item, status } : item,
            ),
          };
        },
      );
    },
    // onSuccess: () => {
    //   queryClient.invalidateQueries([`/api/gear-lists/${gearListId}`]);
    // },
  });

  // reset status
  const resetStatus = function () {
    gearList.items.map((item) => {
      updateStatus.mutate({ itemId: item.itemId, status: "unpacked" });
    });
  };

  // initial gear list state for making edits
  const [initialGearList, setInitialGearList] = useState(null);

  if (gearListLoading || itemsLoading) return <Loading />;
  if (!gearList) return <Loading />;
  // comment this out
  // if (gearList?.isDefault) return <Loading />;

  console.log("gearList", gearList);

  return (
    <div className="flex h-full w-full min-h-0 flex-col">
      <div className="flex w-full flex-shrink-0 flex-col">
        <div className="flex w-full flex-row flex-wrap items-center justify-between gap-1">
          {/* title */}
          <div className="order-1 font-bold capitalize">{gearList.name}</div>
          {/* sort display*/}
          <div className="gap-1 flex-row flex order-3 md:order-2">
            {/* category */}
            <div
              className={`flex btn btn-lg ${
                sortMode === "category" ? "btn-active" : ""
              }`}
              onClick={() => setSortMode("category")}
            >
              <FaLayerGroup />
              Category
            </div>
            {/* status */}
            <div
              className={`flex btn btn-lg ${
                sortMode === "status" ? "btn-active" : ""
              }`}
              onClick={() => setSortMode("status")}
            >
              <FaSortAmountDown />
              Status
            </div>
          </div>
          {/* edit or back */}
          <div className="order-2 md:order-3 flex flex-row gap-1">
            <div className="btn btn-lg btn-warning" onClick={resetStatus}>
              Reset
            </div>
            <div
              className="btn btn-lg btn-info"
              onClick={() => setInitialGearList(gearList)}
            >
              Edit
            </div>
            <div
              className="btn btn-lg"
              onClick={() => redirect("/dashboard/gear-lists")}
            >
              Back
            </div>
          </div>
        </div>

        <div className="divider p-0 m-0"></div>
      </div>

      <div className="divider m-0 m-0"></div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {itemsGrouped.length === 0 ? (
          <GearListItemsNil />
        ) : (
          <>
            {/* one column, small screen only */}
            <GearListItemsSmall
              itemsGrouped={itemsGrouped}
              handleStatusChange={handleStatusChange}
            />

            {/* multiple columns, large screen only */}
            <GearListItemsLarge
              itemsGrouped={itemsGrouped}
              handleStatusChange={handleStatusChange}
            />
          </>
        )}
      </div>

      {/* initialGearList save modal */}
      {initialGearList && (
        <GearListSave
          initialGearList={initialGearList}
          setInitialGearList={setInitialGearList}
        />
      )}
    </div>
  );
}
