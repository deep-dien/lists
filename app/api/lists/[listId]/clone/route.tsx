import { NextResponse } from "next/server";

import { MongoItemRepo } from "@/lib/adapters/mongoItemRepo";

import { MongoListRepo } from "@/lib/adapters/mongoListRepo";

import { CloneListService } from "@/lib/services/cloneListService";
import { requireUser } from "@/lib/api/auth";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ listId: string }> },
) {
  const authResult = await requireUser();
  if ("response" in authResult) return authResult.response;

  const { listId } = await params;

  // clone service
  const service = new CloneListService(
    new MongoListRepo(),
    new MongoItemRepo(),
  );

  // clone and return
  const list = await service.execute(listId, authResult.user.id);
  return NextResponse.json(list);
}
