"use client";

// packages
import { signOut, useSession } from "next-auth/react";
import { FaSignOutAlt } from "react-icons/fa";
import { usePathname, useRouter, redirect } from "next/navigation";
import { useEffect } from "react";

// components
import { Loading } from "@/components/Loading";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  // get pathname and router
  const pathname = usePathname();
  const router = useRouter();

  // Pre-warm the SW cache for all data endpoints when authenticated and online,
  // so every page works offline even if the user hasn't visited it yet.
  // Cascades into individual list detail routes after fetching the list index.
  useEffect(() => {
    if (status !== "authenticated" || !navigator.onLine) return;

    const warm = async () => {
      const [listsRes] = await Promise.all([
        fetch("/api/lists").catch(() => null),
        fetch("/api/lists/defaults").catch(() => null),
        fetch("/api/items").catch(() => null),
        fetch("/api/items/defaults").catch(() => null),
      ]);

      if (!listsRes?.ok) return;
      const lists: { id: string }[] = await listsRes.json().catch(() => []);
      lists.forEach(({ id }) => fetch(`/api/lists/${id}`).catch(() => {}));
    };

    warm();
  }, [status]);

  if (status === "unauthenticated") router.push("/signin"); // Fixed redirect

  if (status === "loading") return <Loading />;

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden p-1 gap-1">
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
            alt="Lists"
            className="h-full object-contain bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-1">
          <div
            className={
              pathname.startsWith("/dashboard/lists")
                ? "p-2 btn btn-info btn-lg btn-outline btn-active"
                : "p-2 btn btn-info btn-lg btn-outline "
            }
            onClick={() => {
              router.push(`/dashboard/lists`); // Fixed redirect
            }}
          >
            Lists
          </div>
          <div
            className={
              pathname.startsWith("/dashboard/items")
                ? "p-2 btn btn-info btn-lg btn-outline btn-active"
                : "p-2 btn btn-info btn-lg btn-outline"
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
            className="flex btn btn-xs btn-error"
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
