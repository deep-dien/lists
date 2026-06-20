import { FaTimes } from "react-icons/fa";
import { useDataMutation } from "@/mutators";
import { Dispatch, SetStateAction, useEffect, useState, useMemo } from "react";
import { useData } from "@/queries";
import { FaEdit } from "react-icons/fa";
import { ItemSave } from "@/components/ItemSave";
import { useSession } from "next-auth/react";
import { FaShareAlt } from "react-icons/fa";
import { FaLayerGroup, FaSortAmountDown, FaSortAmountUp } from "react-icons/fa";
import { Item as ItemModel } from "@/lib/domain/models/item";
import { GearList as GearListModel } from "@/lib/domain/models/gearList";

type DraftItem = Partial<Omit<ItemModel, "weight" | "isDefault">> & {
  weight?: number | string;
  isDefault?: boolean | string;
};

type DraftGearListItem = {
  itemId?: string;
  status?: string;
  quantity?: number;
};

export type DraftGearList = Partial<
  Omit<GearListModel, "items" | "isDefault">
> & {
  items: DraftGearListItem[];
  isDefault?: boolean | string;
};

type SetSaveGearList = Dispatch<SetStateAction<DraftGearList>>;
type SetInitialItem = Dispatch<SetStateAction<DraftItem | null>>;

export function Item({
  item,
  saveGearList,
  setSaveGearList,
  setInitialItem,
}: {
  item: ItemModel;
  saveGearList: DraftGearList;
  setSaveGearList: SetSaveGearList;
  setInitialItem: SetInitialItem;
}) {
  const gearListItems = saveGearList.items;
  const gearListItemIds = saveGearList.items.map((item) => item.itemId);

  return (
    <div className="justify-between flex flex-col w-full">
      <div className="justify-between flex flex-row w-full gap-1">
        <div className="flex-1 capitalize">{item.name}</div>
        {/* edit */}
        <div
          className="flex min-w-0 w-[50px] btn btn-info"
          onClick={() => {
            setInitialItem(item);
          }}
        >
          <FaEdit />
        </div>
        {/* add/remove */}
        {/* add */}
        {!gearListItemIds.includes(item.id) && (
          <div
            className="flex min-w-0 w-[75px] btn btn btn-success"
            onClick={() => {
              setSaveGearList((prev) => {
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
        {gearListItemIds.includes(item.id) && (
          <div
            className="flex min-w-0 w-[75px] btn btn btn-warning"
            onClick={() => {
              setSaveGearList((prev) => {
                return {
                  ...prev,
                  items: gearListItems.filter(
                    (gearListItem) => gearListItem.itemId != item.id,
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
  saveGearList,
  setSaveGearList,
  setInitialItem,
}: {
  items: ItemModel[];
  saveGearList: DraftGearList;
  setSaveGearList: SetSaveGearList;
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
            saveGearList={saveGearList}
            setSaveGearList={setSaveGearList}
            setInitialItem={setInitialItem}
          />
        );
      })}
    </div>
  );
}

type ItemsSubgroup = [string | null, ItemModel[]];
type ItemsGroup = [string, ItemsSubgroup[]];

export function GearListItems({
  saveGearList,
  setSaveGearList,
}: {
  saveGearList: DraftGearList;
  setSaveGearList: SetSaveGearList;
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

  // categories
  const categories: string[] = [
    ...new Set(itemsAll.map((item) => item.category)),
  ]
    .filter((category): category is string => Boolean(category))
    .sort();

  // sort mode
  const [sortMode, setSortMode] = useState("category");
  const [sortAddedAsc, setSortAddedAsc] = useState(true);

  // sort items
  // shape: [group, [[subCategory, items], ...]]
  // subCategory is null when there's no sub-header to render (category mode)
  const itemsGrouped: ItemsGroup[] = useMemo(() => {
    if (!itemsAll) return [];
    const gearListItemIds = saveGearList.items.map((item) => item.itemId);

    if (sortMode === "added") {
      const groups = sortAddedAsc
        ? ["added", "not added"]
        : ["not added", "added"];
      return groups.map((group): ItemsGroup => {
        const itemsGroup = itemsAll.filter((item) =>
          group === "added"
            ? gearListItemIds.includes(item.id)
            : !gearListItemIds.includes(item.id),
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

    return categories
      .map((category): ItemsGroup => {
        const itemsCategory = itemsAll.filter(
          (item) => item.category === category,
        );
        itemsCategory.sort((a, b) => {
          const includedA = Number(gearListItemIds.includes(a.id));
          const includedB = Number(gearListItemIds.includes(b.id));
          if (includedA != includedB) return includedA - includedB;
          return (a.name ?? "").localeCompare(b.name ?? "");
        });
        return [category, [[null, itemsCategory]]];
      })
      .sort((a, b) => {
        const [itemsA, itemsB] = [a[1][0][1], b[1][0][1]];
        const addedA = Number(
          itemsA.every((item) => gearListItemIds.includes(item.id)),
        );
        const addedB = Number(
          itemsB.every((item) => gearListItemIds.includes(item.id)),
        );
        return addedA - addedB;
      });
  }, [itemsAll, saveGearList.items, categories, sortMode, sortAddedAsc]);

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
      <div className="flex w-full flex-row items-center justify-between gap-1">
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
        <div className="btn btn-success btn" onClick={() => setInitialItem({})}>
          Create
        </div>
      </div>
      {/* sort row */}
      <div className="gap-1 flex-row flex">
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
        {/* added */}
        <div
          className={`flex btn btn-lg ${
            sortMode === "added" ? "btn-active" : ""
          }`}
          onClick={() => {
            if (sortMode === "added") {
              setSortAddedAsc((prev) => !prev);
            } else {
              setSortMode("added");
            }
          }}
        >
          {sortAddedAsc ? <FaSortAmountDown /> : <FaSortAmountUp />}
          Added
        </div>
      </div>
      {/* divider */}
      <div className="divider p-0 m-0"></div>
      {/* items */}
      <div className="overflow-y-auto w-full">
        {itemsFiltered.map(([group, subgroups]) => {
          return (
            <div key={group} className="gap-1">
              <div className="divider font-bold capitalize flex">
                {group}
              </div>
              {subgroups.map(([subCategory, items]) => {
                return (
                  <div key={subCategory ?? "all"} className="gap-1">
                    {subCategory && (
                      <div className="divider capitalize flex">
                        {subCategory}
                      </div>
                    )}
                    <ItemsList
                      items={items}
                      saveGearList={saveGearList}
                      setSaveGearList={setSaveGearList}
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

export function GearListSave({
  initialGearList,
  setInitialGearList,
  categories = [],
}: {
  initialGearList: DraftGearList;
  setInitialGearList: Dispatch<SetStateAction<DraftGearList | null>>;
  categories?: string[];
}) {
  // session
  const { data: session } = useSession();

  //   gear list
  const [saveGearList, setSaveGearList] =
    useState<DraftGearList>(initialGearList);

  // save gear list
  const saveGearListMutation = useDataMutation("/api/gear-lists", "PUT", [
    `/api/gearlists/${initialGearList.id}`,
    "/api/gear-lists",
    "/api/gear-lists/defaults",
    "/api/items",
  ]);
  const handleSave = function () {
    const gearList = {
      ...saveGearList,
      name: (saveGearList.name ?? "").toLowerCase().trim(),
    };
    saveGearListMutation.mutateAsync(gearList);
    setInitialGearList(null);
  };

  return (
    <dialog className="modal modal-open h-full overflow-hidden p-1">
      <div className="modal-box w-[100%] h-[90%] flex flex-col gap-1">
        {/* title */}
        <div className="w-full flex-row justify-between flex items-center min-h-0">
          <div className="font-bold">Save gear list</div>
          <div className="btn btn" onClick={() => setInitialGearList(null)}>
            <FaTimes />
          </div>
        </div>
        <div className="flex-col flex flex-1 min-h-0">
          <div className="w-full flex flex-row gap-x-1 items-center">
            {/* name */}
            <div className="">Name:</div>
            <input
              type="text"
              className="capitalize input input-bordered w-full"
              placeholder="e.g. Hiking overnight"
              defaultValue={initialGearList?.name}
              onChange={(e) => {
                setSaveGearList((prev) => {
                  return { ...prev, name: e.target.value };
                });
              }}
            />
          </div>
          <div className="divider p-0 m-0"></div>
          {/* items */}
          <div className="w-full flex flex-row flex-1 overflow-y-auto">
            <GearListItems
              saveGearList={saveGearList}
              setSaveGearList={setSaveGearList}
            />
          </div>
        </div>{" "}
        {/* default */}
        {session?.user.canModifyDefaults && (
          <div className="flex flex-row gap-1">
            <div>Default</div>
            <input
              type="checkbox"
              className="checkbox"
              defaultChecked={Boolean(initialGearList?.isDefault)}
              onChange={(e) => {
                setSaveGearList((prev) => {
                  return { ...prev, isDefault: e.target.checked };
                });
              }}
            />
          </div>
        )}
        <div className="divider p-0 m-0"></div>
        <div className="flex flex-row items-center gap-1">
          <div className="btn btn-success btn flex-1" onClick={handleSave}>
            Save gear list
          </div>
          <div
            className="btn btn flex-1"
            onClick={() => setInitialGearList(null)}
          >
            Cancel
          </div>
        </div>
      </div>
    </dialog>
  );
}
