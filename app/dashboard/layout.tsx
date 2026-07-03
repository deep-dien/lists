"use client";

// packages
import { signOut, useSession } from "next-auth/react";
import { FaSignOutAlt } from "react-icons/fa";
import { usePathname, useRouter, redirect } from "next/navigation";

// components
import { Loading } from "@/components/Loading";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  // get pathname and router
  const pathname = usePathname();
  const router = useRouter();

  if (status === "unauthenticated") router.push("/signin"); // Fixed redirect

  if (status === "loading") return <Loading />;

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden p-1 gap-1">
      {/* 
        CHANGED: Added flex-wrap, justified center for wrapped states, and h-auto to prevent clipping 
      */}
      <header className="flex w-full flex-shrink-0 flex-row flex-wrap gap-1 items-center justify-between h-auto p-1">
        {/* left logo */}
        <div className="flex h-[40px] items-center justify-center min-h-0">
          <img
            style={{
              maxHeight: "100%",
              maxWidth: "100%",
              borderRadius: "50%",
              backgroundColor: "white",
              clipPath: "inset(0% 0% 0% 0%)",
              objectFit: "contain",
            }}
            src="/noun-checklist-circle-1676792.png"
            alt="Gear lists"
            className="h-full object-contain bg-white"
          />
        </div>

        {/* 
          middle buttons 
          CHANGED: Removed custom ordering classes. 
          Added order-last so that if everything wraps, these buttons drop to a full new line at the bottom.
          Added sm:order-none so they stay in the middle when there is room.
        */}
        <div className="flex flex-wrap items-center justify-center gap-1 order-last w-full md:w-auto md:order-none">
          <div
            className={
              pathname.startsWith("/dashboard/gear-lists")
                ? "p-2 btn btn-info btn-xl btn-outline btn-active"
                : "p-2 btn btn-info btn-xl btn-outline "
            }
            onClick={() => {
              router.push(`/dashboard/gear-lists`); // Fixed redirect
            }}
          >
            Gear Lists
          </div>
          <div
            className={
              pathname.startsWith("/dashboard/items")
                ? "p-2 btn btn-info btn-xl btn-outline btn-active"
                : "p-2 btn btn-info btn-xl btn-outline"
            }
            onClick={() => {
              router.push(`/dashboard/items`); // Fixed redirect
            }}
          >
            Items
          </div>
        </div>

        {/* right signout */}
        <div className="flex items-center">
          <div
            className="flex btn btn-sm btn-error"
            onClick={async () => {
              await signOut({ callbackUrl: "/" });
            }}
          >
            <FaSignOutAlt />
          </div>
        </div>
      </header>
      <div className="divider m-0 p-1"></div>
      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
