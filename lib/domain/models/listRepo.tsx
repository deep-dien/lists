import { List, ListItem } from "@/lib/domain/models/list";
import { RepoResult } from "@/lib/domain/models/repoResult";

export interface ListFilter {
  listIds?: string[];
  includeDefaults?: boolean;
}

interface ListRepo {
  findById(id: string): Promise<List | null>;
  findForUser(userId: string, filter?: ListFilter): Promise<List[]>;
  upsert(list: Partial<List>): Promise<List | null>;
  delete(id: string): Promise<RepoResult>;
  addItem(listId: string, listItem: ListItem): Promise<List | null>;
  updateItem(listId: string, listItem: ListItem): Promise<List | null>;
  deleteItem(listId: string, itemId: string): Promise<RepoResult>;
}

export type { ListRepo };
