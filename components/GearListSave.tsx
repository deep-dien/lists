import { FaTimes } from "react-icons/fa";
import { useDataMutation } from "@/mutators";
import { useEffect, useState, useMemo } from "react";
import { useData } from "@/queries";

import { ItemSave } from "@/components/ItemSave";

export function Item({
  item,
  saveGearList,
  setSaveGearList,
  setInitialItem,
}: {
  item: GearListModel;
}) {
  const gearListItems = saveGearList.items;
  const gearListItemIds = saveGearList.items.map((item) => item.itemId);

  return (
    <div className="justify-between flex flex-col w-full">
      <div className="justify-between flex flex-row w-full gap-1">
        <div className="flex-1 capitalize">{item.name}</div>
        {/* edit */}
        <div
          className="flex min-w-0 w-[100px] btn btn-info"
          onClick={() => {
            setInitialItem(item);
          }}
        >
          Edit
        </div>
        {/* add/remove */}
        {/* add */}
        {!gearListItemIds.includes(item.id) && (
          <div
            className="flex min-w-0 w-[100px] btn btn btn-success"
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
            className="flex min-w-0 w-[100px] btn btn btn-warning"
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
  items: [];
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

export function GearListItems({ saveGearList, setSaveGearList }) {
  // items
  const { data: items = [], isLoading } = useData("/api/items", {
    includeDefaults: true,
  });

  // categories
  const categories = [...new Set(items.map((item) => item.category))];

  // sort items
  const itemsGrouped = useMemo(() => {
    if (!items) return [];
    return categories
      .map((category) => {
        const itemsCategory = items.filter(
          (item) => item.category === category,
        );
        itemsCategory.sort(
          (a, b) =>
            Number(
              saveGearList.items.map((item) => item.itemId).includes(a.id),
            ) -
            Number(
              saveGearList.items.map((item) => item.itemId).includes(b.id),
            ),
        );
        return [category, itemsCategory];
      })
      .sort((a, b) => {
        const [itemsA, itemsB] = [a[1], b[1]];
        const addedA = Number(
          itemsA.every((item) =>
            saveGearList.items.map((i) => i.itemId).includes(item.id),
          ),
        );
        const addedB = Number(
          itemsB.every((item) =>
            saveGearList.items.map((i) => i.itemId).includes(item.id),
          ),
        );
        console.log(a[0], addedA, b[0], addedB);
        return addedA - addedB;
      });
  }, [items, saveGearList.items, categories]);

  // search
  const [search, setSearch] = useState("");
  const itemsFiltered = itemsGrouped
    .map(([category, itemsCategory]) => {
      const itemsFilter = itemsCategory.filter(
        (item) =>
          item.name.toLowerCase().includes(search.toLowerCase()) ||
          category.includes(search),
      );
      return [category, itemsFilter];
    })
    .filter(
      ([category, itemsCategory]) =>
        !!itemsCategory?.length || category.includes(search),
    );

  // new item
  const [initialItem, setInitialItem] = useState(null);

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
      {/* divider */}
      <div className="divider p-0 m-0"></div>
      {/* items */}
      <div className="overflow-y-auto w-full">
        {itemsFiltered.map(([category, itemsCategory]) => {
          return (
            <div key={category} className="gap-1">
              <div className="divider font-bold capitalize flex">
                {category}
              </div>
              <ItemsList
                items={itemsCategory}
                saveGearList={saveGearList}
                setSaveGearList={setSaveGearList}
                setInitialItem={setInitialItem}
              />
              {/* <div className="divider p-0 m-0"></div> */}
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
}) {
  //   gear list
  const [saveGearList, setSaveGearList] = useState(initialGearList);

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
      name: saveGearList.name.toLowerCase().trim(),
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
        </div>
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
