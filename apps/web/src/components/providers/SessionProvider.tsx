"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { ToastProvider } from "@/providers/ToastProvider";
import { ConfirmDialogProvider } from "@/providers/ConfirmDialogProvider";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <ToastProvider>
        <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
      </ToastProvider>
    </NextAuthSessionProvider>
  );
}
