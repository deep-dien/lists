export type GearListItemStatus = "unpacked" | "leave" | "packed";

export const STATUS_SORT_ORDER: Record<GearListItemStatus, number> = {
  unpacked: 0,
  leave: 1,
  packed: 2,
};

type GearListItemInput = {
  itemId: string;
  status: GearListItemStatus;
  quantity: number;
};

export class GearListItem {
  itemId: string;
  status: GearListItemStatus;
  quantity: number;
  constructor(init: GearListItem) {
    this.itemId = init.itemId;
    this.status = init.status;
    this.quantity = init.quantity;
  }
}

class GearList {
  id: string;
  name: string;
  items: GearListItem[];
  userId?: string;
  description?: string;
  isDefault?: boolean;
  clonedId?: string;
  constructor(init: GearListModal) {
    this.id = init.id;
    this.name = init.name;
    this.items = init.items.map((item) => new GearListItem(item));
    this.userId = init.userId;
    this.description = init.description;
    this.isDefault = init.isDefault;
    this.clonedId = init.clonedId;
  }
}

interface GearListModal {
  id: string;
  name: string;
  items: GearListItemInput[];
  userId?: string;
  description?: string;
  isDefault?: boolean;
  clonedId?: string;
}

export { GearList };
