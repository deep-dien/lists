// providers
import { SessionWrapper } from "@/providers/SessionWrapper";
import { QueryWrapper } from "@/providers/QueryWrapper";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lists",
  description: "Lists",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Lists",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-mono">
        <SessionWrapper>
          <QueryWrapper>
            <ServiceWorkerRegistration />
            {children}
          </QueryWrapper>
        </SessionWrapper>
      </body>
    </html>
  );
}
