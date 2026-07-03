import { auth } from "@/auth";
import { List } from "@/lib/domain/models/list";
import { Item } from "@/lib/domain/models/item";
import { NextResponse } from "next/server";

type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  canModifyDefaults?: boolean;
};

export async function requireUser(): Promise<
  { user: SessionUser } | { response: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    };
  }
  return { user: session.user };
}

export function canModifyList(
  list: List,
  user: SessionUser,
): NextResponse | null {
  if (list.userId === user.id) return null;
  if (list.isDefault && user.canModifyDefaults) return null;
  return NextResponse.json({ message: "Forbidden" }, { status: 403 });
}

export function canModifyItem(
  item: Item,
  user: SessionUser,
): NextResponse | null {
  if (item.userId === user.id) return null;
  if (item.isDefault && user.canModifyDefaults) return null;
  return NextResponse.json({ message: "Forbidden" }, { status: 403 });
}
