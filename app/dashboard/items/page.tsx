"use client";

import { Loading } from "@/components/Loading";
import { Item as ItemModel, isBaseItem } from "@/lib/domain/models/item";
import { useData } from "@/queries";
import { Dispatch, SetStateAction, useState, useMemo } from "react";

import { ItemSave } from "@/components/ItemSave";
import { useSession } from "next-auth/react";

type DraftItem = Partial<Omit<ItemModel, "weight" | "isDefault">> & {
  weight?: number | string;
  isDefault?: boolean | string;
};

type SetInitialItem = Dispatch<SetStateAction<DraftItem | null>>;

// The whole row opens the edit form; delete lives in there.
export function Item({
  item,
  setInitialItem,
}: {
  item: ItemModel;
  setInitialItem: SetInitialItem;
}) {
  return (
    <button
      type="button"
      onClick={() => setInitialItem(item)}
      title="Edit item"
      className="flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-base-200 focus-visible:bg-base-200 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
    >
      <span className="flex-1 min-w-0 truncate">{item.name}</span>
      {item?.isDefault ? (
        <span className="badge badge-neutral badge-sm shrink-0">Default</span>
      ) : null}
      {!isBaseItem(item) && (
        <span className="badge badge-ghost badge-sm shrink-0">not base</span>
      )}
      {!!item.weight && (
        <span className="shrink-0 text-sm opacity-60">{item.weight}g</span>
      )}
    </button>
  );
}

// One card per category, laid out in as many columns as fit.
export function ItemsCategory({
  category,
  items,
  setInitialItem,
}: {
  category: string;
  items: ItemModel[];
  setInitialItem: SetInitialItem;
}) {
  return (
    <div className="mb-2 break-inside-avoid overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-sm">
      <div className="flex items-baseline justify-between gap-2 border-b border-base-300/60 px-3 pb-1 pt-1.5">
        <span className="text-sm font-bold capitalize">{category}</span>
        <span className="text-xs opacity-70">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="px-3 py-2 text-sm opacity-70">No items found</div>
      ) : (
        <div className="divide-y divide-base-300/70">
          {items.map((item) => (
            <Item key={item.id} item={item} setInitialItem={setInitialItem} />
          ))}
        </div>
      )}
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
    <div className="flex h-full w-full min-h-0 flex-col overflow-hidden">
      {/* header bar */}
      <div className="flex shrink-0 items-center gap-2 bg-base-200 border-b border-base-content/15 px-3 py-2 shadow-sm">
        <h2 className="text-sm font-bold">Items</h2>
        <input
          type="search"
          placeholder="Search..."
          className="input input-sm flex-1 min-w-0"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-success btn-sm"
          onClick={() => setInitialItem({})}
        >
          Create new
        </button>
      </div>

      {/* items */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-base-200/40 p-2">
        {itemsFiltered.length === 0 ? (
          <div className="px-4 py-12 text-center opacity-70">
            No items found
          </div>
        ) : (
          <div className="columns-1 gap-2 sm:columns-[18rem]">
            {itemsFiltered.map(([category, itemsCategory]) => (
              <ItemsCategory
                key={category}
                category={category}
                items={itemsCategory}
                setInitialItem={setInitialItem}
              />
            ))}
          </div>
        )}
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
