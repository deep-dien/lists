import { UserRepo } from "@/lib/domain/models/userRepo";
import { RepoResult } from "@/lib/domain/models/repoResult";
import { User } from "@/lib/domain/models/user";
import { Db, Collection, ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

const COLLECTION_NAME = "users";

export interface UserDoc {
  _id: ObjectId;
  email: string;
  name?: string;
}

class MongoUserRepo implements UserRepo {
  private async db(): Promise<Db> {
    const client = await clientPromise;
    return client.db(process.env.MONGODB_DB);
  }

  private async collection(): Promise<Collection<UserDoc>> {
    const db = await this.db();
    return db.collection(COLLECTION_NAME);
  }

  private docToUser(doc: UserDoc): User {
    return new User({
      id: doc._id.toString(),
      name: doc.name,
      email: doc.email,
    });
  }

  async findById(id: string): Promise<User | null> {
    const collection = await this.collection();
    const doc = await collection.findOne({ _id: new ObjectId(id) });
    if (!doc) return null;
    return this.docToUser(doc);
  }

  async findByEmail(email: string): Promise<User | null> {
    const collection = await this.collection();
    const doc = await collection.findOne({ email });
    if (!doc) return null;
    return this.docToUser(doc);
  }

  async update(user: User): Promise<RepoResult> {
    const setPayload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(user)) {
      if (key === "id") continue;
      if (value !== undefined) setPayload[key] = value;
    }

    const collection = await this.collection();
    const result = await collection.updateOne(
      { _id: new ObjectId(user.id) },
      { $set: setPayload },
    );
    if (!result.matchedCount) {
      return { success: false, error: `Failed to update user ${user.id}` };
    }
    return { success: true, error: null };
  }

  async delete(id: string): Promise<RepoResult> {
    const collection = await this.collection();
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    if (!result.deletedCount) {
      return { success: false, error: `Failed to delete user ${id}` };
    }
    return { success: true, error: null };
  }
}

export { MongoUserRepo };
