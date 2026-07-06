"use client";

import { Loading } from "@/components/Loading";
import { List as ListModel } from "@/lib/domain/models/list";
import { useData, prefetchData } from "@/queries";
import { useMutationListClone, useMutationListDelete } from "@/mutators";
import { Dispatch, SetStateAction, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { FaEdit } from "react-icons/fa";
import { MdDelete } from "react-icons/md";
import { IoReturnDownBack, IoReturnDownForward } from "react-icons/io5";
import { useQueryClient } from "@tanstack/react-query";

import { Copy } from "@/components/Copy";
import { ListSave } from "@/components/ListSave";
import { useSession } from "next-auth/react";

type DraftListItem = {
  itemId?: string;
  status?: string;
  quantity?: number;
};

type DraftList = Partial<Omit<ListModel, "items" | "isDefault">> & {
  items: DraftListItem[];
  isDefault?: boolean | string;
};

type SetInitialList = Dispatch<SetStateAction<DraftList | null>>;

export function ListRow({
  list,
  setInitialList,
}: {
  list: ListModel;
  setInitialList: SetInitialList;
}) {
  const queryClient = useQueryClient();
  const mutationListDelete = useMutationListDelete();

  return (
    <div className="justify-between flex flex-col w-full items-center">
      <div className="justify-between flex flex-row w-full items-center gap-1">
        {/* title */}
        <div className="flex-1">{list.name}</div>
        {list?.isDefault ? <div className="badge">D</div> : null}
        {/* copy */}
        <Copy endpoint={`/dashboard/lists/${list.id}`} />
        {/* edit */}
        <div
          className="flex min-w-0 btn btn-info btn-md"
          onClick={() => {
            setInitialList(list);
          }}
        >
          <FaEdit />
        </div>
        {/* delete */}
        <div
          className="flex min-w-0 btn btn-error btn-md"
          onClick={() => {
            mutationListDelete.mutateAsync({ listId: list.id });
          }}
        >
          <MdDelete />
        </div>
        {/* go to */}
        <Link
          href={`/dashboard/lists/${list.id}`}
          prefetch={true}
          className="flex min-w-0 btn btn-success btn-md"
        >
          <IoReturnDownForward />
        </Link>
      </div>
      <div className="divider p-0 m-0"></div>
    </div>
  );
}

export function ListList({
  lists,
  setInitialList,
}: {
  lists: ListModel[];
  setInitialList: SetInitialList;
}) {
  if (lists.length === 0) {
    return (
      <div className="p-1 items-center w-full h-full"> No lists found</div>
    );
  }
  return (
    <div className="p-1 items-center w-full h-full">
      <div className="w-full">
        {lists.map((list) => {
          return (
            <ListRow
              key={list.id}
              list={list}
              setInitialList={setInitialList}
            ></ListRow>
          );
        })}
      </div>
    </div>
  );
}

export function ListDefault({ list }: { list: ListModel }) {
  const mutationListClone = useMutationListClone();

  return (
    <div
      key={list.id}
      className="flex btn btn-outline"
      onClick={() => {
        mutationListClone.mutateAsync({ list });
      }}
    >
      {list.name}
    </div>
  );
}

export default function Lists() {
  // session
  const { data: session, status } = useSession();

  // state
  const { data: lists = [], isLoading: listsLoading } = useData("/api/lists");

  // filter for defaults
  const { data: listsDefaults = [], isLoading: listsDefaultsLoading } = useData(
    "/api/lists/defaults",
  );
  listsDefaults.sort((a, b) => a.name.localeCompare(b.name));

  // lists all (own defaults come back from both endpoints — dedupe by id)
  const listsAll: ListModel[] = useMemo(() => {
    if (listsLoading || listsDefaultsLoading) return [];
    if (session?.user?.canModifyDefaults) {
      const listIds = lists.map((list: ListModel) => list.id);
      return [
        ...lists,
        ...listsDefaults.filter(
          (list: ListModel) => !listIds.includes(list.id),
        ), // dedupe by id
      ];
    } else {
      return lists;
    }
  }, [
    lists,
    listsDefaults,
    session?.user?.canModifyDefaults,
    listsLoading,
    listsDefaultsLoading,
  ]);

  // warm each list's data (and the items it renders) while online so
  // navigating to a list still works offline
  const queryClient = useQueryClient();
  useEffect(() => {
    listsAll.forEach((list) => {
      prefetchData(queryClient, `/api/lists/${list.id}`);
    });
    prefetchData(queryClient, "/api/items");
    prefetchData(queryClient, "/api/items/defaults");
  }, [listsAll, queryClient]);

  // listsAll sort
  listsAll.sort((a: ListModel, b: ListModel) => {
    if (a.isDefault != b.isDefault)
      return Number(a.isDefault) - Number(b.isDefault);
    return a.name.localeCompare(b.name);
  });

  // filter for search term
  const [search, setSearch] = useState("");
  const listsSearch = listsAll.filter((list: ListModel) =>
    list.name.toLowerCase().includes(search.toLowerCase()),
  );

  // set initial list for list editing
  const [initialList, setInitialList] = useState<DraftList | null>(null);

  if (listsLoading || listsDefaultsLoading) return <Loading />;
  if (status === "loading") return <Loading />;

  return (
    <div className="flex h-full w-full min-h-0 flex-col">
      {/* header */}
      <div className="flex flex-shrink-0 flex-col items-center justify-between gap-1">
        <div className="flex flex-shrink-0 flex-row w-full items-center justify-between gap-1">
          {/* title  */}
          <div className="flex font-bold"> Lists</div>
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
        {!!listsDefaults?.length && (
          <div className="flex flex-row flex-wrap flex-shrink-0 items-center w-full  gap-1">
            <div className="flex">Seed from defaults:</div>
            <div className="flex flex-wrap gap-1">
              {listsDefaults.map((list: ListModel) => {
                return <ListDefault key={list.id} list={list} />;
              })}
            </div>
          </div>
        )}
      </div>
      {/* divider */}
      <div className="divider m-0 p-0"></div>
      {/* lists */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ListList lists={listsSearch} setInitialList={setInitialList} />
      </div>
      {/* create new */}
      <div
        className="btn btn-success btn-lg fixed bottom-2 right-2 z-50"
        onClick={() => {
          setInitialList({ items: [] });
        }}
      >
        Create
      </div>
      {/* modal */}
      {initialList && (
        <ListSave initialList={initialList} setInitialList={setInitialList} />
      )}
    </div>
  );
}
