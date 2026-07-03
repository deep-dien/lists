import { List, ListItem } from "@/lib/domain/models/list";
import { ListRepo } from "@/lib/domain/models/listRepo";
import { Item } from "@/lib/domain/models/item";
import { ItemRepo } from "@/lib/domain/models/itemRepo";

export class CloneListService {
  constructor(
    private readonly listRepo: ListRepo,
    private readonly itemRepo: ItemRepo,
  ) {}

  async execute(sourceListId: string, userId: string): Promise<List> {
    const sourceList = await this.listRepo.findById(sourceListId);
    if (!sourceList) {
      throw new Error("List not found");
    }

    // if this list has already been cloned for this user, return the
    // existing clone instead of creating a duplicate
    const userLists = await this.listRepo.findForUser(userId);
    const existingClone = userLists.find(
      (list) => list.clonedId === sourceListId,
    );
    if (existingClone) {
      return existingClone;
    }

    // list of items from the source list
    const sourceItemIds = sourceList.items
      .map((item) => item.itemId)
      .filter(Boolean);
    const sourceItems = await this.itemRepo.findByIds(sourceItemIds);

    // get a list of items for that user
    const userItems = await this.itemRepo.findForUser(userId);

    // create list of cloned items
    // cycle through source items
    const clonedItems: ListItem[] = [];
    for (const item of sourceItems) {
      // if source item has already been cloned into user, return null
      const clonedItem = userItems.find(
        (i): i is Item & { id: string } => !!i.id && i.clonedId === item.id,
      );

      // only clone item if it hasnt been cloned
      if (!clonedItem) {
        const cloneItem: Partial<Item> = {
          userId,
          clonedId: item.id,
          name: item.name,
          description: item.description,
          weight: item.weight,
          category: item.category,
          isDefault: false,
        };
        const createdItem = await this.itemRepo.upsert(cloneItem);
        if (createdItem?.id) {
          clonedItems.push(
            new ListItem({
              itemId: createdItem.id,
              status: "unpacked",
              quantity: 1,
            }),
          );
        }
        // else push reference to existing item
      } else {
        clonedItems.push(
          new ListItem({
            itemId: clonedItem.id,
            status: "unpacked",
            quantity: 1,
          }),
        );
      }
    }

    const createdList = await this.listRepo.upsert({
      name: sourceList.name,
      description: sourceList.description,
      userId,
      isDefault: false,
      clonedId: sourceListId,
      items: clonedItems,
    });
    if (!createdList) {
      throw new Error("Failed to create cloned list");
    }
    return createdList;
  }
}
