import type { Metadata, Viewport } from "next";
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
  title: "PocketTogether - Shared Finance",
  description: "Track finances together",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PocketTogether",
  },
};

export const viewport: Viewport = {
  themeColor: "#111827",
};

import { ClerkProvider } from '@clerk/nextjs';
import { AuthProvider } from "../context/AuthContext";
import { LocalFirstProvider } from "../context/LocalFirstContext";
import SyncStatusIndicator from "@/components/ui/SyncStatus";
import IOSInstallPrompt from "@/components/IOSInstallPrompt";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <LocalFirstProvider>
            {/* Keeping AuthProvider for now if it provides custom logic, but wrapping with Clerk */}
            <AuthProvider>
              {children}
              {/* <SyncStatusIndicator /> - Moved to Navbar */}
              <IOSInstallPrompt />
            </AuthProvider>
          </LocalFirstProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
