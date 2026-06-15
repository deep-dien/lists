import { MongoGearListRepo } from "@/lib/adapters/mongoGearListRepo";
import { canModifyGearList, requireUser } from "@/lib/api/auth";
import { GearList } from "@/lib/domain/models/gearList";
import { NextResponse } from "next/server";

const gearListRepo = new MongoGearListRepo();

type RouteParams = { params: Promise<{ gearListId: string }> };

export async function GET(req: Request, { params }: RouteParams) {
  const authResult = await requireUser();
  if ("response" in authResult) return authResult.response;
  const { gearListId } = await params;
  const existing = await gearListRepo.findById(gearListId);
  if (!existing) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  return NextResponse.json(existing);
}

export async function PUT(req: Request, { params }: RouteParams) {
  const authResult = await requireUser();
  if ("response" in authResult) return authResult.response;
  const { gearListId } = await params;
  const existing = await gearListRepo.findById(gearListId);
  if (!existing) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  const forbidden = canModifyGearList(existing, authResult.user.id);
  if (forbidden) return forbidden;
  const body = (await req.json()) as Partial<GearList>;
  const updated = await gearListRepo.upsert(
    new GearList({
      ...existing,
      ...body,
      id: existing.id,
      userId: existing.userId,
      isDefault: existing.isDefault,
    }),
  );
  if (!updated) {
    return NextResponse.json(
      { message: "Failed to update gear list" },
      { status: 500 },
    );
  }
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const authResult = await requireUser();
  if ("response" in authResult) return authResult.response;

  const { gearListId } = await params;
  const existing = await gearListRepo.findById(gearListId);
  if (!existing) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  // // comment this back in
  // const forbidden = canModifyGearList(existing, authResult.user.id);
  // if (forbidden) return forbidden;

  const result = await gearListRepo.delete(gearListId);
  if (!result.success) {
    return NextResponse.json({ message: result.error }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
