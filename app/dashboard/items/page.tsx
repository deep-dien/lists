"use client";

import { Loading } from "@/components/Loading";
import { Item as ItemModel } from "@/lib/domain/models/item";
import { useData } from "@/queries";
import { Dispatch, SetStateAction, useState, useMemo } from "react";
import { MdDelete } from "react-icons/md";
import { FaEdit } from "react-icons/fa";

import { redirect } from "next/navigation";

import { ItemSave } from "@/components/ItemSave";
import { useSession } from "next-auth/react";
import { useMutationItemDelete } from "@/mutators";

type DraftItem = Partial<Omit<ItemModel, "weight" | "isDefault">> & {
  weight?: number | string;
  isDefault?: boolean | string;
};

type SetInitialItem = Dispatch<SetStateAction<DraftItem | null>>;

export function Item({
  item,
  setInitialItem,
}: {
  item: ItemModel;
  setInitialItem: SetInitialItem;
}) {
  // mutation
  const mutateItemDelete = useMutationItemDelete();

  return (
    <div className="justify-between flex flex-col w-full p-1 items-center">
      <div className="justify-between flex flex-row w-full gap-1 items-center">
        <div className="flex-1">{item.name}</div>
        {item?.isDefault ? <div className="badge">Default</div> : null}
        <div
          className="flex min-w-0 btn btn-info"
          onClick={() => {
            setInitialItem(item);
          }}
        >
          <FaEdit />
        </div>
        <div
          className="flex min-w-0 btn btn-error"
          onClick={() => {
            mutateItemDelete.mutateAsync({ itemId: item.id });
          }}
        >
          <MdDelete />
        </div>
      </div>
      <div className="divider p-0 m-0"></div>
    </div>
  );
}

export function ItemsList({
  items,
  setInitialItem,
}: {
  items: ItemModel[];
  setInitialItem: SetInitialItem;
}) {
  if (items.length === 0) {
    return (
      <div className="p-1 items-center w-full h-full"> No items found</div>
    );
  }

  return (
    <div className="p-1 items-center w-full h-full">
      <div className="w-full">
        {items.map((item) => {
          return (
            <Item
              key={item.id}
              item={item}
              setInitialItem={setInitialItem}
            ></Item>
          );
        })}
      </div>
    </div>
  );
}

export default function Items() {
  // session
  const { data: session } = useSession();

  // items
  const { data: items = [], isLoading } = useData("/api/items");

  // items default
  const { data: itemsDefaults = [] } = useData("/api/items/defaults");

  // items all (own defaults come back from both endpoints — dedupe by id)
  const canModifyDefaults = session?.user?.canModifyDefaults;
  const itemsAll: ItemModel[] = useMemo(() => {
    if (!canModifyDefaults) return items;
    const itemIds = items.map((item: ItemModel) => item.id);
    return [
      ...items,
      ...itemsDefaults.filter(
        (item: ItemModel) => !itemIds.includes(item.id),
      ),
    ];
  }, [items, itemsDefaults, canModifyDefaults]);

  // categories
  const categories: string[] = [
    ...new Set(itemsAll.map((item: ItemModel) => item.category)),
  ]
    .filter((category): category is string => Boolean(category))
    .sort();

  type ItemsCategoryGroup = [string, ItemModel[]];

  // sort items
  const itemsGrouped: ItemsCategoryGroup[] = useMemo(() => {
    if (!itemsAll) return [];
    const groups = categories.map((category): ItemsCategoryGroup => {
      const itemsCategory = itemsAll.filter(
        (item) => item.category === category,
      );
      itemsCategory.sort((a, b) => {
        if (a?.isDefault != b?.isDefault)
          return Number(b.isDefault) - Number(a.isDefault);
        return (a.name ?? "").localeCompare(b.name ?? "");
      });
      return [category, itemsCategory];
    });
    // items saved without a category would otherwise never render
    const itemsUncategorized = itemsAll.filter((item) => !item.category);
    if (itemsUncategorized.length) {
      itemsUncategorized.sort((a, b) =>
        (a.name ?? "").localeCompare(b.name ?? ""),
      );
      groups.push(["uncategorized", itemsUncategorized]);
    }
    return groups;
  }, [itemsAll, categories]);

  // search
  const [search, setSearch] = useState("");
  const itemsFiltered: ItemsCategoryGroup[] = itemsGrouped
    .map(([category, itemsCategory]): ItemsCategoryGroup => {
      const itemsFilter = itemsCategory.filter(
        (item) =>
          (item.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
          category.includes(search) ||
          (search.includes("default") && item?.isDefault),
      );
      return [category, itemsFilter];
    })
    .filter(
      ([category, itemsCategory]) =>
        !!itemsCategory?.length || category.includes(search),
    );

  // initial item for item save
  const [initialItem, setInitialItem] = useState<DraftItem | null>(null);

  if (isLoading) return <Loading />;

  return (
    <div className="flex h-full w-full min-h-0 flex-col gap-1">
      {/* header */}
      <div className="flex flex-shrink-0 flex-row items-center justify-between gap-1">
        {/* title  */}
        <div className="flex font-bold"> Items</div>
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

      {/* divider */}
      <div className="divider p-0 m-0"></div>

      {/* items */}
      <div className="overflow-y-auto w-full">
        {/* {!itemsFiltered?.length && <div>No items found</div>} */}
        {itemsFiltered.map(([category, itemsCategory]) => {
          return (
            <div key={category} className="gap-1">
              <div className="font-bold flex divider p-0 m-0">{category}</div>
              <ItemsList
                items={itemsCategory}
                setInitialItem={setInitialItem}
              />
            </div>
          );
        })}
        <div className="w-full h-[50px]"></div>
      </div>

      {/* create button */}
      <div
        className="btn btn-success btn-lg fixed bottom-2 right-2 z-50"
        onClick={() => setInitialItem({})}
      >
        Create
      </div>
      {/* item save modal */}
      {!!initialItem && (
        <ItemSave
          initialItem={initialItem}
          setInitialItem={setInitialItem}
          categories={categories}
        />
      )}
    </div>
  );
}
