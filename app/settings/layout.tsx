import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/auth/DashboardShell";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
