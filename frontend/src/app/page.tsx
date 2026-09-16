import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { buttonVariants } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
      <BrandLogo />

      <h1 className="mt-8 text-3xl font-semibold tracking-tight">
        Mock APIs that behave like the real thing
      </h1>

      <p className="text-muted-foreground mt-4 text-base leading-relaxed">
        Define endpoints, give them realistic responses, and call them over HTTP
        straight away. Useful when the backend is not built yet, when you need a
        third-party API you cannot hit from a dev machine, or when you want a
        failing payment provider on demand.
      </p>

      <p className="text-muted-foreground mt-4 text-base leading-relaxed">
        This instance runs on your own machine. Nothing is sent anywhere else.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/signup" className={buttonVariants({ size: "lg" })}>
          Create an account
        </Link>
        <Link
          href="/login"
          className={buttonVariants({ size: "lg", variant: "outline" })}
        >
          Sign in
        </Link>
        <Link
          href="/docs"
          className={buttonVariants({ size: "lg", variant: "ghost" })}
        >
          Read the docs
        </Link>
      </div>

      <p className="text-muted-foreground mt-10 text-sm">
        First time here? Sign up, and the onboarding wizard will seed a demo
        workspace you can call immediately.
      </p>
    </main>
  );
}
