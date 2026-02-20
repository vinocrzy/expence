'use client';

import { AuthProvider } from "../context/AuthContext";
import { LocalFirstProvider } from "../context/LocalFirstContext";
import { ToastProvider } from "../context/ToastContext";
import IOSInstallPrompt from "@/components/IOSInstallPrompt";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LocalFirstProvider>
        <ToastProvider>
          {children}
          <IOSInstallPrompt />
        </ToastProvider>
      </LocalFirstProvider>
    </AuthProvider>
  );
}
