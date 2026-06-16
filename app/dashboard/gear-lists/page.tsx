"use client";

import { Loading } from "@/components/Loading";
import { GearList as GearListModel } from "@/lib/domain/models/gearList";
import { useData } from "@/queries";
import { useDataMutation } from "@/mutators";
import { useEffect, useState, useMemo } from "react";
import { redirect } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { FaEdit } from "react-icons/fa";
import { MdDelete } from "react-icons/md";
import { IoReturnDownBack, IoReturnDownForward } from "react-icons/io5";

import { Copy } from "@/components/Copy";
import { GearListSave } from "@/components/GearListSave";
import { useSession } from "next-auth/react";

export function GearList({
  gearList,
  setInitialGearList,
}: {
  gearList: GearListModel;
}) {
  const deleteMutation = useDataMutation(
    `/api/gear-lists/${gearList.id}`,
    "DELETE",
    ["/api/gear-lists"],
  );

  return (
    <div className="justify-between flex flex-col w-full items-center">
      <div className="justify-between flex flex-row w-full items-center gap-1">
        {/* title */}
        <div className="flex-1 capitalize">{gearList.name}</div>
        {gearList?.isDefault ? <div className="badge">Default</div> : null}
        {/* copy */}
        <Copy endpoint={`/dashboard/gear-lists/${gearList.id}`} />
        {/* edit */}
        <div
          className="flex min-w-0 btn btn-info btn-lg"
          onClick={() => {
            setInitialGearList(gearList);
          }}
        >
          <FaEdit />
        </div>
        {/* delete */}
        <div
          className="flex min-w-0 btn btn-error btn-lg"
          onClick={() => {
            deleteMutation.mutateAsync(undefined);
          }}
        >
          <MdDelete />
        </div>
        {/* go to */}
        <div
          className="flex min-w-0 btn btn-success btn-lg"
          onClick={() => {
            redirect(`/dashboard/gear-lists/${gearList.id}`);
          }}
        >
          <IoReturnDownForward />
        </div>
      </div>
      <div className="divider p-1 m-0"></div>
    </div>
  );
}

export function GearListList({
  gearLists,
  setInitialGearList,
}: {
  gearLists: GearListModel[];
}) {
  if (gearLists.length === 0) {
    return (
      <div className="p-1 items-center w-full h-full"> No lists found</div>
    );
  }
  return (
    <div className="p-1 items-center w-full h-full">
      <div className="w-full">
        {gearLists.map((gearList) => {
          return (
            <GearList
              key={gearList.id}
              gearList={gearList}
              setInitialGearList={setInitialGearList}
            ></GearList>
          );
        })}
      </div>
    </div>
  );
}

export function GearListDefault({ gearList }) {
  const cloneGearList = useDataMutation(
    `/api/gear-lists/${gearList.id}/clone`,
    "POST",
    ["/api/gear-lists", "/api/items"],
  );

  return (
    <div
      key={gearList.id}
      className="flex btn btn-outline capitalize"
      onClick={() => {
        cloneGearList.mutateAsync(undefined);
      }}
    >
      {gearList.name}
    </div>
  );
}

export default function GearLists() {
  // session
  const { data: session, status } = useSession();

  // state
  const { data: gearLists = [], isLoading: gearListsLoading } =
    useData("/api/gear-lists");

  // filter for defaults
  const { data: gearListsDefaults = [], isLoading: gearListsDefaultsLoading } =
    useData("/api/gear-lists/defaults");

  // gear lists all
  const gearListsAll = useMemo(() => {
    if (gearListsLoading || gearListsDefaultsLoading) return [];
    if (session?.user?.canModifyDefaults) {
      return [...gearLists, ...gearListsDefaults];
    } else {
      return gearLists;
    }
  }, [gearLists, gearListsDefaults, session?.user?.canModifyDefaults]);

  // gearListsAll sort
  gearListsAll.sort((a, b) => {
    if (a.isDefault != b.isDefault) return a.isDefault - b.isDefault;
    return a.name.localeCompare(b.name);
  });

  // filter for search term and no defau;t
  const [search, setSearch] = useState("");
  const gearListsSearch = gearListsAll.filter((gearList: GearListModel) =>
    gearList.name.toLowerCase().includes(search.toLowerCase()),
  );

  // set initial gear list for gear list editing
  const [initialGearList, setInitialGearList] = useState(null);

  if (gearListsLoading || gearListsDefaultsLoading) return <Loading />;
  if (status === "loading") return <Loading />;

  return (
    <div className="flex h-full w-full min-h-0 flex-col">
      {/* header */}
      <div className="flex flex-shrink-0 flex-col items-center justify-between gap-1">
        <div className="flex flex-shrink-0 flex-row w-full items-center justify-between gap-1">
          {/* title  */}
          <div className="flex font-bold capitalize"> Gear lists</div>
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
        </div>
        {/* defaults */}
        {!!gearListsDefaults?.length && (
          <div className="flex flex-row flex-wrap flex-shrink-0 items-center w-full  gap-1">
            <div className="flex">Seed from defaults:</div>
            <div className="flex flex-wrap gap-1">
              {gearListsDefaults.map((gearList) => {
                return (
                  <GearListDefault key={gearList.id} gearList={gearList} />
                );
              })}
            </div>
          </div>
        )}
      </div>
      {/* divider */}
      <div className="divider m-0 p-0"></div>
      {/* gear lists */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <GearListList
          gearLists={gearListsSearch}
          setInitialGearList={setInitialGearList}
        />
      </div>
      {/* create new */}
      <div
        className="btn btn-success btn-xl fixed bottom-2 right-2 z-50"
        onClick={() => {
          setInitialGearList({ items: [] });
        }}
      >
        Create
      </div>
      {/* modal */}
      {initialGearList && (
        <GearListSave
          initialGearList={initialGearList}
          setInitialGearList={setInitialGearList}
        />
      )}
    </div>
  );
}
