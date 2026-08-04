import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center">
          <BrandLogo size={32} showWordmark wordmarkClassName="text-[15px]" />
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <Link href="/#product" className="transition-colors hover:text-foreground">
            Product
          </Link>
          <Link href="/features/mock-apis" className="transition-colors hover:text-foreground">
            Features
          </Link>
          <Link href="/docs" className="transition-colors hover:text-foreground">
            Docs
          </Link>
          <Link href="/pricing" className="transition-colors hover:text-foreground">
            Pricing
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              Log in
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
