import { FaTimes } from "react-icons/fa";
import { Dispatch, SetStateAction, useState } from "react";
import { useSession } from "next-auth/react";
import { Item } from "@/lib/domain/models/item";
import { useMutationItemDelete, useMutationItemSave } from "@/mutators";

type DraftItem = Partial<Omit<Item, "weight" | "isDefault">> & {
  weight?: number | string;
  isDefault?: boolean | string;
};

export function ItemSave({
  initialItem,
  setInitialItem,
  categories = [],
}: {
  initialItem: DraftItem;
  setInitialItem: Dispatch<SetStateAction<DraftItem | null>>;
  categories?: string[];
}) {
  const { data: session } = useSession();

  //   item
  const [saveItem, setSaveItem] = useState<DraftItem>(initialItem);

  // save item
  const mutationItemSave = useMutationItemSave();
  const handleSave = function () {
    const item = {
      ...saveItem,
      name: (saveItem.name ?? "").trim(),
      category: (saveItem.category ?? "").trim(),
    };
    mutationItemSave.mutateAsync({ item });
    setInitialItem(null);
  };

  // delete item
  const mutationItemDelete = useMutationItemDelete();
  const handleDelete = function () {
    if (!initialItem.id) return;
    if (!confirm(`Delete "${initialItem.name}"?`)) return;
    mutationItemDelete.mutateAsync({ itemId: initialItem.id });
    setInitialItem(null);
  };

  return (
    <div className="modal modal-open" role="dialog" aria-modal="true">
      <div className="modal-box w-11/12 max-w-3xl p-0">
        <div className="flex items-center justify-between gap-2 border-b border-base-300 px-4 py-2">
          <div className="font-bold">
            {initialItem.id ? "Edit item" : "New item"}
          </div>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setInitialItem(null)}
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 py-3">
          {/* Name */}
          <div className="">
            <div className="">Item name:</div>
            <input
              type="text"
              className="input  w-full"
              placeholder="e.g. Trekking Poles"
              defaultValue={initialItem?.name}
              onChange={(e) => {
                setSaveItem((prev) => {
                  return { ...prev, name: e.target.value };
                });
              }}
            />
          </div>

          {/* Weight */}
          <div className="">
            <div className="">Weight (g):</div>
            <input
              type="number"
              min="0"
              step="1"
              className="input input-bordered w-full"
              placeholder="e.g. 250"
              defaultValue={initialItem?.weight}
              onChange={(e) => {
                setSaveItem((prev) => {
                  return { ...prev, weight: e.target.value };
                });
              }}
            />
          </div>

          {/* Existing Category */}
          <div className="">
            <div className="">Category:</div>
            <select
              className="select w-full"
              value={saveItem?.category ?? ""}
              onChange={(e) => {
                setSaveItem((prev) => ({
                  ...prev,
                  category: e.target.value,
                }));
              }}
            >
              <option value="" disabled hidden>
                Select category
              </option>
              {categories.map((category) => (
                <option key={category} value={category} className="">
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Manual Category */}
          <div className="">
            <div className="">Or create category:</div>
            <input
              type="text"
              className="input w-full"
              placeholder="e.g. Navigation"
              onChange={(e) => {
                setSaveItem((prev) => {
                  return { ...prev, category: e.target.value };
                });
              }}
            />
          </div>

          {/* base weight */}
          <label className="flex items-center gap-2 md:col-span-2">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              defaultChecked={initialItem?.isBase !== false}
              onChange={(e) => {
                setSaveItem((prev) => {
                  return { ...prev, isBase: e.target.checked };
                });
              }}
            />
            <span>
              Base weight
              <span className="ml-1 text-sm opacity-60">
                (untick for food, water, fuel and worn clothing)
              </span>
            </span>
          </label>

          {/* default */}
          {session?.user.canModifyDefaults && (
            <div className="flex flex-row gap-1">
              <div>Default</div>
              <input
                type="checkbox"
                className="checkbox"
                defaultChecked={Boolean(initialItem?.isDefault)}
                onChange={(e) => {
                  setSaveItem((prev) => {
                    return { ...prev, isDefault: e.target.checked };
                  });
                }}
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-base-300 px-4 py-2">
          {initialItem.id && (
            <button
              type="button"
              className="btn btn-outline btn-error btn-sm"
              onClick={handleDelete}
            >
              Delete item
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setInitialItem(null)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-success btn-sm"
            onClick={handleSave}
          >
            Save item
          </button>
        </div>
      </div>
    </div>
  );
}
