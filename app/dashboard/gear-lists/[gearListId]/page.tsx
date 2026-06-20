"use client";

import { Loading } from "@/components/Loading";
import { Item as ItemModel, parseItemWeight } from "@/lib/domain/models/item";
import {
  GearListItem,
  GearListItemStatus,
  STATUS_SORT_ORDER,
} from "@/lib/domain/models/gearList";
import { Copy } from "@/components/Copy";
import { useDataMutation } from "@/mutators";
import { useData } from "@/queries";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { redirect, useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { GearListSave, DraftGearList } from "@/components/GearListSave";
import {
  FaArrowLeft,
  FaBoxOpen,
  FaLayerGroup,
  FaPlaneDeparture,
  FaSuitcase,
  FaSortAmountDown,
  FaPlus,
  FaMinus,
  FaEdit,
} from "react-icons/fa";
import { RiResetLeftFill } from "react-icons/ri";
import { IoReturnDownBack, IoReturnDownForward } from "react-icons/io5";

import { str_sanitize } from "@/utilities";

type GearListDisplayItem = {
  itemId: string;
  status: GearListItemStatus;
  quantity: number;
  name: string;
  category?: string;
  weight?: number;
};

function compareByName(a: GearListDisplayItem, b: GearListDisplayItem): number {
  return a.name.localeCompare(b.name);
}

function compareByWeight(a: GearListDisplayItem, b: GearListDisplayItem): number {
  return (b.weight ?? 0) - (a.weight ?? 0);
}

function compareByStatus(a: GearListDisplayItem, b: GearListDisplayItem): number {
  if (a.status !== b.status)
    return STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status];
  const catA = str_sanitize(a.category?.trim() || "Uncategorized");
  const catB = str_sanitize(b.category?.trim() || "Uncategorized");
  if (catA !== catB) return compareByCategory(a, b);
  return compareByName(a, b);
}

function compareByCategory(a: GearListDisplayItem, b: GearListDisplayItem): number {
  const catA = str_sanitize(a.category?.trim() || "Uncategorized");
  const catB = str_sanitize(b.category?.trim() || "Uncategorized");
  if (catA !== catB) return catA.localeCompare(catB);
  if (a.status !== b.status) return compareByStatus(a, b);
  return compareByName(a, b);
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

type StatusChangeHandler = (
  itemId: string,
  currentStatus: GearListItemStatus,
  nextStatus: GearListItemStatus,
) => void;

type QuantityChangeHandler = (
  itemId: string,
  currentQuantity: number,
  nextQuantity: number,
) => void;

function Item({
  item,
  handleStatusChange,
  handleQuantityChange,
}: {
  item: GearListDisplayItem;
  handleStatusChange: StatusChangeHandler;
  handleQuantityChange: QuantityChangeHandler;
}) {
  return (
    <div
      className={`
        rounded-box
        border border-base-300
        p-2
        gap-1
        flex
        flex-col
        ${statusClass(item.status)}
      `}
    >
      {/* name, weight, quantity */}
      <div className="flex items-center flex-row justify-between gap-1">
        <div className="font-medium capitalize flex">{item.name}</div>
        {item.weight !== undefined && (
          <div className="badge badge-outline">{item.weight}g</div>
        )}
        <div className="flex min-w-[225px] max-w-[225px] flex-row gap-1 p-1 items-center">
          <div className="divider divider-horizontal p-0 m-0"></div>
          <div className="flex">Unpacked quantity </div>
          <div
            className="btn btn-sm "
            onClick={() => {
              // decrease quanity by 1
              const nextQuantity = Math.max(0, item.quantity - 1);
              handleQuantityChange(
                item.itemId,
                item.quantity,
                item.quantity - 1,
              );
              // if quantity hits 0, set as packed
              if (nextQuantity === 0) {
                handleStatusChange(item.itemId, item.status, "packed");
              }
            }}
          >
            <FaMinus />
          </div>
          <div className="badge badge-xl w-[35px]">{item.quantity}</div>
          <div
            className="btn btn-sm"
            onClick={() => {
              // increase quantity by 1, set as unpacked
              handleQuantityChange(
                item.itemId,
                item.quantity,
                item.quantity + 1,
              );
              handleStatusChange(item.itemId, item.status, "unpacked");
            }}
          >
            <FaPlus />
          </div>
        </div>
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
          onClick={() => {
            // if quantity is 0, and click packed, set to unpacked, quantity 1
            if (item.quantity === 0 && item.status === "packed") {
              handleQuantityChange(item.itemId, item.quantity, 1);
              handleStatusChange(item.itemId, item.status, "unpacked");
              return;
            }
            // else get new quantity
            const nextQuantity = Math.max(0, item.quantity - 1);
            handleQuantityChange(item.itemId, item.quantity, nextQuantity);
            // if zero, set as packed
            if (nextQuantity === 0) {
              handleStatusChange(item.itemId, item.status, "packed");
            } else {
              handleStatusChange(item.itemId, item.status, "unpacked");
            }
          }}
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

type ItemsGroup = [string | undefined, GearListDisplayItem[]];

export function GearListItemsSmall({
  itemsGrouped,
  handleStatusChange,
  handleQuantityChange,
}: {
  itemsGrouped: ItemsGroup[];
  handleStatusChange: StatusChangeHandler;
  handleQuantityChange: QuantityChangeHandler;
}) {
  return (
    <div className="flex flex-col gap-3 md:hidden">
      {itemsGrouped.map(([group, itemsGroup]) => {
        return (
          <div key={group}>
            <div className="capitalize font-bold divider">{group}</div>
            <div className="flex flex-col gap-1">
              {itemsGroup.map((item) => {
                return (
                  <Item
                    key={item.itemId}
                    item={item}
                    handleStatusChange={handleStatusChange}
                    handleQuantityChange={handleQuantityChange}
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

export function GearListItemsLarge({
  itemsGrouped,
  handleStatusChange,
  handleQuantityChange,
}: {
  itemsGrouped: ItemsGroup[];
  handleStatusChange: StatusChangeHandler;
  handleQuantityChange: QuantityChangeHandler;
}) {
  return (
    <div className="hidden md:flex w-full h-full flex-row gap-1">
      {itemsGrouped.map(([group, itemsGrouped]) => {
        if (!itemsGrouped?.length) return null;
        return (
          <div
            key={group}
            className="flex flex-shrink-0 min-h-0 h-full w-fit flex-col gap-2"
          >
            <div className="capitalize font-bold">{group}</div>
            <div className="flex flex-col gap-2">
              {itemsGrouped.map((item) => (
                <Item
                  key={item.itemId}
                  item={item}
                  handleStatusChange={handleStatusChange}
                  handleQuantityChange={handleQuantityChange}
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
  // router;
  const router = useRouter();

  // session
  const { data: session } = useSession();

  // query
  const queryClient = useQueryClient();

  // sort mode
  const [sortMode, setSortMode] = useState("category");

  // get gear list
  const params = useParams();
  const gearListId = params.gearListId as string;
  const { data: gearList, isLoading: gearListLoading } = useData(
    `/api/gear-lists/${gearListId}`,
  );

  // if gear list is being shared, clone and add to users gear lists
  const cloneGearList = useDataMutation(
    `/api/gear-lists/${gearListId}/clone`,
    "POST",
    ["/api/gear-lists", "/api/items"],
  );
  useEffect(() => {
    (async () => {
      if (!gearList) return;
      if (!session?.user?.id) return;
      if (gearList.userId && gearList.userId === session.user.id) return;
      const cloned = await cloneGearList.mutateAsync({
        gearListId,
      });
      router.replace(`/dashboard/gear-lists/${cloned.id}`);
    })();
  }, [session?.user?.id, gearList]);

  // go through gear list items and fetch item info for each item from items db
  const { data: items = [], isLoading: itemsLoading } = useData("/api/items");
  const { data: itemsDefaults = [], isLoading: itemsLoadingDefaults } = useData(
    "/api/items/defaults",
  );

  // items all
  const itemsAll = useMemo(() => {
    if (itemsLoading || itemsLoadingDefaults) return [];
    if (session?.user?.canModifyDefaults) {
      return [...items, ...itemsDefaults];
    } else {
      return items;
    }
  }, [items, itemsDefaults, session?.user?.canModifyDefaults]);

  const gearListItems: GearListDisplayItem[] = useMemo(() => {
    if (!gearList?.items || !items || !itemsDefaults) return [];
    return gearList.items
      .map((gearListItem: GearListItem): GearListDisplayItem | null => {
        const item = itemsAll.find(
          (item: ItemModel) => item.id === gearListItem.itemId,
        );
        if (!item) return null;
        return {
          // info from gearListItem
          itemId: gearListItem.itemId,
          status: gearListItem.status ?? "unpacked",
          quantity: gearListItem.quantity ?? 1,
          // info from item
          name: item.name ?? "Unnamed item",
          category: item.category,
          weight: parseItemWeight(item.weight),
        };
      })
      .filter(
        (item: GearListDisplayItem | null): item is GearListDisplayItem =>
          item !== null,
      );
  }, [gearList, items]);

  // get categories
  const categories: (string | undefined)[] = [
    ...new Set(gearListItems.map((item) => item.category)),
  ].sort();

  // group items by status or category to display
  const itemsGrouped: ItemsGroup[] = useMemo(() => {
    if (sortMode === "status") {
      const statuses: GearListItemStatus[] = ["unpacked", "leave", "packed"];
      return statuses.map((status): ItemsGroup => {
        const itemsStatus = gearListItems.filter(
          (item) => item.status === status,
        );
        itemsStatus.sort(compareByCategory);
        return [status, itemsStatus];
      });
    }
    if (sortMode === "category") {
      return categories
        .map((category): ItemsGroup => {
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
          if (leaveA !== leaveB) return leaveA - leaveB;
          return 0;
        });
    }
    return [];
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
    mutationFn: async ({
      itemId,
      status,
    }: {
      itemId: string;
      status: GearListItemStatus;
    }) => {
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
      queryClient.setQueryData(
        [`/api/gear-lists/${gearListId}`, undefined],
        (old: DraftGearList | undefined) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((item) =>
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

  // functions to update quantity when changed by user
  const handleQuantityChange = (
    itemId: string,
    currentQuantity: number,
    nextQuantity: number,
  ) => {
    nextQuantity = Math.max(nextQuantity, 0);
    updateQuantity.mutate({ itemId, quantity: nextQuantity });
  };
  const updateQuantity = useMutation({
    mutationFn: async ({
      itemId,
      quantity,
    }: {
      itemId: string;
      quantity: number;
    }) => {
      const res = await fetch(`/api/gear-lists/${gearListId}/items/${itemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quantity }),
      });
      if (!res.ok) {
        throw new Error("Failed to update item status");
      }
      return { itemId, quantity };
    },
    onMutate: async ({ itemId, quantity }) => {
      queryClient.setQueryData(
        [`/api/gear-lists/${gearListId}`, undefined],
        (old: DraftGearList | undefined) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((item) =>
              item.itemId === itemId ? { ...item, quantity } : item,
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
    gearList.items.map((item: GearListItem) => {
      updateStatus.mutate({ itemId: item.itemId, status: "unpacked" });
      updateQuantity.mutate({ itemId: item.itemId, quantity: 1 });
    });
  };

  // initial gear list state for making edits
  const [initialGearList, setInitialGearList] =
    useState<DraftGearList | null>(null);

  if (gearListLoading || itemsLoading) return <Loading />;
  if (!gearList) return <Loading />;
  if (gearList?.isDefault && !session?.user?.canModifyDefaults)
    return <Loading />;
  if (cloneGearList.isPending) return <Loading />;

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
          {/* share, reset, edit, back */}
          <div className="order-2 md:order-3 flex flex-row gap-1">
            {/* share */}
            <Copy endpoint={`/dashboard/gear-lists/${gearList.id}`} />
            {/* reset */}
            <div className="btn btn-lg btn-warning" onClick={resetStatus}>
              <RiResetLeftFill />
            </div>
            {/* edit  */}
            <div
              className="btn btn-lg btn-info"
              onClick={() => setInitialGearList(gearList)}
            >
              <FaEdit />
            </div>
            {/* back */}
            <div
              className="btn btn-lg"
              onClick={() => redirect("/dashboard/gear-lists")}
            >
              <IoReturnDownBack />
            </div>
          </div>
        </div>
      </div>

      {/* divider */}
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
              handleQuantityChange={handleQuantityChange}
            />

            {/* multiple columns, large screen only */}
            <GearListItemsLarge
              itemsGrouped={itemsGrouped}
              handleStatusChange={handleStatusChange}
              handleQuantityChange={handleQuantityChange}
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
