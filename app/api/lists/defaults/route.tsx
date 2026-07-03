import { MongoListRepo } from "@/lib/adapters/mongoListRepo";
import { requireUser } from "@/lib/api/auth";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

const listRepo = new MongoListRepo();

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const lists = await listRepo.findDefaults();
  return NextResponse.json(lists);
}
