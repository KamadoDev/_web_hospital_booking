"use client";

import { AuthProvider } from "@/lib/auth";
import { AppQueryProvider } from "@/lib/query-provider";
import { ThemeProvider } from "@/lib/theme";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AppQueryProvider>
        <AuthProvider>{children}</AuthProvider>
      </AppQueryProvider>
    </ThemeProvider>
  );
}
