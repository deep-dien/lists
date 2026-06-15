import { MongoItemRepo } from "@/lib/adapters/mongoItemRepo";
import { requireUser } from "@/lib/api/auth";
import { Item } from "@/lib/domain/models/item";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

const itemRepo = new MongoItemRepo();

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const itemIds = searchParams.get("itemIds")?.split(",").filter(Boolean);
  const includeDefaults = searchParams.get("includeDefaults") === "true";
  const items = await itemRepo.findForUser(session.user.id, {
    itemIds,
    includeDefaults,
  });
  return NextResponse.json(items);
}

export async function PUT(req: Request) {
  const authResult = await requireUser();
  if ("response" in authResult) return authResult.response;
  const body = (await req.json()) as Partial<Item>;
  const item = await itemRepo.upsert({
    ...body,
    // userId: authResult.user.id,
    isDefault: true,
  });
  if (!item) {
    return NextResponse.json(
      { message: "Failed to upsert item" },
      { status: 500 },
    );
  }
  return NextResponse.json(item, { status: 201 });
}
