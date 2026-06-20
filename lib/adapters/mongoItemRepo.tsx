import { ItemRepo } from "@/lib/domain/models/itemRepo";
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
  clonedId?: string;
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
      clonedId: doc?.clonedId,
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

  async findForUser(userId: string): Promise<Item[]> {
    const collection = await this.collection();
    const docs = await collection.find({ userId: userId }).toArray();
    console.log(
      docs,
      docs.map((doc) => this.docToItem(doc)),
    );
    return docs.map((doc) => this.docToItem(doc));
  }

  async findDefaults(): Promise<Item[]> {
    const collection = await this.collection();
    const docs = await collection.find({ isDefault: true }).toArray();

    return docs.map((doc) => this.docToItem(doc));
  }

  async upsert(item: Partial<Item>): Promise<Item | null> {
    const collection = await this.collection();
    // no id -> create
    if (!item.id) {
      const collection = await this.collection();
      const result = await collection.insertOne({
        _id: new ObjectId(),
        userId: item.userId,
        name: item.name,
        description: item.description,
        weight: item.weight,
        category: item.category,
        isDefault: item.isDefault,
        clonedId: item.clonedId,
      });
      if (!result.acknowledged) return null;
      return this.docToItem({ _id: result.insertedId, ...result });
    }
    const updateDoc = {
      ...item,
      updatedAt: new Date(),
    };
    delete updateDoc.id;
    const result = await collection.findOneAndUpdate(
      {
        _id: new ObjectId(item.id),
        userId: item.userId,
      },
      {
        $set: updateDoc,
      },
      {
        upsert: true,
        returnDocument: "after",
      },
    );
    if (!result) return null;
    return this.docToItem(result);
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
