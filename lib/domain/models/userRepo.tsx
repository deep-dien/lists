import { User } from "@/lib/domain/models/user";
import { RepoResult } from "@/lib/domain/models/repoResult";

interface UserRepo {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  update(user: User): Promise<RepoResult>;
  delete(id: string): Promise<RepoResult>;
}

export type { UserRepo };
