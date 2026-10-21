"use client";

import { Loading } from "@/components/Loading";
import { List as ListModel } from "@/lib/domain/models/list";
import { useData, prefetchData } from "@/queries";
import { useMutationListClone } from "@/mutators";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { Share } from "@/components/Share";
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

// The whole card opens the list — same affordance as Mat-Trix's trip cards.
// Share is the one thing on the card that isn't "open the list"; editing and
// deleting live behind the list name on the list page.
export function ListCard({ list }: { list: ListModel }) {
  const router = useRouter();
  const open = () => router.push(`/dashboard/lists/${list.id}`);

  const total = list.items?.length ?? 0;
  // "leave" items are dealt with too — they just aren't going
  const packed = (list.items ?? []).filter(
    (item) => item.status === "packed" || item.status === "leave",
  ).length;
  const done = total > 0 && packed === total;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      title="Open list"
      className="w-full overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-sm cursor-pointer transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
    >
      <div className="flex items-center gap-3 px-3 py-2 sm:px-4 transition-colors hover:bg-base-300/40">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-lg font-bold">{list.name}</span>
            {list?.isDefault ? (
              <span className="badge badge-neutral badge-sm shrink-0">
                Default
              </span>
            ) : null}
          </div>
          {/* nothing packed yet — just the name */}
          {packed > 0 && (
            <div className={`text-sm ${done ? "text-success" : "opacity-70"}`}>
              {done
                ? `All ${total} packed`
                : `${total - packed} of ${total} left to pack`}
            </div>
          )}
        </div>
        <Share listId={list.id} name={list.name} />
      </div>
      {/* packing progress */}
      {packed > 0 && (
        <div className="h-1 w-full bg-base-200">
          <div
            className={`h-full ${done ? "bg-success" : "bg-info"}`}
            style={{ width: `${(packed / total) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function ListList({ lists }: { lists: ListModel[] }) {
  if (lists.length === 0) {
    return (
      <div className="px-4 py-12 text-center opacity-70">
        No lists found. Create one, or seed from a default above.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(20rem,1fr))]">
      {lists.map((list) => (
        <ListCard key={list.id} list={list} />
      ))}
    </div>
  );
}

export function ListDefault({ list }: { list: ListModel }) {
  const mutationListClone = useMutationListClone();

  return (
    <div
      key={list.id}
      className="btn btn-outline btn-sm"
      title="Add a copy of this list"
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
    <div className="flex h-full w-full min-h-0 flex-col overflow-hidden">
      {/* header bar */}
      <div className="flex shrink-0 flex-col gap-2 bg-base-200 border-b border-base-content/15 px-3 py-2 shadow-sm">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold">Lists</h2>
          <input
            type="search"
            placeholder="Search..."
            className="input input-sm flex-1 min-w-0"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-success btn-sm"
            onClick={() => setInitialList({ items: [] })}
          >
            Create new
          </button>
        </div>
        {/* defaults */}
        {!!listsDefaults?.length && (
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-sm opacity-70">Seed from defaults:</span>
            {listsDefaults.map((list: ListModel) => {
              return <ListDefault key={list.id} list={list} />;
            })}
          </div>
        )}
      </div>
      {/* lists */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-base-200/40 p-2">
        <ListList lists={listsSearch} />
      </div>
      {/* modal */}
      {initialList && (
        <ListSave initialList={initialList} setInitialList={setInitialList} />
      )}
    </div>
  );
}
