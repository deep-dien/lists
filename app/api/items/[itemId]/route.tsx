import { MongoItemRepo } from "@/lib/adapters/mongoItemRepo";
import { canModifyItem, requireUser } from "@/lib/api/auth";
import { Item } from "@/lib/domain/models/item";
import { NextResponse } from "next/server";

const itemRepo = new MongoItemRepo();

type RouteParams = { params: Promise<{ itemId: string }> };

export async function PUT(req: Request, { params }: RouteParams) {
  const authResult = await requireUser();
  if ("response" in authResult) return authResult.response;
  const { itemId } = await params;
  const existingItems = await itemRepo.findByIds([itemId]);
  const existing = existingItems[0];
  if (!existing) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  const forbidden = canModifyItem(existing, authResult.user);
  if (forbidden) return forbidden;
  const body = (await req.json()) as Partial<Item>;
  const updated = await itemRepo.upsert(
    new Item({
      ...existing,
      ...body,
      id: existing.id,
      userId: existing.userId,
      isDefault: authResult.user.canModifyDefaults
        ? (body.isDefault ?? existing.isDefault)
        : existing.isDefault,
    }),
  );
  if (!updated) {
    return NextResponse.json(
      { message: "Failed to update item" },
      { status: 500 },
    );
  }
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const authResult = await requireUser();
  if ("response" in authResult) return authResult.response;
  const { itemId } = await params;
  const existingItems = await itemRepo.findByIds([itemId]);
  const existing = existingItems[0];
  if (!existing) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  const forbidden = canModifyItem(existing, authResult.user);
  if (forbidden) return forbidden;
  const result = await itemRepo.delete(itemId);
  if (!result.success) {
    return NextResponse.json({ message: result.error }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
