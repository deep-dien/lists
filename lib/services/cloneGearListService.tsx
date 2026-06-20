import { GearList, GearListItem } from "@/lib/domain/models/gearList";
import { GearListRepo } from "@/lib/domain/models/gearListRepo";
import { Item } from "@/lib/domain/models/item";
import { ItemRepo } from "@/lib/domain/models/itemRepo";

export class CloneGearListService {
  constructor(
    private readonly gearListRepo: GearListRepo,
    private readonly itemRepo: ItemRepo,
  ) {}

  async execute(sourceGearListId: string, userId: string): Promise<GearList> {
    const sourceGearList = await this.gearListRepo.findById(sourceGearListId);
    if (!sourceGearList) {
      throw new Error("Gear list not found");
    }

    // if this gear list has already been cloned for this user, return the
    // existing clone instead of creating a duplicate
    const userGearLists = await this.gearListRepo.findForUser(userId);
    const existingClone = userGearLists.find(
      (gearList) => gearList.clonedId === sourceGearListId,
    );
    if (existingClone) {
      return existingClone;
    }

    // list of items from the source gear list
    const sourceItemIds = sourceGearList.items
      .map((item) => item.itemId)
      .filter(Boolean);
    const sourceItems = await this.itemRepo.findByIds(sourceItemIds);

    // get a list of items for that user
    const userItems = await this.itemRepo.findForUser(userId);

    // create list of cloned items
    // cycle through source items
    const clonedItems: GearListItem[] = [];
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
            new GearListItem({
              itemId: createdItem.id,
              status: "unpacked",
              quantity: 1,
            }),
          );
        }
        // else push reference to existing item
      } else {
        clonedItems.push(
          new GearListItem({
            itemId: clonedItem.id,
            status: "unpacked",
            quantity: 1,
          }),
        );
      }
    }

    const createdGearList = await this.gearListRepo.upsert({
      name: sourceGearList.name,
      description: sourceGearList.description,
      userId,
      isDefault: false,
      clonedId: sourceGearListId,
      items: clonedItems,
    });
    if (!createdGearList) {
      throw new Error("Failed to create cloned gear list");
    }
    return createdGearList;
  }
}
