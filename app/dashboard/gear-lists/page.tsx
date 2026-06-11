"use client";

import { Loading } from "@/components/Loading";
import { GearList as GearListModel } from "@/lib/domain/models/gearList";
import { useData } from "@/queries";
import { useDataMutation } from "@/mutators";
import { useState } from "react";
import { redirect } from "next/navigation";

export function GearList({ gear_list }: { gear_list: GearListModel }) {
  const deleteMutation = useDataMutation(
    `/api/gear-lists/${gear_list.id}`,
    "DELETE",
    ["/api/gear-lists"],
  );

  return (
    <div className="justify-between flex flex-col w-full p-1 items-center">
      <div className="justify-between flex flex-row w-full p-1 items-center">
        <div
          className="flex-1 btn btn-success"
          onClick={() => redirect(`/dashboard/gear-lists/${gear_list.id}`)}
        >
          {gear_list.name}
        </div>
        {gear_list.isDefault && (
          <div className="flex min-w-0 badge">DEFAULT</div>
        )}
        {!gear_list.isDefault && (
          <div
            className="flex min-w-0 btn btn-error"
            onClick={() => {
              deleteMutation.mutateAsync(undefined);
            }}
          >
            Delete
          </div>
        )}
      </div>
      <div className="divider p-1 m-0"></div>
    </div>
  );
}

export function List({ gear_lists }: { gear_lists: GearListModel[] }) {
  if (gear_lists.length === 0) {
    return (
      <div className="p-1 items-center w-full h-full"> No lists found</div>
    );
  }

  return (
    <div className="p-1 items-center w-full h-full">
      <div className="w-full">
        {gear_lists.map((gear_list) => {
          return <GearList key={gear_list.id} gear_list={gear_list}></GearList>;
        })}
      </div>
    </div>
  );
}

export default function GearLists() {
  // state
  const [includeDefaults, setIncludeDefaults] = useState(true);
  const [search, setSearch] = useState("");

  const { data: gear_lists, isLoading } = useData("/api/gear-lists", {
    includeDefaults: includeDefaults,
  });

  if (isLoading) return <Loading />;

  const gear_lists_filtered = (gear_lists ?? []).filter((list: GearListModel) =>
    list.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex h-full w-full min-h-0 flex-col">
      <header className="flex flex-shrink-0 flex-row items-center justify-between gap-1">
        {/* title  */}
        <div className="flex font-bold"> Gear lists</div>
        {/* search  */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search..."
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {/* defaults */}
        <div
          className={
            includeDefaults ? "btn btn-outline btn-active" : "btn btn-outline"
          }
          onClick={() => setIncludeDefaults((prev) => !prev)}
        >
          Defaults
        </div>
      </header>
      <div className="divider m-0 p-0"></div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <List gear_lists={gear_lists_filtered} />
      </div>
      <div
        className="btn btn-success btn-lg fixed bottom-2 right-2 z-50"
        onClick={() => {}}
      >
        Create
      </div>
    </div>
  );
}
