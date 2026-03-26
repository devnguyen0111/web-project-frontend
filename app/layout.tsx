import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { SiteHeader } from "@/components/common/site-header";
import { RouteTransition } from "@/components/motion";
import { AuthProvider } from "@/providers/auth-provider";
import { MotionProvider } from "@/providers/motion-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Web Project Frontend",
  description: "Frontend for auth, users, blog, and moderation modules",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${manrope.variable} antialiased`}
      >
        <AuthProvider>
          <MotionProvider>
            <SiteHeader />
            <RouteTransition>{children}</RouteTransition>
          </MotionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
