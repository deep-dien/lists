"use client";

import { useSession } from "next-auth/react";

import { redirect } from "next/navigation";

import { Loading } from "@/components/Loading";

export default function Page() {
  // go to sign in if unauthenticated
  const { data: session, status } = useSession();

  // if not user, add to database
  if (status === "loading") {
    return <Loading />;
  } else if (!session?.user) {
    redirect("/signin");
  } else {
    redirect("/dashboard/lists");
  }
}
