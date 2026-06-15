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
            maxHeight: "75%",
            maxWidth: "75%",
            borderRadius: "100%",
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
      <h1 className="text-bold text-center">Welcome to Gear Lists.</h1>

      {/* sign in */}
      <div className="gap-5 flex flex-col">
        <div className="text-center flex-row w-full items-center ">
          Please sign in to access your dashboard.
        </div>
        <form className="fieldset items-center flex-col flex text-center flex-col gap-5">
          <input
            className="p-2 m-2 flex w-[300px] validator"
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            type="submit"
            onClick={(e) => handleMagicLink(e)}
            disabled={status === "sending" || !email}
            className={`flex p-2 m-2 items-center w-[300px] btn btn-success btn-lg ${status === "sending" || !email ? "btn-disabled" : ""}`}
          >
            {status === "sending" ? "Sending…" : "Send magic link"}
          </button>
        </form>
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
