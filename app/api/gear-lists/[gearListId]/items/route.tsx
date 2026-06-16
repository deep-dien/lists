import { MongoGearListRepo } from "@/lib/adapters/mongoGearListRepo";
import { requireUser } from "@/lib/api/auth";
import { GearListItem } from "@/lib/domain/models/gearList";
import { NextResponse } from "next/server";

const gearListRepo = new MongoGearListRepo();

type RouteParams = { params: Promise<{ gearListId: string }> };

export async function POST(req: Request, { params }: RouteParams) {
  const authResult = await requireUser();
  if ("response" in authResult) return authResult.response;

  const { gearListId } = await params;
  const existing = await gearListRepo.findById(gearListId);
  if (!existing) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const body = (await req.json()) as GearListItem;
  const updated = await gearListRepo.addItem(
    gearListId,
    new GearListItem(body),
  );
  if (!updated) {
    return NextResponse.json(
      { message: "Failed to add item to gear list" },
      { status: 500 },
    );
  }
  return NextResponse.json(updated, { status: 201 });
}
