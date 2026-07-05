import { FaTimes } from "react-icons/fa";
import { Dispatch, SetStateAction, useEffect, useState, useMemo } from "react";
import { useData } from "@/queries";
import { FaEdit } from "react-icons/fa";
import { ItemSave } from "@/components/ItemSave";
import { useSession } from "next-auth/react";
import { useMutationListSave } from "@/mutators";
import { FaShareAlt } from "react-icons/fa";
import { FaLayerGroup, FaSortAmountDown, FaSortAmountUp } from "react-icons/fa";
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
type SetInitialItem = Dispatch<SetStateAction<DraftItem | null>>;

export function Item({
  item,
  saveList,
  setSaveList,
  setInitialItem,
}: {
  item: ItemModel;
  saveList: DraftList;
  setSaveList: SetSaveList;
  setInitialItem: SetInitialItem;
}) {
  const listItems = saveList.items;
  const listItemIds = saveList.items.map((item) => item.itemId);

  return (
    <div className="justify-between flex flex-col w-full">
      <div className="justify-between flex flex-row w-full gap-1">
        <div className="flex-1">{item.name}</div>
        {/* edit */}
        <div
          className="flex min-w-0  btn btn-info"
          onClick={() => {
            setInitialItem(item);
          }}
        >
          <FaEdit />
        </div>
        {/* add/remove */}
        {/* add */}
        {!listItemIds.includes(item.id) && (
          <div
            className="flex min-w-0 w-[75px] btn btn btn-success"
            onClick={() => {
              setSaveList((prev) => {
                return {
                  ...prev,
                  items: [
                    ...prev.items,
                    { itemId: item.id, status: "unpacked" },
                  ],
                };
              });
            }}
          >
            Add
          </div>
        )}
        {/* remove */}
        {listItemIds.includes(item.id) && (
          <div
            className="flex min-w-0 w-[75px] btn btn btn-warning"
            onClick={() => {
              setSaveList((prev) => {
                return {
                  ...prev,
                  items: listItems.filter(
                    (listItem) => listItem.itemId != item.id,
                  ),
                };
              });
            }}
          >
            Remove
          </div>
        )}
      </div>
      <div className="divider p-0 m-0"></div>
    </div>
  );
}

export function ItemsList({
  items,
  saveList,
  setSaveList,
  setInitialItem,
}: {
  items: ItemModel[];
  saveList: DraftList;
  setSaveList: SetSaveList;
  setInitialItem: SetInitialItem;
}) {
  if (items.length === 0) {
    return (
      <div className="p-1 items-center w-full h-full"> No items found</div>
    );
  }
  return (
    <div className="items-center flex-col w-full h-full gap-1">
      {items.map((item) => {
        return (
          <Item
            key={item.id}
            item={item}
            saveList={saveList}
            setSaveList={setSaveList}
            setInitialItem={setInitialItem}
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

  // items all
  let itemsAll: ItemModel[] = [];
  if (session?.user?.canModifyDefaults) {
    itemsAll = [...items, ...itemsDefaults];
  } else {
    itemsAll = items;
  }

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
        return [group, subgroups];
      });
    }

    if (sort?.mode === "category") {
      return categories
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
    }
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

  return (
    <div className="flex h-full w-full min-h-0 flex-col gap-1">
      {/* header */}
      <div className="flex w-full flex-row items-center justify-between flex-wrap gap-1">
        <div className="flex flex-row justify-between gap-1 items-center">
          {/* title  */}
          <div className="flex font-bold"> Items</div>
          {/* search  */}
          <div className="flex flex-1">
            <input
              type="text"
              placeholder="Search..."
              className="input flex-1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {/* create button */}
          <div
            className="btn btn-success btn"
            onClick={() => setInitialItem({})}
          >
            Create
          </div>
        </div>
        {/* sort row */}
        <div className="gap-1 flex flex-row flex">
          {/* category */}
          <div
            className={`flex btn btn-md ${
              sort?.mode === "category" ? "btn-active" : ""
            }`}
            onClick={() =>
              setSort((prev) => {
                return { ...prev, mode: "category" };
              })
            }
          >
            <FaLayerGroup />
            Category
          </div>
          {/* added */}
          <div
            className={`flex btn btn-md ${
              sort?.mode === "added" ? "btn-active" : ""
            }`}
            onClick={() => {
              setSort((prev) => {
                if (prev.mode === "added") {
                  return { ...prev, ascending: !prev.ascending };
                } else {
                  return { ...prev, mode: "added" };
                }
              });
            }}
          >
            {sort?.ascending ? <FaSortAmountDown /> : <FaSortAmountUp />}
            Added
          </div>
        </div>
      </div>

      {/* divider */}
      <div className="divider p-0 m-0"></div>

      {/* items */}
      <div className="overflow-y-auto w-full">
        {itemsFiltered.map(([group, subgroups]) => {
          return (
            <div key={group} className="gap-1">
              <div className="divider font-bold flex">{group}</div>
              {subgroups.map(([subCategory, items]) => {
                return (
                  <div key={subCategory ?? "all"} className="gap-1">
                    {subCategory && (
                      <div className="divider flex">{subCategory}</div>
                    )}
                    <ItemsList
                      items={items}
                      saveList={saveList}
                      setSaveList={setSaveList}
                      setInitialItem={setInitialItem}
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

  return (
    <dialog className="modal modal-open h-full overflow-hidden p-1 w-full">
      <div className="modal-box flex-1 max-w-none w-[90%] h-[90%] flex flex-col gap-1">
        {/* title */}
        <div className="w-full flex-row justify-between flex items-center min-h-0">
          <div className="font-bold">Save list</div>
          <div className="btn btn" onClick={() => setInitialList(null)}>
            <FaTimes />
          </div>
        </div>
        <div className="flex-col flex flex-1 min-h-0">
          <div className="w-full flex flex-row gap-x-1 items-center">
            {/* name */}
            <div className="flex flex-1">Name:</div>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="e.g. Hiking overnight"
              defaultValue={initialList?.name}
              onChange={(e) => {
                setSaveList((prev) => {
                  return { ...prev, name: e.target.value };
                });
              }}
            />
          </div>
          <div className="divider p-0 m-0"></div>
          {/* items */}
          <div className="w-full flex flex-row flex-1 overflow-y-auto">
            <ListItems saveList={saveList} setSaveList={setSaveList} />
          </div>
        </div>
        <div className="divider p-0 m-0"></div>
        <div className="flex flex-row items-center gap-1">
          <div className="btn btn-success btn flex-1" onClick={handleSave}>
            Save list
          </div>
          {/* default */}
          {session?.user.canModifyDefaults && (
            <div className="flex flex-row gap-1">
              <div>Default</div>
              <input
                type="checkbox"
                className="checkbox"
                defaultChecked={Boolean(initialList?.isDefault)}
                onChange={(e) => {
                  setSaveList((prev) => {
                    return { ...prev, isDefault: e.target.checked };
                  });
                }}
              />
            </div>
          )}
          <div
            className="btn btn flex-1"
            onClick={() => setInitialList(null)}
          >
            Cancel
          </div>
        </div>
      </div>
    </dialog>
  );
}
