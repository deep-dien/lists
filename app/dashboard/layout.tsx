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

  if (status === "unauthenticated") redirect("/signin");

  if (status === "loading") return <Loading />;

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden p-1 gap-1">
      <header className="flex h-[55px] w-full flex-shrink-0 flex-row flex-wrap items-center justify-between">
        {/* left */}
        <div className="flex w-[50px] h-[50px] items-center justify-center min-h-0">
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
            alt="Jaunt"
            className="h-full object-contain bg-white"
          />
        </div>
        {/* middle */}
        <div className="flex flex-wrap items-center justify-center gap-1">
          <div
            className={
              pathname.startsWith("/dashboard/gear-lists")
                ? "btn btn-info btn-xl btn-outline btn-active"
                : "btn btn-info btn-xl btn-outline "
            }
            onClick={() => {
              redirect(`/dashboard/gear-lists`);
            }}
          >
            Gear Lists
          </div>
          <div
            className={
              pathname.startsWith("/dashboard/items")
                ? "btn btn-info btn-xl btn-outline btn-active"
                : "btn btn-info btn-xl btn-outline"
            }
            onClick={() => {
              redirect(`/dashboard/items`);
            }}
          >
            Items
          </div>
        </div>
        {/* right */}
        <div className="flex items-center">
          <div
            className="flex btn-sm btn-danger"
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
