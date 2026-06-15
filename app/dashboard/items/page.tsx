"use client";

import { Loading } from "@/components/Loading";
import { GearList as GearListModel } from "@/lib/domain/models/gearList";
import { useData } from "@/queries";
import { useDataMutation } from "@/mutators";
import { useState } from "react";
import { redirect } from "next/navigation";

import { ItemSave } from "@/components/ItemSave";

export function Item({ item, setInitialItem }: { item: GearListModel }) {
  const deleteMutation = useDataMutation(`/api/items/${item.id}`, "DELETE", [
    "/api/items",
  ]);

  return (
    <div className="justify-between flex flex-col w-full p-1 items-center">
      <div className="justify-between flex flex-row w-full gap-1 items-center">
        <div className="flex-1 capitalize">{item.name}</div>
        <div
          className="flex min-w-0 btn btn-sm btn-info"
          onClick={() => {
            setInitialItem(item);
          }}
        >
          Edit
        </div>
        <div
          className="flex min-w-0 btn btn-sm btn-error"
          onClick={() => {
            deleteMutation.mutateAsync(undefined);
          }}
        >
          Delete
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
  items: GearListModel[];
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
  // state
  const { data: items, isLoading } = useData("/api/items", {
    includeDefaults: true,
  });

  const [search, setSearch] = useState("");
  const itemsFiltered = (items ?? []).filter((list: GearListModel) =>
    list.name.toLowerCase().includes(search.toLowerCase()),
  );

  const categories = [
    ...new Set(
      (items ? items : []).map((item) => item.category).filter(Boolean),
    ),
  ];

  const [initialItem, setInitialItem] = useState(null);

  if (isLoading) return <Loading />;

  return (
    <div className="flex h-full w-full min-h-0 flex-col">
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
      <div className="divider m-0 p-0"></div>
      {/* items */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ItemsList items={itemsFiltered} setInitialItem={setInitialItem} />
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
