import { NextResponse } from "next/server";

import { MongoItemRepo } from "@/lib/adapters/mongoItemRepo";

import { MongoGearListRepo } from "@/lib/adapters/mongoGearListRepo";

import { CloneGearListService } from "@/lib/services/cloneGearListService";
import { requireUser } from "@/lib/api/auth";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ gearListId: string }> },
) {
  const authResult = await requireUser();
  if ("response" in authResult) return authResult.response;

  const { gearListId } = await params;

  // clone service
  const service = new CloneGearListService(
    new MongoGearListRepo(),
    new MongoItemRepo(),
  );

  // clone and return
  const gearList = await service.execute(gearListId, authResult.user.id);
  return NextResponse.json(gearList);
}
