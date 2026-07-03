import { MongoListRepo } from "@/lib/adapters/mongoListRepo";
import { canModifyList, requireUser } from "@/lib/api/auth";
import { List } from "@/lib/domain/models/list";
import { NextResponse } from "next/server";

const listRepo = new MongoListRepo();

type RouteParams = { params: Promise<{ listId: string }> };

export async function GET(req: Request, { params }: RouteParams) {
  const authResult = await requireUser();
  if ("response" in authResult) return authResult.response;
  const { listId } = await params;
  const existing = await listRepo.findById(listId);
  if (!existing) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  return NextResponse.json(existing);
}

export async function PUT(req: Request, { params }: RouteParams) {
  const authResult = await requireUser();
  if ("response" in authResult) return authResult.response;
  const { listId } = await params;
  const existing = await listRepo.findById(listId);
  if (!existing) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  const forbidden = canModifyList(existing, authResult.user);
  if (forbidden) return forbidden;
  const body = (await req.json()) as Partial<List>;
  const updated = await listRepo.upsert(
    new List({
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
      { message: "Failed to update list" },
      { status: 500 },
    );
  }
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const authResult = await requireUser();
  if ("response" in authResult) return authResult.response;

  const { listId } = await params;
  const existing = await listRepo.findById(listId);
  if (!existing) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  const forbidden = canModifyList(existing, authResult.user);
  if (forbidden) return forbidden;

  const result = await listRepo.delete(listId);
  if (!result.success) {
    return NextResponse.json({ message: result.error }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
