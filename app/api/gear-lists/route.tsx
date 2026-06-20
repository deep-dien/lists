import { MongoGearListRepo } from "@/lib/adapters/mongoGearListRepo";
import { canModifyGearList, requireUser } from "@/lib/api/auth";
import { GearList } from "@/lib/domain/models/gearList";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

const gearListRepo = new MongoGearListRepo();

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const gearLists = await gearListRepo.findForUser(session.user.id);
  return NextResponse.json(gearLists);
}

export async function PUT(req: Request) {
  const authResult = await requireUser();
  if ("response" in authResult) return authResult.response;
  const body = (await req.json()) as Partial<GearList>;

  // editing an existing gear list
  if (body.id) {
    const existing = await gearListRepo.findById(body.id);
    if (!existing) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
    const forbidden = canModifyGearList(existing, authResult.user);
    if (forbidden) return forbidden;
    const gearList = await gearListRepo.upsert({
      ...body,
      id: existing.id,
      userId: existing.userId,
      isDefault: authResult.user.canModifyDefaults
        ? (body.isDefault ?? existing.isDefault)
        : existing.isDefault,
    });
    if (!gearList) {
      return NextResponse.json(
        { message: "Failed to update gear list" },
        { status: 500 },
      );
    }
    return NextResponse.json(gearList);
  }

  // creating a new gear list
  const gearList = await gearListRepo.upsert({
    ...body,
    userId: authResult.user.id,
    isDefault: authResult.user.canModifyDefaults ? !!body.isDefault : false,
  });
  if (!gearList) {
    return NextResponse.json(
      { message: "Failed to create gear list" },
      { status: 500 },
    );
  }
  return NextResponse.json(gearList, { status: 201 });
}
