import { FaTimes } from "react-icons/fa";
import { useDataMutation } from "@/mutators";
import { useState } from "react";

export function ItemSave({ initialItem, setInitialItem, categories = [] }) {
  //   item
  const [saveItem, setSaveItem] = useState(initialItem);

  // save item
  const saveItemMutation = useDataMutation("/api/items", "PUT", ["/api/items"]);
  const handleSave = function () {
    const item = {
      ...saveItem,
      name: saveItem.name.toLowerCase().trim(),
      category: saveItem.category.toLowerCase().trim(),
    };
    saveItemMutation.mutateAsync(item);
    setInitialItem(null);
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box w-11/12 max-w-3xl">
        <div className="w-full flex-row justify-between flex items-center">
          <div className="font-bold">Save item</div>
          <div className="btn" onClick={() => setInitialItem(null)}>
            <FaTimes />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Name */}
          <div className="">
            <div className="">Item name:</div>
            <input
              type="text"
              className="capitalize input capitalize w-full"
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
              className="select w-full capitalize"
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
                <option key={category} value={category} className="capitalize">
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
        </div>

        <div className="divider p-0 m-0"></div>

        <div className="flex flex-row items-center gap-1">
          <div className="btn btn-success btn flex-1" onClick={handleSave}>
            Save Item
          </div>
          <div className="btn btn flex-1" onClick={() => setInitialItem(null)}>
            Cancel
          </div>
        </div>
      </div>
    </dialog>
  );
}
