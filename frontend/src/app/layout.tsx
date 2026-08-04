import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
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
  title: {
    default: "backendruntime — Enterprise Integration Sandbox",
    template: "%s — backendruntime",
  },
  description:
    "Enterprise Integration Sandbox. Deploy production-shaped mock APIs, custom domains, rules, and traffic analytics before the real backend ships.",
  keywords: [
    "mock API",
    "enterprise integration sandbox",
    "API mock server",
    "OpenAPI mock",
    "custom domain API",
    "backendruntime",
  ],
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    apple: [{ url: "/logo.png" }],
  },
  openGraph: {
    title: "backendruntime — Enterprise Integration Sandbox",
    description:
      "Deploy production-shaped mock APIs, custom domains, and traffic analytics before the real backend ships.",
    images: [{ url: "/logo.png", width: 980, height: 980, alt: "backendruntime" }],
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
