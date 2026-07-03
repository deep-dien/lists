export type ListItemStatus = "unpacked" | "leave" | "packed";

export const STATUS_SORT_ORDER: Record<ListItemStatus, number> = {
  unpacked: 0,
  leave: 1,
  packed: 2,
};

type ListItemInput = {
  itemId: string;
  status: ListItemStatus;
  quantity: number;
};

export class ListItem {
  itemId: string;
  status: ListItemStatus;
  quantity: number;
  constructor(init: ListItem) {
    this.itemId = init.itemId;
    this.status = init.status;
    this.quantity = init.quantity;
  }
}

class List {
  id: string;
  name: string;
  items: ListItem[];
  userId?: string;
  description?: string;
  isDefault?: boolean;
  clonedId?: string;
  constructor(init: ListModal) {
    this.id = init.id;
    this.name = init.name;
    this.items = init.items.map((item) => new ListItem(item));
    this.userId = init.userId;
    this.description = init.description;
    this.isDefault = init.isDefault;
    this.clonedId = init.clonedId;
  }
}

interface ListModal {
  id: string;
  name: string;
  items: ListItemInput[];
  userId?: string;
  description?: string;
  isDefault?: boolean;
  clonedId?: string;
}

export { List };
