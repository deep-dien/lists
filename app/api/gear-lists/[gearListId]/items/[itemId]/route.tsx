import { MongoGearListRepo } from "@/lib/adapters/mongoGearListRepo";
import { canModifyGearList, requireUser } from "@/lib/api/auth";
import { GearListItem, GearListItemStatus } from "@/lib/domain/models/gearList";
import { NextResponse } from "next/server";

const gearListRepo = new MongoGearListRepo();

type RouteParams = {
  params: Promise<{ gearListId: string; itemId: string }>;
};

export async function PUT(req: Request, { params }: RouteParams) {
  const authResult = await requireUser();
  if ("response" in authResult) return authResult.response;

  const { gearListId, itemId } = await params;
  const existing = await gearListRepo.findById(gearListId);
  if (!existing) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  const forbidden = canModifyGearList(existing, authResult.user);
  if (forbidden) return forbidden;

  const body = (await req.json()) as {
    status?: GearListItemStatus;
    quantity?: number;
  };
  const currentItem = existing.items.find((item) => item.itemId === itemId);
  if (!currentItem) {
    return NextResponse.json({ message: "Item not found" }, { status: 404 });
  }

  if (body.status && !["unpacked", "leave", "packed"].includes(body.status)) {
    return NextResponse.json({ message: "Invalid status" }, { status: 400 });
  }

  const updated = await gearListRepo.updateItem(
    gearListId,
    new GearListItem({
      itemId,
      status: body.status ?? currentItem.status,
      quantity: body.quantity ?? currentItem.quantity,
    }),
  );
  if (!updated) {
    return NextResponse.json(
      { message: "Failed to update gear list item" },
      { status: 500 },
    );
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const authResult = await requireUser();
  if ("response" in authResult) return authResult.response;

  const { gearListId, itemId } = await params;
  const existing = await gearListRepo.findById(gearListId);
  if (!existing) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  const forbidden = canModifyGearList(existing, authResult.user);
  if (forbidden) return forbidden;
  const result = await gearListRepo.deleteItem(gearListId, itemId);
  if (!result.success) {
    return NextResponse.json({ message: result.error }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
