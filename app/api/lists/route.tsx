import { MongoListRepo } from "@/lib/adapters/mongoListRepo";
import { canModifyList, requireUser } from "@/lib/api/auth";
import { List } from "@/lib/domain/models/list";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

const listRepo = new MongoListRepo();

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const lists = await listRepo.findForUser(session.user.id);
  return NextResponse.json(lists);
}

export async function PUT(req: Request) {
  const authResult = await requireUser();
  if ("response" in authResult) return authResult.response;
  const body = (await req.json()) as Partial<List>;

  // editing an existing list
  if (body.id) {
    const existing = await listRepo.findById(body.id);
    if (!existing) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
    const forbidden = canModifyList(existing, authResult.user);
    if (forbidden) return forbidden;
    const list = await listRepo.upsert({
      ...body,
      id: existing.id,
      userId: existing.userId,
      isDefault: authResult.user.canModifyDefaults
        ? (body.isDefault ?? existing.isDefault)
        : existing.isDefault,
    });
    if (!list) {
      return NextResponse.json(
        { message: "Failed to update list" },
        { status: 500 },
      );
    }
    return NextResponse.json(list);
  }

  // creating a new list
  const list = await listRepo.upsert({
    ...body,
    userId: authResult.user.id,
    isDefault: authResult.user.canModifyDefaults ? !!body.isDefault : false,
  });
  if (!list) {
    return NextResponse.json(
      { message: "Failed to create list" },
      { status: 500 },
    );
  }
  return NextResponse.json(list, { status: 201 });
}
