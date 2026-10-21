import {
  FaCheckSquare,
  FaLayerGroup,
  FaRegSquare,
  FaSortAmountDown,
  FaSortAmountUp,
  FaTimes,
} from "react-icons/fa";
import { Dispatch, SetStateAction, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/queries";
import { ItemSave } from "@/components/ItemSave";
import { useSession } from "next-auth/react";
import { useMutationListDelete, useMutationListSave } from "@/mutators";
import { Item as ItemModel } from "@/lib/domain/models/item";
import { List as ListModel } from "@/lib/domain/models/list";

type DraftItem = Partial<Omit<ItemModel, "weight" | "isDefault">> & {
  weight?: number | string;
  isDefault?: boolean | string;
};

type DraftListItem = {
  itemId?: string;
  status?: string;
  quantity?: number;
};

export type DraftList = Partial<Omit<ListModel, "items" | "isDefault">> & {
  items: DraftListItem[];
  isDefault?: boolean | string;
};

type SetSaveList = Dispatch<SetStateAction<DraftList>>;

// The whole row toggles whether the item is on the list — no Add/Remove or
// edit buttons. Items are edited on the Items page.
export function Item({
  item,
  saveList,
  setSaveList,
}: {
  item: ItemModel;
  saveList: DraftList;
  setSaveList: SetSaveList;
}) {
  const added = saveList.items.some((listItem) => listItem.itemId === item.id);

  const toggle = () => {
    setSaveList((prev) => ({
      ...prev,
      items: added
        ? prev.items.filter((listItem) => listItem.itemId !== item.id)
        : [...prev.items, { itemId: item.id, status: "unpacked" }],
    }));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={added}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-base-200 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary ${
        added ? "bg-success/10" : ""
      }`}
    >
      {added ? (
        <FaCheckSquare className="shrink-0 text-success" />
      ) : (
        <FaRegSquare className="shrink-0 opacity-40" />
      )}
      <span className="flex-1 min-w-0 truncate">{item.name}</span>
      {!!item.weight && (
        <span className="shrink-0 text-xs opacity-60">{item.weight}g</span>
      )}
    </button>
  );
}

export function ItemsList({
  items,
  saveList,
  setSaveList,
}: {
  items: ItemModel[];
  saveList: DraftList;
  setSaveList: SetSaveList;
}) {
  if (items.length === 0) {
    return <div className="px-2 py-1 text-sm opacity-70">No items found</div>;
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(14rem,1fr))]">
      {items.map((item) => {
        return (
          <Item
            key={item.id}
            item={item}
            saveList={saveList}
            setSaveList={setSaveList}
          />
        );
      })}
    </div>
  );
}

type ItemsSubgroup = [string | null, ItemModel[]];
type ItemsGroup = [string, ItemsSubgroup[]];

export function ListItems({
  saveList,
  setSaveList,
}: {
  saveList: DraftList;
  setSaveList: SetSaveList;
}) {
  // session
  const { data: session } = useSession();

  // items
  const { data: items = [], isLoading } = useData("/api/items");

  // itemsDefaults
  const { data: itemsDefaults = [], isLoading: isLoadingDefaults } = useData(
    "/api/items/defaults",
  );

  // items all (own defaults come back from both endpoints — dedupe by id)
  const canModifyDefaults = session?.user?.canModifyDefaults;
  const itemsAll: ItemModel[] = useMemo(() => {
    if (!canModifyDefaults) return items;
    const itemIds = items.map((item: ItemModel) => item.id);
    return [
      ...items,
      ...itemsDefaults.filter((item: ItemModel) => !itemIds.includes(item.id)),
    ];
  }, [items, itemsDefaults, canModifyDefaults]);

  // sort mode
  const [sort, setSort] = useState({ mode: "category", ascending: true });

  // categories
  const categories: string[] = [
    ...new Set(itemsAll.map((item) => item.category)),
  ]
    .filter((category): category is string => Boolean(category))
    .sort();

  // sort items
  // shape: [group, [[subCategory, items], ...]]
  // subCategory is null when there's no sub-header to render (category mode)
  const itemsGrouped: ItemsGroup[] = useMemo(() => {
    if (!itemsAll) return [];
    const listItemIds = saveList.items.map((item) => item.itemId);

    if (sort?.mode === "added") {
      const groups = sort?.ascending
        ? ["added", "not added"]
        : ["not added", "added"];
      return groups.map((group): ItemsGroup => {
        const itemsGroup = itemsAll.filter((item) =>
          group === "added"
            ? listItemIds.includes(item.id)
            : !listItemIds.includes(item.id),
        );
        const groupCategories: string[] = [
          ...new Set(itemsGroup.map((item) => item.category)),
        ]
          .filter((category): category is string => Boolean(category))
          .sort();
        const subgroups: ItemsSubgroup[] = groupCategories.map((category) => {
          const itemsCategory = itemsGroup.filter(
            (item) => item.category === category,
          );
          itemsCategory.sort((a, b) =>
            (a.name ?? "").localeCompare(b.name ?? ""),
          );
          return [category, itemsCategory];
        });
        // items saved without a category would otherwise never render
        const itemsUncategorized = itemsGroup.filter((item) => !item.category);
        if (itemsUncategorized.length) {
          itemsUncategorized.sort((a, b) =>
            (a.name ?? "").localeCompare(b.name ?? ""),
          );
          subgroups.push(["uncategorized", itemsUncategorized]);
        }
        return [group, subgroups];
      });
    }

    if (sort?.mode === "category") {
      const groups = categories
        .map((category): ItemsGroup => {
          const itemsCategory = itemsAll.filter(
            (item) => item.category === category,
          );
          itemsCategory.sort((a, b) => {
            const includedA = Number(listItemIds.includes(a.id));
            const includedB = Number(listItemIds.includes(b.id));
            if (includedA != includedB) return includedA - includedB;
            return (a.name ?? "").localeCompare(b.name ?? "");
          });
          return [category, [[null, itemsCategory]]];
        })
        .sort((a, b) => {
          const [itemsA, itemsB] = [a[1][0][1], b[1][0][1]];
          const addedA = Number(
            itemsA.every((item) => listItemIds.includes(item.id)),
          );
          const addedB = Number(
            itemsB.every((item) => listItemIds.includes(item.id)),
          );
          return addedA - addedB;
        });
      // items saved without a category would otherwise never render
      const itemsUncategorized = itemsAll.filter((item) => !item.category);
      if (itemsUncategorized.length) {
        itemsUncategorized.sort((a, b) =>
          (a.name ?? "").localeCompare(b.name ?? ""),
        );
        groups.push(["uncategorized", [[null, itemsUncategorized]]]);
      }
      return groups;
    }
    return [];
  }, [itemsAll, saveList.items, categories, sort]);

  // search
  const [search, setSearch] = useState("");
  const itemsFiltered: ItemsGroup[] = itemsGrouped
    .map(([group, subgroups]): ItemsGroup => {
      const subgroupsFiltered: ItemsSubgroup[] = subgroups
        .map(([subCategory, items]): ItemsSubgroup => {
          const itemsFilter = items.filter(
            (item) =>
              (item.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
              (subCategory ?? "").includes(search) ||
              group.includes(search),
          );
          return [subCategory, itemsFilter];
        })
        .filter(
          ([subCategory, items]) =>
            !!items?.length || (subCategory ?? "").includes(search),
        );
      return [group, subgroupsFiltered];
    })
    .filter(
      ([group, subgroups]) => !!subgroups?.length || group.includes(search),
    );

  // new item
  const [initialItem, setInitialItem] = useState<DraftItem | null>(null);

  const addedCount = saveList.items.length;

  return (
    <div className="flex h-full w-full min-h-0 flex-col gap-2">
      {/* header */}
      <div className="flex w-full flex-wrap items-center gap-2">
        <span className="text-sm font-bold">
          Items <span className="font-normal opacity-70">({addedCount} added)</span>
        </span>
        <input
          type="search"
          placeholder="Search..."
          className="input input-sm flex-1 min-w-[8rem]"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {/* sort */}
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
              sort?.mode === "added" ? "btn-active" : ""
            }`}
            onClick={() =>
              setSort((prev) =>
                prev.mode === "added"
                  ? { ...prev, ascending: !prev.ascending }
                  : { ...prev, mode: "added" },
              )
            }
            title="Group by added"
          >
            {sort?.ascending ? <FaSortAmountDown /> : <FaSortAmountUp />}
            <span className="hidden sm:inline">Added</span>
          </button>
        </div>
        <button
          type="button"
          className="btn btn-success btn-sm"
          onClick={() => setInitialItem({})}
        >
          New item
        </button>
      </div>

      {/* items */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {itemsFiltered.map(([group, subgroups]) => {
          return (
            <div key={group}>
              <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300/70 px-2 pt-2 pb-0.5 text-sm font-bold capitalize">
                {group}
              </div>
              {subgroups.map(([subCategory, items]) => {
                return (
                  <div key={subCategory ?? "all"}>
                    {subCategory && (
                      <div className="px-2 pt-1 text-xs font-semibold uppercase opacity-60">
                        {subCategory}
                      </div>
                    )}
                    <ItemsList
                      items={items}
                      saveList={saveList}
                      setSaveList={setSaveList}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
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

export function ListSave({
  initialList,
  setInitialList,
  categories = [],
}: {
  initialList: DraftList;
  setInitialList: Dispatch<SetStateAction<DraftList | null>>;
  categories?: string[];
}) {
  // session
  const { data: session } = useSession();

  const [saveList, setSaveList] = useState<DraftList>(initialList);

  // save list
  const mutationListSave = useMutationListSave();
  const handleSave = function () {
    const list = {
      ...saveList,
      name: (saveList.name ?? "").trim(),
    };
    mutationListSave.mutateAsync({ list });
    setInitialList(null);
  };

  // delete list — leave the list's page first, otherwise its query refetches
  // a list that no longer exists
  const router = useRouter();
  const mutationListDelete = useMutationListDelete();
  const handleDelete = function () {
    if (!initialList.id) return;
    if (!confirm(`Delete "${initialList.name}"?`)) return;
    router.replace("/dashboard/lists");
    mutationListDelete.mutateAsync({ listId: initialList.id });
    setInitialList(null);
  };

  return (
    <div className="modal modal-open" role="dialog" aria-modal="true">
      <div className="modal-box flex w-11/12 max-w-5xl h-[90dvh] max-h-[90dvh] flex-col gap-2 p-0">
        {/* title */}
        <div className="flex items-center justify-between gap-2 border-b border-base-300 px-4 py-2">
          <div className="font-bold">
            {initialList.id ? "Edit list" : "New list"}
          </div>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setInitialList(null)}
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-2 px-4">
          {/* name */}
          <label className="flex w-full items-center gap-2">
            <span className="text-sm">Name</span>
            <input
              type="text"
              className="input input-bordered flex-1"
              placeholder="e.g. Hiking overnight"
              defaultValue={initialList?.name}
              onChange={(e) => {
                setSaveList((prev) => {
                  return { ...prev, name: e.target.value };
                });
              }}
            />
          </label>
          {/* items */}
          <div className="flex min-h-0 flex-1">
            <ListItems saveList={saveList} setSaveList={setSaveList} />
          </div>
        </div>
        {/* footer */}
        <div className="flex flex-wrap items-center gap-2 border-t border-base-300 px-4 py-2">
          {/* default */}
          {session?.user.canModifyDefaults && (
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                defaultChecked={Boolean(initialList?.isDefault)}
                onChange={(e) => {
                  setSaveList((prev) => {
                    return { ...prev, isDefault: e.target.checked };
                  });
                }}
              />
              Default
            </label>
          )}
          {initialList.id && (
            <button
              type="button"
              className="btn btn-outline btn-error btn-sm"
              onClick={handleDelete}
            >
              Delete list
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setInitialList(null)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-success btn-sm"
            onClick={handleSave}
          >
            Save list
          </button>
        </div>
      </div>
    </div>
  );
}
