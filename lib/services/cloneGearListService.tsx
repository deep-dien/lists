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

    const itemIds = sourceGearList.items
      .map((item) => item.itemId)
      .filter(Boolean);
    const sourceItems = await this.itemRepo.findByIds(itemIds);

    const clonedItems: GearListItem[] = [];
    for (const item of sourceItems) {
      const clonedItem: Partial<Item> = {
        userId,
        name: item.name,
        description: item.description,
        weight: item.weight,
        category: item.category,
        isDefault: false,
      };
      const createdItem = await this.itemRepo.create(clonedItem);
      if (createdItem?.id) {
        clonedItems.push(
          new GearListItem({
            itemId: createdItem.id,
            status: "unpacked",
          }),
        );
      }
    }

    const createdGearList = await this.gearListRepo.create({
      name: sourceGearList.name,
      description: sourceGearList.description,
      userId,
      isDefault: false,
      items: clonedItems,
    });
    if (!createdGearList) {
      throw new Error("Failed to create cloned gear list");
    }
    return createdGearList;
  }
}
