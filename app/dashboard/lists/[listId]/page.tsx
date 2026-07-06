"use client";

import { Loading } from "@/components/Loading";
import { Item as ItemModel, parseItemWeight } from "@/lib/domain/models/item";
import {
  ListItem,
  ListItemStatus,
  STATUS_SORT_ORDER,
} from "@/lib/domain/models/list";
import { Copy } from "@/components/Copy";
import { useData } from "@/queries";
import {
  useMutationListClone,
  useMutationListItemSave,
  useMutationListSave,
} from "@/mutators";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { ListSave, DraftList } from "@/components/ListSave";
import {
  FaArrowLeft,
  FaBoxOpen,
  FaLayerGroup,
  FaPlaneDeparture,
  FaSuitcase,
  FaSortAmountDown,
  FaSortAmountUp,
  FaPlus,
  FaMinus,
  FaEdit,
} from "react-icons/fa";
import { RiResetLeftFill } from "react-icons/ri";
import { IoReturnDownBack, IoReturnDownForward } from "react-icons/io5";

import { str_sanitize } from "@/utilities";

type ListDisplayItem = {
  itemId: string;
  status: ListItemStatus;
  quantity: number;
  name: string;
  category?: string;
  weight?: number;
};

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

function statusClass(status: ListItemStatus) {
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
  currentStatus: ListItemStatus,
  nextStatus: ListItemStatus,
) => void;

type QuantityChangeHandler = (
  itemId: string,
  currentQuantity: number,
  nextQuantity: number,
) => void;

function Item({
  item,
  handleItemChange,
}: {
  item: ListDisplayItem;
  handleItemChange: any;
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
        <div className="font-medium flex">{item.name}</div>
        {!!item.weight && (
          <div className="badge badge-outline">{item.weight}g</div>
        )}
        <div className="flex min-w-[275px] max-w-[275px] flex-row gap-1 items-center">
          <div className="divider divider-horizontal p-0 m-0"></div>
          <div className="flex">Unpacked quantity </div>
          <div
            className="btn btn-xs"
            onClick={() => {
              // decrease quanity by 1
              const nextQuantity = Math.max(0, item.quantity - 1);
              handleItemChange({
                itemId: item.itemId,
                quantity: nextQuantity,
                status: nextQuantity === 0 ? "packed" : item.status,
              });
            }}
          >
            <FaMinus />
          </div>
          <div className="badge badge-xl w-[35px] items-center">
            {item.quantity}
          </div>
          <div
            className="btn btn-xs"
            onClick={() => {
              // increase quantity by 1, set as unpacked
              handleItemChange({
                itemId: item.itemId,
                quantity: item.quantity + 1,
                status: "unpacked",
              });
            }}
          >
            <FaPlus />
          </div>
        </div>
      </div>

      {/* buttons */}
      <div className="flex gap-2">
        <button
          className={`btn btn-md flex-1 btn-warning ${
            item.status === "leave" ? "" : "btn-outline"
          }`}
          onClick={() => {
            const newStatus = item.status === "leave" ? "unpacked" : "leave";
            handleItemChange({
              itemId: item.itemId,
              status: newStatus,
            });
          }}
        >
          <FaPlaneDeparture />
          Leave
        </button>

        <button
          className={`btn btn-md flex-1 btn-success ${
            item.status === "packed" ? "" : "btn-outline"
          }`}
          onClick={() => {
            // if quantity is 0, and click packed, set to unpacked, quantity 1
            if (item.quantity === 0 && item.status === "packed") {
              handleItemChange({
                itemId: item.itemId,
                quantity: 1,
                status: "unpacked",
              });
              return;
            }
            // else get new quantity
            // if zero, set as packed
            const nextQuantity = Math.max(0, item.quantity - 1);
            handleItemChange({
              itemId: item.itemId,
              status: nextQuantity === 0 ? "packed" : "unpacked",
              quantity: nextQuantity,
            });
          }}
        >
          <FaSuitcase />
          Packed
        </button>
      </div>
    </div>
  );
}

export function ListItemsNil() {
  return <div className="p-1 items-center w-full h-full"> No items found</div>;
}

type ItemsGroup = [string | undefined, ListDisplayItem[]];

export function ListItemsSmall({
  itemsGrouped,
  handleItemChange,
}: {
  itemsGrouped: ItemsGroup[];
  handleItemChange: any;
}) {
  return (
    <div className="flex flex-col gap-3 md:hidden">
      {itemsGrouped.map(([group, itemsGroup]) => {
        return (
          <div key={group}>
            <div className="font-bold divider p-1 m-1 capitalize">{group}</div>
            <div className="flex flex-col gap-1">
              {itemsGroup.map((item) => {
                return (
                  <Item
                    key={item.itemId}
                    item={item}
                    handleItemChange={handleItemChange}
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

export function ListItemsLarge({
  itemsGrouped,
  handleItemChange,
}: {
  itemsGrouped: ItemsGroup[];
  handleItemChange: any;
}) {
  return (
    <div className="hidden md:flex w-full h-full flex-row gap-1">
      {itemsGrouped.map(([group, itemsGrouped]) => {
        if (!itemsGrouped?.length) return null;
        return (
          <div
            key={group}
            className="flex flex-shrink-0 min-h-0 h-full w-fit flex-col gap-1"
          >
            <div className="font-bold capitalize">{group}</div>
            <div className="flex flex-col gap-1">
              {itemsGrouped.map((item) => (
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

  // query
  const queryClient = useQueryClient();

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
    let packedWeightG = 0;
    let hasWeight = false;
    listItems.forEach((item) => {
      counts[item.status] += 1;
      if (item.weight) hasWeight = true;
      if (item.status === "packed") {
        packedWeightG += item.weight ?? 0;
      }
    });
    return { ...counts, packedWeightKg: packedWeightG / 1000, hasWeight };
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
            item.category.toLowerCase().includes(search.toLowerCase()) ||
            (search.includes("default") && item?.isDefault),
        );
        return [group, itemsFilter];
      })
      .filter(
        ([group, itemsGroup]) => !!itemsGroup?.length || group.includes(search),
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

  return (
    <div className="flex h-full w-full min-h-0 flex flex-col">
      {/* header */}
      <div className="flex w-full flex-shrink-0 flex-row flex-wrap justify-between gap-1 p-0">
        {/* title */}
        <div className="flex font-bold items-center order-1">{list.name}</div>

        {/* summary badges */}
        <div className="flex flex-row flex-wrap items-center gap-1 order-2">
          {/* unpacked */}
          <div
            className={`items-center badge badge-lg badge-error w-[80px] gap-1 p-1 ${
              summary.unpacked === 0 ? "badge-outline" : ""
            }`}
          >
            <FaBoxOpen />
            {/* <span className="hidden md:inline">Unpacked</span> */}
            <span className="items-center  badge badge-sm bg-base-100 text-base-content">
              {summary.unpacked}
            </span>
          </div>

          {/* leave */}
          {/* <div
            className={`badge badge-lg badge-warning gap-1 p-1 w-[80px] ${
              summary.leave === 0 ? "badge-outline" : ""
            }`}
          >
            <FaPlaneDeparture />
            <span className="hidden md:inline">Leave</span>
            <span className="badge badge-sm bg-base-100 text-base-content">
              {summary.leave}
            </span>
          </div> */}

          {/* packed */}
          {/* <div
            className={`badge badge-lg badge-success gap-1 p-1 w-[80px] ${
              summary.packed === 0 ? "badge-outline" : ""
            }`}
          >
            <FaSuitcase />
            <span className="hidden md:inline">Packed</span>
            <span className="badge badge-sm bg-base-100 text-base-content">
              {summary.packed}
            </span>
          </div> */}

          {/* wieght */}
          {summary.hasWeight && (
            <div className="badge badge-lg badge-success badge-outline gap-1 p-1 w-[60px]">
              {/* <span className="hidden md:inline">packed weight</span> */}
              {summary.packedWeightKg}kg
            </div>
          )}
        </div>

        {/* sort display*/}
        <div className="flex flex-row flex-wrap gap-1 order-3">
          {/* category */}
          <div
            className={`flex btn btn-md ${
              sort?.mode === "category" ? "btn-active" : ""
            }`}
            onClick={() =>
              setSort((prev) => {
                return {
                  ...prev,
                  mode: "category",
                };
              })
            }
          >
            <FaLayerGroup />
            <span className="hidden md:inline">Category</span>
          </div>
          {/* status */}
          <div
            className={`flex btn btn-md ${
              sort?.mode === "status" ? "btn-active" : ""
            }`}
            onClick={() =>
              setSort((prev) => {
                if (prev.mode === "status") {
                  return { ...prev, ascending: !prev.ascending };
                } else {
                  return { ...prev, mode: "status" };
                }
              })
            }
          >
            {sort?.ascending ? <FaSortAmountUp /> : <FaSortAmountDown />}
            <span className="hidden md:inline">Status</span>
          </div>
        </div>

        {/* search */}
        <div className="flex flex-shrink-0 flex-row items-center justify-between gap-1 order-last md:order-4">
          {/* search  */}
          <div className="flex-1 flex">
            <input
              type="text"
              placeholder="Search..."
              className="input flex-1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* share, reset, edit, back */}
        <div className="flex flex-row gap-1 order-4 md:order-5">
          {/* share */}
          <Copy endpoint={`/dashboard/lists/${list.id}`} />
          {/* reset */}
          <div className="btn btn-md btn-warning" onClick={resetStatus}>
            <RiResetLeftFill />
          </div>
          {/* edit  */}
          <div
            className="btn btn-md btn-info"
            onClick={() => setInitialList(list)}
          >
            <FaEdit />
          </div>
          {/* back */}
          <Link href="/dashboard/lists" className="btn btn-md">
            <IoReturnDownBack />
          </Link>
        </div>
      </div>

      {/* divider */}
      <div className="divider m-0 m-0"></div>

      {/* list items */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {itemsFiltered.length === 0 ? (
          <ListItemsNil />
        ) : (
          <>
            {/* one column, small screen only */}
            <ListItemsSmall
              itemsGrouped={itemsFiltered}
              handleItemChange={handleItemChange}
            />

            {/* multiple columns, large screen only */}
            <ListItemsLarge
              itemsGrouped={itemsFiltered}
              handleItemChange={handleItemChange}
            />
          </>
        )}
      </div>

      {/*  save modal */}
      {initialList && (
        <ListSave initialList={initialList} setInitialList={setInitialList} />
      )}
    </div>
  );
}
