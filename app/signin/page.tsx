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
    <div className="flex h-screen flex-col overflow-hidden p-4">
      {/* logo */}
      <div className="flex flex-1 items-center justify-center min-h-0">
        <img
          style={{
            maxHeight: "100%",
            maxWidth: "100%",
            borderRadius: "50%",
            backgroundColor: "white",
            clipPath: "inset(10% 10% 10% 10%)",
            objectFit: "contain",
          }}
          src="/noun-checklist-circle-1676792.png"
          alt="Jaunt"
          className="h-full object-contain bg-white"
        />
      </div>

      <div className="flex flex-col py-3 items-center">
        <div className="text-center p-2 items-center justify-content-between">
          <h1> Welcome to Jaunt </h1>
        </div>
        <div className="text-center p-2 items-center justify-content-between">
          The app for planning trips.
        </div>
        <div className="text-center p-2 items-center justify-content-between">
          Please sign in to access your dashboard.
        </div>
        <div className="p-2 items-center text-center flex-col">
          <input
            className="d-flex form-control m-2 p-2"
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            type="button"
            onClick={(e) => handleMagicLink(e)}
            disabled={status === "sending" || !email}
            className="flex items-center btn btn-success btn-lg p-2"
          >
            {status === "sending" ? "Sending…" : "Send magic link"}
          </button>
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
