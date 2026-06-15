// app/signin/page.js

"use client";

import { getProviders, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { Loading } from "@/components/Loading";

export function SignInContent() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");

  const searchParams = useSearchParams();
  const gearListId = searchParams.get("gearListId");

  const callbackUrl = gearListId
    ? `/dashboard/gear-lists/${gearListId}`
    : "/dashboard/gear-lists";

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("sending");
    const res = await signIn("email", {
      email,
      redirect: false,
      callbackUrl: callbackUrl,
    });
    if (res?.ok) setStatus("sent");
    else setStatus("error");
  };

  return (
    <div className="flex h-screen w-screen flex-col p-10 gap-10 overflow-hidden">
      {/* logo */}
      <div className="flex items-center justify-center min-h-0">
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
          alt="Gear Lists"
          className="h-full object-contain bg-white"
        />
      </div>

      {/* title */}
      <div className="text-bold text-center w-full flex">
        Welcome to Gear Lists
      </div>

      {/* sign in */}
      <div className="gap-5 flex flex-col">
        <div className="text-center flex flex-row w-full items-center ">
          Please sign in to access your dashboard.
        </div>
        <div className="flex w-full items-center text-center flex-col gap-5">
          <input
            className="flex form-control w-full flex-1"
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div
            onClick={(e) => handleMagicLink(e)}
            // disabled={status === "sending" || !email}
            className={`flex items-center btn btn-success btn-lg ${status === "sending" || !email ? "btn-disabled" : ""}`}
          >
            {status === "sending" ? "Sending…" : "Send magic link"}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage({}) {
  return (
    <Suspense fallback={<Loading />}>
      <SignInContent></SignInContent>
    </Suspense>
  );
}
