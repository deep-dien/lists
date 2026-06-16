"use client";

import { Loading } from "@/components/Loading";
import { GearList as GearListModel } from "@/lib/domain/models/gearList";
import { useData } from "@/queries";
import { useDataMutation } from "@/mutators";
import { useState, useMemo } from "react";
import { MdDelete } from "react-icons/md";
import { FaEdit } from "react-icons/fa";

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
        <div> {item.isDefault ? "Default" : ""}</div>
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
            deleteMutation.mutateAsync(undefined);
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
  // items
  const { data: items = [], isLoading } = useData("/api/items", {
    includeDefaults: true,
  });

  // categories
  const categories = [...new Set(items.map((item) => item.category))]
    .filter(Boolean)
    .sort();

  // sort items
  const itemsGrouped = useMemo(() => {
    if (!items) return [];
    return categories.map((category) => {
      const itemsCategory = items.filter((item) => item.category === category);
      itemsCategory.sort((a, b) => a.name.localeCompare(b.name));
      return [category, itemsCategory];
    });
  }, [items]);

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

  // initial item for item save
  const [initialItem, setInitialItem] = useState(null);

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
        {itemsFiltered.map(([category, itemsCategory]) => {
          return (
            <div key={category} className="gap-1">
              <div className="font-bold capitalize flex divider">
                {category}
              </div>
              <ItemsList
                items={itemsCategory}
                initialItem={initialItem}
                setInitialItem={setInitialItem}
              />
            </div>
          );
        })}
        <div className="w-full h-[50px]"></div>
      </div>

      {/* create button */}
      <div
        className="btn btn-success btn-xl fixed bottom-2 right-2 z-50"
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
