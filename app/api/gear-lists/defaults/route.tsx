import { MongoGearListRepo } from "@/lib/adapters/mongoGearListRepo";
import { requireUser } from "@/lib/api/auth";
import { GearList } from "@/lib/domain/models/gearList";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

const gearListRepo = new MongoGearListRepo();

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const gearLists = await gearListRepo.findDefaults();
  return NextResponse.json(gearLists);
}
