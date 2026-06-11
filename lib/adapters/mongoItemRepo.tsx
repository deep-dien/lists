import { ItemRepo, ItemFilter } from "@/lib/domain/models/itemRepo";
import { RepoResult } from "@/lib/domain/models/repoResult";
import { Item, parseItemWeight } from "@/lib/domain/models/item";
import { Db, Collection, ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

const COLLECTION_NAME = "items";

export interface ItemDoc {
  _id: ObjectId;
  name?: string;
  userId?: string;
  description?: string;
  weight?: unknown;
  category?: string;
  isDefault?: boolean;
}

class MongoItemRepo implements ItemRepo {
  private async db(): Promise<Db> {
    const client = await clientPromise;
    return client.db(process.env.MONGODB_DB);
  }

  private async collection(): Promise<Collection<ItemDoc>> {
    const db = await this.db();
    return db.collection(COLLECTION_NAME);
  }

  private docToItem(doc: ItemDoc): Item {
    return new Item({
      id: doc._id.toString(),
      userId: doc.userId,
      name: doc.name,
      description: doc.description,
      weight: parseItemWeight(doc.weight),
      category: doc.category,
      isDefault: doc.isDefault,
    });
  }

  async findByIds(itemIds: string[]): Promise<Item[]> {
    if (!itemIds.length) return [];
    const collection = await this.collection();
    const docs = await collection
      .find({
        _id: { $in: itemIds.map((id) => new ObjectId(id)) },
      })
      .toArray();
    return docs.map((doc) => this.docToItem(doc));
  }

  async findForUser(userId: string, filter: ItemFilter = {}): Promise<Item[]> {
    const collection = await this.collection();
    const conditions: Record<string, unknown>[] = [];

    if (filter.includeDefaults) {
      conditions.push({
        $or: [{ userId }, { isDefault: true }],
      });
    } else {
      conditions.push({ userId });
    }

    if (filter.itemIds?.length) {
      conditions.push({
        _id: {
          $in: filter.itemIds.map((id) => new ObjectId(id)),
        },
      });
    }

    const query =
      conditions.length === 1 ? conditions[0] : { $and: conditions };
    const docs = await collection.find(query).toArray();
    return docs.map((doc) => this.docToItem(doc));
  }

  async create(item: Partial<Item>): Promise<Item | null> {
    const collection = await this.collection();
    const result = await collection.insertOne({
      _id: item.id ? new ObjectId(item.id) : new ObjectId(),
      userId: item.userId,
      name: item.name,
      description: item.description,
      weight: item.weight,
      category: item.category,
      isDefault: item.isDefault,
    });
    if (!result.acknowledged) return null;
    return new Item({
      id: result.insertedId.toString(),
      userId: item.userId,
      name: item.name,
      description: item.description,
      weight: item.weight,
      category: item.category,
      isDefault: item.isDefault,
    });
  }

  async update(item: Item): Promise<Item | null> {
    if (!item.id) return null;

    const collection = await this.collection();
    const setPayload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(item)) {
      if (key === "id") continue;
      if (value !== undefined) setPayload[key] = value;
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(item.id) },
      {
        $set: setPayload,
        $currentDate: { updatedAt: true },
      },
    );
    if (!result.matchedCount) return null;

    const updated = await this.findByIds([item.id]);
    return updated[0] ?? null;
  }

  async delete(id: string): Promise<RepoResult> {
    const collection = await this.collection();
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    if (!result.deletedCount) {
      return { success: false, error: `Failed to delete item ${id}` };
    }
    return { success: true, error: null };
  }
}

export { MongoItemRepo };
