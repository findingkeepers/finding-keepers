import type { Metadata } from "next";
import { Cormorant_Garamond, Jost, Mulish } from "next/font/google";
import { Toaster } from "sonner";
import { AuthCallbackRedirect } from "@/components/auth/AuthCallbackRedirect";
import { AuthSessionGuard } from "@/components/auth/AuthSessionGuard";
import { SiteFooter } from "@/components/layout/SiteFooter";
import "./globals.css";

const mulish = Mulish({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const jost = Jost({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-title",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Finding Keepers",
  description:
    "A verified Muslim matrimonial matching platform — helping you find your right fit.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${mulish.variable} ${jost.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <AuthCallbackRedirect />
        <AuthSessionGuard />
        <div className="flex min-h-full flex-1 flex-col">{children}</div>
        <SiteFooter />
        <Toaster
          position="top-center"
          toastOptions={{
            classNames: {
              toast: "font-sans",
            },
          }}
        />
      </body>
    </html>
  );
}