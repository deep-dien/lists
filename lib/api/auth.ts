import { auth } from "@/auth";
import { GearList } from "@/lib/domain/models/gearList";
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

// export function canModifyGearList(
//   gearList: GearList,
//   userId: string,
// ): NextResponse | null {
//   if (gearList.isDefault) {
//     return NextResponse.json(
//       { message: "Default gear lists cannot be modified" },
//       { status: 403 },
//     );
//   }
//   if (gearList.userId !== userId) {
//     return NextResponse.json({ message: "Forbidden" }, { status: 403 });
//   }
//   return null;
// }

// export function canModifyItem(item: Item, userId: string): NextResponse | null {
//   if (item.isDefault) {
//     return NextResponse.json(
//       { message: "Default items cannot be modified" },
//       { status: 403 },
//     );
//   }
//   if (item.userId !== userId) {
//     return NextResponse.json({ message: "Forbidden" }, { status: 403 });
//   }
//   return null;
// }
