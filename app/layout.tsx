import type { Metadata } from "next";
import { Newsreader, Space_Grotesk } from "next/font/google";
import { SiteHeader } from "@/components/common/site-header";
import { AuthProvider } from "@/providers/auth-provider";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
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
        className={`${spaceGrotesk.variable} ${newsreader.variable} antialiased`}
      >
        <AuthProvider>
          <SiteHeader />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
