export type GearListItemStatus = "unpacked" | "leave" | "packed";

export const STATUS_SORT_ORDER: Record<GearListItemStatus, number> = {
  unpacked: 0,
  leave: 1,
  packed: 2,
};

type GearListItemInput = {
  itemId: string;
  status: GearListItemStatus;
};

export class GearListItem {
  itemId: string;
  status: GearListItemStatus;
  constructor(init: GearListItem) {
    this.itemId = init.itemId;
    this.status = init.status;
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
