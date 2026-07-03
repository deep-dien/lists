import { GearListRepo, GearListFilter } from "@/lib/domain/models/gearListRepo";
import { RepoResult } from "@/lib/domain/models/repoResult";
import { GearList, GearListItem } from "@/lib/domain/models/gearList";
import { Db, Collection, ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

const COLLECTION_NAME = "gear-lists";

export interface GearListDoc {
  _id: ObjectId;
  name: string;
  items: GearListItem[];
  userId: string | undefined;
  isDefault: boolean | undefined;
  description: string | undefined;
  clonedId: string | undefined;
}

class MongoGearListRepo implements GearListRepo {
  private async db(): Promise<Db> {
    const client = await clientPromise;
    return client.db(process.env.MONGODB_DB);
  }

  private async collection(): Promise<Collection<GearListDoc>> {
    const db = await this.db();
    return db.collection(COLLECTION_NAME);
  }

  private docToGearList(doc: GearListDoc): GearList {
    return new GearList({
      id: doc._id.toString(),
      name: doc.name,
      items: doc.items,
      userId: doc.userId,
      description: doc.description,
      isDefault: doc.isDefault,
      clonedId: doc.clonedId,
    });
  }

  async findById(id: string): Promise<GearList | null> {
    const collection = await this.collection();
    const doc = await collection.findOne({ _id: new ObjectId(id) });
    if (!doc) return null;
    return this.docToGearList(doc);
  }

  async findForUser(userId: string): Promise<GearList[]> {
    const collection = await this.collection();
    const docs = await collection.find({ userId }).toArray();
    return docs.map((doc) => this.docToGearList(doc));
  }

  async findDefaults(): Promise<GearList[]> {
    const collection = await this.collection();
    const docs = await collection.find({ isDefault: true }).toArray();
    return docs.map((doc) => this.docToGearList(doc));
  }

  async upsert(gearList: Partial<GearList>): Promise<GearList | null> {
    const collection = await this.collection();
    // no id -> create
    if (!gearList.id) {
      const collection = await this.collection();
      const result = await collection.insertOne({
        _id: new ObjectId(),
        userId: gearList.userId,
        name: gearList.name ?? "",
        isDefault: gearList.isDefault,
        description: gearList.description,
        clonedId: gearList.clonedId,
        items: gearList.items ?? [],
      });
      if (!result.acknowledged) return null;
      return this.docToGearList({
        _id: result.insertedId,
        name: gearList.name ?? "",
        items: gearList.items ?? [],
        userId: gearList.userId,
        isDefault: gearList.isDefault,
        description: gearList.description,
        clonedId: gearList.clonedId,
      });
    }
    const updateDoc = {
      ...gearList,
      updatedAt: new Date(),
    };
    delete updateDoc.id;
    const result = await collection.findOneAndUpdate(
      {
        _id: new ObjectId(gearList.id),
        userId: gearList.userId,
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
    return this.docToGearList(result);
  }

  async delete(id: string): Promise<RepoResult> {
    const collection = await this.collection();
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    if (!result.deletedCount) {
      return { success: false, error: `Failed to delete gear list ${id}` };
    }
    return { success: true, error: null };
  }

  async addItem(
    gearListId: string,
    item: GearListItem,
  ): Promise<GearList | null> {
    const collection = await this.collection();
    const result = await collection.updateOne(
      {
        _id: new ObjectId(gearListId),
        items: { $not: { $elemMatch: { itemId: item.itemId } } },
      },
      {
        $push: { items: item },
        $currentDate: { updatedAt: true },
      },
    );
    if (!result.modifiedCount) return null;
    return this.findById(gearListId);
  }

  async updateItem(
    gearListId: string,
    item: GearListItem,
  ): Promise<GearList | null> {
    const collection = await this.collection();
    const setPayload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(item)) {
      if (key === "itemId") continue;
      setPayload[`items.$[elem].${key}`] = value;
    }
    const updateResult = await collection.updateOne(
      {
        _id: new ObjectId(gearListId),
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
    if (!updateResult.modifiedCount) return null;
    return this.findById(gearListId);
  }

  async deleteItem(gearListId: string, itemId: string): Promise<RepoResult> {
    const collection = await this.collection();
    const result = await collection.updateOne(
      { _id: new ObjectId(gearListId) },
      {
        $pull: { items: { itemId } },
        $currentDate: { updatedAt: true },
      },
    );
    if (!result.modifiedCount) {
      return {
        success: false,
        error: `Failed to delete item ${itemId} from gear list ${gearListId}`,
      };
    }
    return { success: true, error: null };
  }
}

export { MongoGearListRepo };
