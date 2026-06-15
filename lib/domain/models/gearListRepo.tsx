import { GearList, GearListItem } from "@/lib/domain/models/gearList";
import { RepoResult } from "@/lib/domain/models/repoResult";

export interface GearListFilter {
  gearListIds?: string[];
  includeDefaults?: boolean;
}

interface GearListRepo {
  findById(id: string): Promise<GearList | null>;
  findForUser(userId: string, filter: GearListFilter): Promise<GearList[]>;
  upsert(gearList: Partial<GearList>): Promise<GearList | null>;
  delete(id: string): Promise<RepoResult>;
  addItem(
    gearListId: string,
    gearListItem: GearListItem,
  ): Promise<GearList | null>;
  updateItem(
    gearListId: string,
    gearListItem: GearListItem,
  ): Promise<GearList | null>;
  deleteItem(gearListId: string, itemId: string): Promise<RepoResult>;
}

export type { GearListRepo };
