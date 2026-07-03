import { MongoListRepo } from "@/lib/adapters/mongoListRepo";
import { canModifyList, requireUser } from "@/lib/api/auth";
import { ListItem, ListItemStatus } from "@/lib/domain/models/list";
import { NextResponse } from "next/server";

const listRepo = new MongoListRepo();

type RouteParams = {
  params: Promise<{ listId: string; itemId: string }>;
};

export async function PUT(req: Request, { params }: RouteParams) {
  const authResult = await requireUser();
  if ("response" in authResult) return authResult.response;

  const { listId, itemId } = await params;
  const existing = await listRepo.findById(listId);
  if (!existing) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  const forbidden = canModifyList(existing, authResult.user);
  if (forbidden) return forbidden;

  const body = (await req.json()) as {
    status?: ListItemStatus;
    quantity?: number;
  };
  const currentItem = existing.items.find((item) => item.itemId === itemId);
  if (!currentItem) {
    return NextResponse.json({ message: "Item not found" }, { status: 404 });
  }

  if (body.status && !["unpacked", "leave", "packed"].includes(body.status)) {
    return NextResponse.json({ message: "Invalid status" }, { status: 400 });
  }

  const updated = await listRepo.updateItem(
    listId,
    new ListItem({
      itemId,
      status: body.status ?? currentItem.status,
      quantity: body.quantity ?? currentItem.quantity,
    }),
  );
  if (!updated) {
    return NextResponse.json(
      { message: "Failed to update list item" },
      { status: 500 },
    );
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const authResult = await requireUser();
  if ("response" in authResult) return authResult.response;

  const { listId, itemId } = await params;
  const existing = await listRepo.findById(listId);
  if (!existing) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  const forbidden = canModifyList(existing, authResult.user);
  if (forbidden) return forbidden;
  const result = await listRepo.deleteItem(listId, itemId);
  if (!result.success) {
    return NextResponse.json({ message: result.error }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
