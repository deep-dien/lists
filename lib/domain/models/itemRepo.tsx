import { Item } from "@/lib/domain/models/item";
import { RepoResult } from "@/lib/domain/models/repoResult";

interface ItemRepo {
  findByIds(itemIds: string[]): Promise<Item[]>;
  findForUser(userId: string): Promise<Item[]>;
  findDefaults(): Promise<Item[]>;
  upsert(item: Partial<Item>): Promise<Item | null>;
  delete(id: string): Promise<RepoResult>;
}

export type { ItemRepo };
