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

// Runs before first paint so the saved theme applies without a flash of the
// wrong one. Falls back to the OS preference when nothing is saved.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

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
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
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
