import { FaTimes } from "react-icons/fa";
import { useDataMutation } from "@/mutators";
import { useEffect, useState, useMemo } from "react";
import { useData } from "@/queries";

import { ItemSave } from "@/components/ItemSave";

export function Item({
  item,
  saveGearList,
  setSaveGearList,
}: {
  item: GearListModel;
}) {
  const gearListItems = saveGearList.items;
  const gearListItemIds = saveGearList.items.map((item) => item.itemId);

  return (
    <div className="justify-between flex flex-col w-full">
      <div className="justify-between flex flex-row w-full">
        <div className="flex-1 capitalize">{item.name}</div>
        {/* add/remove */}
        {/* add */}
        {!gearListItemIds.includes(item.id) && (
          <div
            className="flex min-w-0 w-[100px] btn-xs btn btn-success"
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
            className="flex min-w-0 w-[100px] btn-xs btn btn-warning"
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
}: {
  items: [];
}) {
  if (items.length === 0) {
    return (
      <div className="p-1 items-center w-full h-full"> No items found</div>
    );
  }
  return (
    <div className="items-center flex-col w-full h-full gap-2">
      {items.map((item) => {
        return (
          <Item
            key={item.id}
            item={item}
            saveGearList={saveGearList}
            setSaveGearList={setSaveGearList}
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

  // sort items\
  const itemSorted = useMemo(() => {
    return [...(items ?? [])].sort(
      (a, b) =>
        Number(saveGearList.items.map((item) => item.itemId).includes(a.id)) -
        Number(saveGearList.items.map((item) => item.itemId).includes(b.id)),
    );
  }, [items, saveGearList.items]);

  console.log(items);
  console.log("saveGearList", saveGearList);

  // search
  const [search, setSearch] = useState("");
  const itemsFiltered = (itemSorted ?? []).filter((list: GearListModel) =>
    list.name.toLowerCase().includes(search.toLowerCase()),
  );

  // new item
  const [initialItem, setInitialItem] = useState(null);

  return (
    <div className="flex h-full w-full min-h-0 flex-col">
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
        <div
          className="btn btn-success btn-sm"
          onClick={() => setInitialItem({})}
        >
          Create
        </div>
      </div>
      {/* divider */}
      <div className="divider p-0 m-0"></div>
      {/* items */}
      <div className="overflow-y-auto w-full">
        <ItemsList
          items={itemsFiltered}
          saveGearList={saveGearList}
          setSaveGearList={setSaveGearList}
        />
      </div>
      {/* item save modal */}
      {!!initialItem && (
        <ItemSave initialItem={initialItem} setInitialItem={setInitialItem} />
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
    "/api/gear-lists",
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
      <div className="modal-box w-11/12 max-w-3xl h-[90vh] flex flex-col gap-1">
        {/* title */}
        <div className="w-full flex-row justify-between flex items-center min-h-0">
          <div className="font-bold">Save gear list</div>
          <div className="btn btn-xs" onClick={() => setInitialGearList(null)}>
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
          <div className="btn btn-success btn-sm flex-1" onClick={handleSave}>
            Save gear list
          </div>
          <div
            className="btn btn-sm flex-1"
            onClick={() => setInitialGearList(null)}
          >
            Cancel
          </div>
        </div>
      </div>
    </dialog>
  );
}
