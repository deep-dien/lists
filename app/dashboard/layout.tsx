"use client";

// packages
import { signOut, useSession } from "next-auth/react";
import { FaSignOutAlt } from "react-icons/fa";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";

// components
import { Loading } from "@/components/Loading";
import { ThemeToggle } from "@/components/ThemeToggle";

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

  const onLists = pathname.startsWith("/dashboard/lists");
  const onItems = pathname.startsWith("/dashboard/items");

  // Three columns; the outer two are flex-1 so the nav stays centred.
  //   [logo + wordmark] … [Lists | Items] … [theme] [sign out]
  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden">
      <header className="flex w-full shrink-0 items-center gap-2 px-2 py-1">
        {/* left: brand, back to the lists */}
        <div className="flex flex-1 min-w-0 items-center">
          <Link
            href="/dashboard/lists"
            className="flex min-w-0 items-center gap-2 transition-opacity hover:opacity-80"
            title="All lists"
          >
            <img
              src="/noun-checklist-circle-1676792.png"
              alt=""
              className="h-7 w-7 shrink-0 rounded-full bg-white object-contain"
            />
            <h1 className="hidden whitespace-nowrap text-xl font-bold leading-none sm:block">
              Lists
            </h1>
          </Link>
        </div>

        {/* centre: nav */}
        <div className="join shrink-0">
          <Link
            href="/dashboard/lists"
            className={`btn btn-sm join-item ${onLists ? "btn-info" : "btn-ghost"}`}
            aria-current={onLists ? "page" : undefined}
          >
            Lists
          </Link>
          <Link
            href="/dashboard/items"
            className={`btn btn-sm join-item ${onItems ? "btn-info" : "btn-ghost"}`}
            aria-current={onItems ? "page" : undefined}
          >
            Items
          </Link>
        </div>

        {/* right: theme, sign out */}
        <div className="flex flex-1 min-w-0 items-center justify-end gap-1">
          {session?.user?.name && (
            <span
              className="hidden truncate text-sm opacity-80 md:inline"
              title={session.user.name}
            >
              {session.user.name}
            </span>
          )}
          <ThemeToggle />
          <button
            type="button"
            className="btn btn-error btn-sm"
            onClick={async () => {
              await signOut({ callbackUrl: "/" });
            }}
            title="Sign out"
          >
            <FaSignOutAlt />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>
      <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
