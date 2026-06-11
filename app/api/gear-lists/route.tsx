import { MongoGearListRepo } from "@/lib/adapters/mongoGearListRepo";
import { requireUser } from "@/lib/api/auth";
import { GearList } from "@/lib/domain/models/gearList";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

const gearListRepo = new MongoGearListRepo();

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const gearListIds = searchParams
    .get("gearListIds")
    ?.split(",")
    .filter(Boolean);
  const includeDefaults = searchParams.get("includeDefaults") === "true";

  const gearLists = await gearListRepo.findForUser(session.user.id, {
    gearListIds,
    includeDefaults,
  });
  return NextResponse.json(gearLists);
}

export async function POST(req: Request) {
  const authResult = await requireUser();
  if ("response" in authResult) return authResult.response;

  const body = (await req.json()) as Partial<GearList>;
  const gearList = await gearListRepo.create({
    name: body.name ?? "Untitled",
    description: body.description,
    items: body.items ?? [],
    userId: authResult.user.id,
    isDefault: false,
  });

  if (!gearList) {
    return NextResponse.json(
      { message: "Failed to create gear list" },
      { status: 500 },
    );
  }
  return NextResponse.json(gearList, { status: 201 });
}
