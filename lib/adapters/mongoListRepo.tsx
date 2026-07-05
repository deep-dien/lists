import { ListRepo, ListFilter } from "@/lib/domain/models/listRepo";
import { RepoResult } from "@/lib/domain/models/repoResult";
import { List, ListItem } from "@/lib/domain/models/list";
import { Db, Collection, ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

const COLLECTION_NAME = "lists";

export interface ListDoc {
  _id: ObjectId;
  name: string;
  items: ListItem[];
  userId: string | undefined;
  isDefault: boolean | undefined;
  description: string | undefined;
  clonedId: string | undefined;
}

class MongoListRepo implements ListRepo {
  private async db(): Promise<Db> {
    const client = await clientPromise;
    return client.db(process.env.MONGODB_DB);
  }

  private async collection(): Promise<Collection<ListDoc>> {
    const db = await this.db();
    return db.collection(COLLECTION_NAME);
  }

  private docToList(doc: ListDoc): List {
    return new List({
      id: doc._id.toString(),
      name: doc.name,
      items: doc.items,
      userId: doc.userId,
      description: doc.description,
      isDefault: doc.isDefault,
      clonedId: doc.clonedId,
    });
  }

  async findById(id: string): Promise<List | null> {
    const collection = await this.collection();
    const doc = await collection.findOne({ _id: new ObjectId(id) });
    if (!doc) return null;
    return this.docToList(doc);
  }

  async findForUser(userId: string): Promise<List[]> {
    const collection = await this.collection();
    const docs = await collection.find({ userId }).toArray();
    return docs.map((doc) => this.docToList(doc));
  }

  async findDefaults(): Promise<List[]> {
    const collection = await this.collection();
    const docs = await collection.find({ isDefault: true }).toArray();
    return docs.map((doc) => this.docToList(doc));
  }

  async upsert(list: Partial<List>): Promise<List | null> {
    const collection = await this.collection();
    // no id -> create
    if (!list.id) {
      const collection = await this.collection();
      const result = await collection.insertOne({
        _id: new ObjectId(),
        userId: list.userId,
        name: list.name ?? "",
        isDefault: list.isDefault,
        description: list.description,
        clonedId: list.clonedId,
        items: list.items ?? [],
      });
      if (!result.acknowledged) return null;
      return this.docToList({
        _id: result.insertedId,
        name: list.name ?? "",
        items: list.items ?? [],
        userId: list.userId,
        isDefault: list.isDefault,
        description: list.description,
        clonedId: list.clonedId,
      });
    }
    const updateDoc = {
      ...list,
      updatedAt: new Date(),
    };
    delete updateDoc.id;
    const result = await collection.findOneAndUpdate(
      {
        _id: new ObjectId(list.id),
        userId: list.userId,
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
    return this.docToList(result);
  }

  async delete(id: string): Promise<RepoResult> {
    const collection = await this.collection();
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    if (!result.deletedCount) {
      return { success: false, error: `Failed to delete list ${id}` };
    }
    return { success: true, error: null };
  }

  async addItem(listId: string, item: ListItem): Promise<List | null> {
    const collection = await this.collection();
    await collection.updateOne(
      {
        _id: new ObjectId(listId),
        items: { $not: { $elemMatch: { itemId: item.itemId } } },
      },
      {
        $push: { items: item },
        $currentDate: { updatedAt: true },
      },
    );
    // no match also occurs when the item is already in the list — return the
    // list either way so duplicate/replayed adds are idempotent
    return this.findById(listId);
  }

  async updateItem(listId: string, item: ListItem): Promise<List | null> {
    const collection = await this.collection();
    const setPayload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(item)) {
      if (key === "itemId") continue;
      setPayload[`items.$[elem].${key}`] = value;
    }
    const updateResult = await collection.updateOne(
      {
        _id: new ObjectId(listId),
        "items.itemId": item.itemId,
      },
      {
        $set: setPayload,
        $currentDate: { updatedAt: true },
      },
      {
        arrayFilters: [{ "elem.itemId": item.itemId }],
      },
    );
    // matchedCount, not modifiedCount: a no-op update (same status/quantity)
    // matches but modifies nothing and is still a success
    if (!updateResult.matchedCount) return null;
    return this.findById(listId);
  }

  async deleteItem(listId: string, itemId: string): Promise<RepoResult> {
    const collection = await this.collection();
    const result = await collection.updateOne(
      { _id: new ObjectId(listId) },
      {
        $pull: { items: { itemId } },
        $currentDate: { updatedAt: true },
      },
    );
    // matchedCount, not modifiedCount: pulling an already-removed item is
    // still a success
    if (!result.matchedCount) {
      return {
        success: false,
        error: `Failed to delete item ${itemId} from list ${listId}`,
      };
    }
    return { success: true, error: null };
  }
}

export { MongoListRepo };
