import { MongoListRepo } from "@/lib/adapters/mongoListRepo";
import { canModifyList, requireUser } from "@/lib/api/auth";
import { ListItem } from "@/lib/domain/models/list";
import { NextResponse } from "next/server";

const listRepo = new MongoListRepo();

type RouteParams = { params: Promise<{ listId: string }> };

export async function POST(req: Request, { params }: RouteParams) {
  const authResult = await requireUser();
  if ("response" in authResult) return authResult.response;

  const { listId } = await params;
  const existing = await listRepo.findById(listId);
  if (!existing) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  const forbidden = canModifyList(existing, authResult.user);
  if (forbidden) return forbidden;

  const body = (await req.json()) as ListItem;
  const updated = await listRepo.addItem(listId, new ListItem(body));
  if (!updated) {
    return NextResponse.json(
      { message: "Failed to add item to list" },
      { status: 500 },
    );
  }
  return NextResponse.json(updated, { status: 201 });
}
