import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { APP_DESCRIPTION, APP_NAME, siteUrl } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${APP_NAME}: self-hosted mock API server`,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  keywords: [
    "mock API",
    "API mock server",
    "OpenAPI mock",
    "API sandbox",
    "self-hosted",
  ],
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    apple: [{ url: "/logo.png" }],
  },
  openGraph: {
    title: `${APP_NAME}: self-hosted mock API server`,
    description: APP_DESCRIPTION,
    images: [{ url: "/logo.png", width: 980, height: 980, alt: APP_NAME }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body
        className="min-h-full flex flex-col font-sans"
        style={{ fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui" }}
      >
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
