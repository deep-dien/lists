export type GearListItemStatus = "unpacked" | "leave" | "packed";

export const STATUS_SORT_ORDER: Record<GearListItemStatus, number> = {
  unpacked: 0,
  leave: 1,
  packed: 2,
};

type GearListItemInput = {
  itemId: string;
  status?: GearListItemStatus;
};

function normalizeStatus(
  init: GearListItemInput & { packed?: boolean; leave?: boolean },
): GearListItemStatus {
  if (init.status) return init.status;
  if (init.leave) return "leave";
  if (init.packed) return "packed";
  return "unpacked";
}

export class GearListItem {
  itemId: string;
  status: GearListItemStatus;

  constructor(init: GearListItemInput) {
    this.itemId = init.itemId;
    this.status = normalizeStatus(init);
  }
}

class GearList {
  id: string;
  name: string;
  items: GearListItem[];
  userId?: string;
  description?: string;
  isDefault?: boolean;
  constructor(init: GearListModal) {
    this.id = init.id;
    this.name = init.name;
    this.items = init.items.map((item) => new GearListItem(item));
    this.userId = init.userId;
    this.description = init.description;
    this.isDefault = init.isDefault;
  }
}

interface GearListModal {
  id: string;
  name: string;
  items: GearListItemInput[];
  userId?: string;
  description?: string;
  isDefault?: boolean;
}

export { GearList };
