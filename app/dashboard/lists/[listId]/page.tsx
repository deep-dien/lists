"use client";

import { Loading } from "@/components/Loading";
import {
  Item as ItemModel,
  isBaseItem,
  parseItemWeight,
} from "@/lib/domain/models/item";
import {
  ListItem,
  ListItemStatus,
  STATUS_SORT_ORDER,
} from "@/lib/domain/models/list";
import { Share } from "@/components/Share";
import { useData } from "@/queries";
import {
  useMutationListClone,
  useMutationListItemSave,
  useMutationListSave,
} from "@/mutators";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { ListSave, DraftList } from "@/components/ListSave";
import {
  FaBoxOpen,
  FaLayerGroup,
  FaPlaneDeparture,
  FaSuitcase,
  FaSortAmountDown,
  FaSortAmountUp,
  FaPlus,
} from "react-icons/fa";
import { RiResetLeftFill } from "react-icons/ri";

import { str_sanitize } from "@/utilities";

type ListDisplayItem = {
  itemId: string;
  status: ListItemStatus;
  quantity: number;
  name: string;
  category?: string;
  weight?: number;
  isBase: boolean;
};

// grams → "1.23 kg"
function kg(grams: number): string {
  return `${(grams / 1000).toFixed(2)} kg`;
}

function compareByName(a: ListDisplayItem, b: ListDisplayItem): number {
  return a.name.localeCompare(b.name);
}

function compareByWeight(a: ListDisplayItem, b: ListDisplayItem): number {
  return (b.weight ?? 0) - (a.weight ?? 0);
}

function compareByStatus(a: ListDisplayItem, b: ListDisplayItem): number {
  if (a.status !== b.status)
    return STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status];
  const catA = str_sanitize(a.category?.trim() || "Uncategorized");
  const catB = str_sanitize(b.category?.trim() || "Uncategorized");
  if (catA !== catB) return compareByCategory(a, b);
  return compareByName(a, b);
}

function compareByCategory(a: ListDisplayItem, b: ListDisplayItem): number {
  const catA = str_sanitize(a.category?.trim() || "Uncategorized");
  const catB = str_sanitize(b.category?.trim() || "Uncategorized");
  if (catA !== catB) return catA.localeCompare(catB);
  if (a.status !== b.status) return compareByStatus(a, b);
  return compareByName(a, b);
}

const STATUS_ICON: Record<ListItemStatus, React.ReactNode> = {
  unpacked: <FaBoxOpen className="text-error" />,
  leave: <FaPlaneDeparture className="text-warning" />,
  packed: <FaSuitcase className="text-success" />,
};

type ItemChangeHandler = (item: {
  itemId: string;
  status?: ListItemStatus;
  quantity?: number;
}) => void;

// Pack (or tapping anywhere on the row) packs one. When the last one is
// packed the item is packed; packing a packed item puts it back to unpacked.
// Leave and Pack are full-size buttons for thumbs; +1 is the rare one.
function Item({
  item,
  handleItemChange,
}: {
  item: ListDisplayItem;
  handleItemChange: ItemChangeHandler;
}) {
  const done = item.status !== "unpacked";

  const packOne = () => {
    if (item.status === "packed" || item.status === "leave") {
      handleItemChange({
        itemId: item.itemId,
        quantity: Math.max(1, item.quantity),
        status: "unpacked",
      });
      return;
    }
    const nextQuantity = Math.max(0, item.quantity - 1);
    handleItemChange({
      itemId: item.itemId,
      status: nextQuantity === 0 ? "packed" : "unpacked",
      quantity: nextQuantity,
    });
  };

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={packOne}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          packOne();
        }
      }}
      title={done ? "Mark as unpacked" : "Pack one"}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-left cursor-pointer select-none transition-colors hover:bg-base-200 focus-visible:bg-base-200 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
    >
      <span className="shrink-0">{STATUS_ICON[item.status]}</span>
      <span
        className={`flex-1 min-w-0 truncate ${
          done ? "line-through opacity-50" : ""
        }`}
      >
        {item.name}
      </span>
      {!!item.weight && (
        // non-base weight (food, water, worn) in italics
        <span
          className={`shrink-0 text-xs opacity-60 ${item.isBase ? "" : "italic"}`}
          title={item.isBase ? "Base weight" : "Not base weight"}
        >
          {item.weight}g
        </span>
      )}
      {item.status === "unpacked" && item.quantity > 1 && (
        <span className="badge badge-sm badge-error shrink-0">
          ×{item.quantity}
        </span>
      )}
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-square shrink-0 opacity-50"
        onClick={(e) => {
          stop(e);
          handleItemChange({
            itemId: item.itemId,
            quantity: (item.status === "unpacked" ? item.quantity : 0) + 1,
            status: "unpacked",
          });
        }}
        onKeyDown={stop}
        title="One more to pack"
        aria-label="One more to pack"
      >
        <FaPlus />
      </button>
      {/* leave and pack — big enough to hit with a thumb */}
      <button
        type="button"
        className={`btn btn-warning h-10 min-h-10 w-12 shrink-0 px-0 text-lg ${
          item.status === "leave" ? "" : "btn-outline"
        }`}
        onClick={(e) => {
          stop(e);
          handleItemChange({
            itemId: item.itemId,
            status: item.status === "leave" ? "unpacked" : "leave",
          });
        }}
        onKeyDown={stop}
        title={item.status === "leave" ? "Take it after all" : "Leave behind"}
        aria-label={
          item.status === "leave" ? "Take it after all" : "Leave behind"
        }
        aria-pressed={item.status === "leave"}
      >
        <FaPlaneDeparture />
      </button>
      <button
        type="button"
        className={`btn btn-success h-10 min-h-10 w-12 shrink-0 px-0 text-lg ${
          item.status === "packed" ? "" : "btn-outline"
        }`}
        onClick={(e) => {
          stop(e);
          packOne();
        }}
        onKeyDown={stop}
        title={item.status === "packed" ? "Mark as unpacked" : "Pack one"}
        aria-label={item.status === "packed" ? "Mark as unpacked" : "Pack one"}
        aria-pressed={item.status === "packed"}
      >
        <FaSuitcase />
      </button>
    </div>
  );
}

export function ListItemsNil() {
  return <div className="px-4 py-12 text-center opacity-70">No items found</div>;
}

type ItemsGroup = [string | undefined, ListDisplayItem[]];

// One card per group, in as many columns as fit the width.
export function ListItemsGroups({
  itemsGrouped,
  handleItemChange,
}: {
  itemsGrouped: ItemsGroup[];
  handleItemChange: ItemChangeHandler;
}) {
  return (
    <div className="columns-1 gap-2 sm:columns-[18rem]">
      {itemsGrouped.map(([group, itemsGroup]) => {
        if (!itemsGroup?.length) return null;
        const left = itemsGroup.filter((i) => i.status === "unpacked").length;
        return (
          <div
            key={group ?? "uncategorized"}
            className="mb-2 break-inside-avoid overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-sm"
          >
            <div className="flex items-baseline justify-between gap-2 border-b border-base-300/60 px-3 pb-1 pt-1.5">
              <span className="text-sm font-bold capitalize">
                {group || "uncategorized"}
              </span>
              <span
                className={`text-xs ${left === 0 ? "text-success" : "opacity-70"}`}
              >
                {left === 0 ? "done" : `${left} left`}
              </span>
            </div>
            <div className="divide-y divide-base-300/70">
              {itemsGroup.map((item) => (
                <Item
                  key={item.itemId}
                  item={item}
                  handleItemChange={handleItemChange}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ListPage() {
  // router;
  const router = useRouter();

  // session
  const { data: session } = useSession();

  // sort mode
  const [sort, setSort] = useState({ mode: "category", ascending: true });

  // get list
  const params = useParams();
  const listId = params.listId as string;
  const { data: list = {}, isLoading: listLoading } = useData(
    `/api/lists/${listId}`,
  );

  // if list is being shared, clone and add to users lists
  const mutationListClone = useMutationListClone();
  useEffect(() => {
    (async () => {
      if (!list?.id) return;
      if (!session?.user?.id) return;
      if (list.userId && list.userId === session.user.id) return;
      const cloned = await mutationListClone.mutateAsync({
        list,
      });
      router.replace(`/dashboard/lists/${cloned.id}`);
    })();
  }, [session?.user?.id, list, list?.id]);

  // go through list items and fetch item info for each item from items db
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
  }, [
    items,
    itemsDefaults,
    session?.user?.canModifyDefaults,
    itemsLoadingDefaults,
    itemsLoading,
  ]);

  const listItems: ListDisplayItem[] = useMemo(() => {
    if (!list?.items || !itemsAll) return [];
    return list.items
      .map((listItem: ListItem): ListDisplayItem | null => {
        const item = itemsAll.find(
          (item: ItemModel) => item.id === listItem.itemId,
        );
        if (!item) return null;
        return {
          // info from listItem
          itemId: listItem.itemId,
          status: listItem.status ?? "unpacked",
          quantity: listItem.quantity ?? 1,
          // info from item
          name: item.name ?? "Unnamed item",
          category: item.category,
          weight: parseItemWeight(item.weight),
          isBase: isBaseItem(item),
        };
      })
      .filter(
        (item: ListDisplayItem | null): item is ListDisplayItem =>
          item !== null,
      );
  }, [list?.items, itemsAll]);

  // summary counts and packed weight
  const summary = useMemo(() => {
    const counts: Record<ListItemStatus, number> = {
      unpacked: 0,
      leave: 0,
      packed: 0,
    };
    let packedG = 0;
    let packedBaseG = 0;
    listItems.forEach((item) => {
      counts[item.status] += 1;
      if (item.status === "packed") {
        packedG += item.weight ?? 0;
        if (item.isBase) packedBaseG += item.weight ?? 0;
      }
    });
    return { ...counts, packedG, packedBaseG };
  }, [listItems]);

  const categories: (string | undefined)[] = [
    ...new Set(listItems.map((item) => item.category)),
  ].sort();

  // group items by status or category to display
  const itemsGrouped: ItemsGroup[] = useMemo(() => {
    if (sort?.mode === "status") {
      const statuses: ListItemStatus[] = sort?.ascending
        ? ["unpacked", "leave", "packed"]
        : ["packed", "leave", "unpacked"];
      return statuses.map((status): ItemsGroup => {
        const itemsStatus = listItems.filter((item) => item.status === status);
        itemsStatus.sort(compareByCategory);
        return [status, itemsStatus];
      });
    }
    if (sort?.mode === "category") {
      // get categories
      return categories
        .map((category): ItemsGroup => {
          const itemsCategory = listItems.filter(
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
  }, [listItems, categories, sort]);

  // search
  const [search, setSearch] = useState("");
  const itemsFiltered: ItemsGroup[] = useMemo(() => {
    if (search === "") return itemsGrouped;
    return itemsGrouped
      .map(([group, itemsGroup]): ItemsGroup => {
        const itemsFilter = itemsGroup.filter(
          (item) =>
            (item.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
            (item.category ?? "").toLowerCase().includes(search.toLowerCase()),
        );
        return [group, itemsFilter];
      })
      .filter(
        ([group, itemsGroup]) =>
          !!itemsGroup?.length || (group ?? "").includes(search),
      );
  }, [itemsGrouped, search]);

  // list item save mutation
  const mutationListItemSave = useMutationListItemSave();

  // functions to update status, quantity when changed by user
  const handleItemChange = (item: {
    itemId: string;
    status?: ListItemStatus;
    quantity?: number;
  }) => {
    mutationListItemSave.mutateAsync({
      listId: list.id,
      itemId: item.itemId,
      item,
    });
  };

  // reset status
  const mutationListSave = useMutationListSave();
  const resetStatus = function () {
    const newItems = list.items.map((item: ListItem) => {
      return { ...item, quantity: 1, status: "unpacked" };
    });
    const newList = {
      ...list,
      items: newItems,
    };
    mutationListSave.mutateAsync({ list: newList });
  };

  // initial list state for making edits
  const [initialList, setInitialList] = useState<DraftList | null>(null);

  if (listLoading || itemsLoading) return <Loading />;
  if (!list) return <Loading />;
  if (list?.isDefault && !session?.user?.canModifyDefaults) return <Loading />;
  if (mutationListClone.isPending) return <Loading />;

  const openEdit = () => setInitialList(list);

  return (
    <div className="flex h-full w-full min-h-0 flex-col overflow-hidden">
      {/* header bar */}
      <div className="flex shrink-0 flex-col gap-1 bg-base-200 border-b border-base-content/15 px-3 py-2 shadow-sm">
        {/* breadcrumb: Lists goes back, the name opens the edit form */}
        <div className="flex items-center gap-2">
          <div className="flex flex-1 min-w-0 items-baseline gap-1.5 text-lg font-bold">
            <Link
              href="/dashboard/lists"
              className="shrink-0 opacity-60 hover:opacity-100 hover:underline"
              title="Back to all lists"
            >
              Lists
            </Link>
            <span className="shrink-0 opacity-40" aria-hidden="true">
              &rsaquo;
            </span>
            <span
              role="button"
              tabIndex={0}
              onClick={openEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openEdit();
                }
              }}
              title="Edit list"
              className="truncate cursor-pointer hover:underline decoration-dotted underline-offset-4"
            >
              {list.name}
            </span>
          </div>
          <Share listId={list.id} name={list.name} />
        </div>

        {/* summary, search, grouping, reset */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`text-sm ${summary.unpacked === 0 ? "text-success" : "opacity-70"}`}
          >
            {summary.unpacked === 0
              ? "All packed"
              : `${summary.unpacked} left to pack`}
          </span>
          {summary.packedG > 0 && (
            <span className="text-sm whitespace-nowrap">
              <span className="font-bold">{kg(summary.packedBaseG)}</span>
              <span className="opacity-70"> base</span>
              <span className="opacity-40"> · </span>
              <span className="font-bold">{kg(summary.packedG)}</span>
              <span className="opacity-70"> packed</span>
            </span>
          )}
          <input
            type="search"
            placeholder="Search..."
            className="input input-sm flex-1 min-w-[8rem]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="join">
            <button
              type="button"
              className={`btn btn-sm join-item ${
                sort?.mode === "category" ? "btn-active" : ""
              }`}
              onClick={() => setSort((prev) => ({ ...prev, mode: "category" }))}
              title="Group by category"
            >
              <FaLayerGroup />
              <span className="hidden sm:inline">Category</span>
            </button>
            <button
              type="button"
              className={`btn btn-sm join-item ${
                sort?.mode === "status" ? "btn-active" : ""
              }`}
              onClick={() =>
                setSort((prev) =>
                  prev.mode === "status"
                    ? { ...prev, ascending: !prev.ascending }
                    : { ...prev, mode: "status" },
                )
              }
              title="Group by status"
            >
              {sort?.ascending ? <FaSortAmountUp /> : <FaSortAmountDown />}
              <span className="hidden sm:inline">Status</span>
            </button>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => {
              if (confirm("Mark everything as unpacked?")) resetStatus();
            }}
            title="Unpack everything"
          >
            <RiResetLeftFill />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* list items */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-base-200/40 p-2">
        {itemsFiltered.length === 0 ? (
          <ListItemsNil />
        ) : (
          <ListItemsGroups
            itemsGrouped={itemsFiltered}
            handleItemChange={handleItemChange}
          />
        )}
      </div>

      {/*  save modal */}
      {initialList && (
        <ListSave initialList={initialList} setInitialList={setInitialList} />
      )}
    </div>
  );
}
