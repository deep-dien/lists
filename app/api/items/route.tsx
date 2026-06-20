import { MongoItemRepo } from "@/lib/adapters/mongoItemRepo";
import { canModifyItem, requireUser } from "@/lib/api/auth";
import { Item } from "@/lib/domain/models/item";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

const itemRepo = new MongoItemRepo();

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const items = await itemRepo.findForUser(session.user.id);
  return NextResponse.json(items);
}

export async function PUT(req: Request) {
  const authResult = await requireUser();
  if ("response" in authResult) return authResult.response;
  const body = (await req.json()) as Partial<Item>;

  // editing an existing item
  if (body.id) {
    const existingItems = await itemRepo.findByIds([body.id]);
    const existing = existingItems[0];
    if (!existing) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
    const forbidden = canModifyItem(existing, authResult.user);
    if (forbidden) return forbidden;
    const item = await itemRepo.upsert({
      ...body,
      id: existing.id,
      userId: existing.userId,
      isDefault: authResult.user.canModifyDefaults
        ? (body.isDefault ?? existing.isDefault)
        : existing.isDefault,
    });
    if (!item) {
      return NextResponse.json(
        { message: "Failed to update item" },
        { status: 500 },
      );
    }
    return NextResponse.json(item);
  }

  // creating a new item
  const item = await itemRepo.upsert({
    ...body,
    userId: authResult.user.id,
    isDefault: authResult.user.canModifyDefaults ? !!body.isDefault : false,
  });
  if (!item) {
    return NextResponse.json(
      { message: "Failed to upsert item" },
      { status: 500 },
    );
  }
  return NextResponse.json(item, { status: 201 });
}
