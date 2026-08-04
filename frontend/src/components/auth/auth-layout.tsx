import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid-bg flex min-h-screen flex-col">
      <header className="flex h-14 items-center px-6">
        <Link href="/" className="flex items-center">
          <BrandLogo size={28} showWordmark />
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          )}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
