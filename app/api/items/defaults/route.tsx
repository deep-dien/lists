import { MongoItemRepo } from "@/lib/adapters/mongoItemRepo";
import { requireUser } from "@/lib/api/auth";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

const itemRepo = new MongoItemRepo();

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const items = await itemRepo.findDefaults();
  return NextResponse.json(items);
}
