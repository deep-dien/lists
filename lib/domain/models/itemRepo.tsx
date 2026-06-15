import { Item } from "@/lib/domain/models/item";
import { RepoResult } from "@/lib/domain/models/repoResult";

export interface ItemFilter {
  itemIds?: string[];
  includeDefaults?: boolean;
}

interface ItemRepo {
  findByIds(itemIds: string[]): Promise<Item[]>;
  findForUser(userId: string, filter: ItemFilter): Promise<Item[]>;
  upsert(item: Partial<Item>): Promise<Item | null>;
  delete(id: string): Promise<RepoResult>;
}

export type { ItemRepo };
