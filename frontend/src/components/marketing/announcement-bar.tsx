"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

const KEY = "br-announce-v1-dismissed";

/**
 * Subtle Vercel-style notice — dark, thin, no white flash.
 * Renders a fixed-height placeholder to avoid layout jitter.
 */
export function AnnouncementBar() {
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(!localStorage.getItem(KEY));
    } catch {
      setVisible(true);
    }
    setReady(true);
  }, []);

  if (!ready) {
    return <div className="h-9 border-b border-border/40" aria-hidden />;
  }

  if (!visible) return null;

  return (
    <div className="relative z-[60] h-9 border-b border-border/60 bg-background">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-center gap-3 px-4 text-center text-xs text-muted-foreground">
        <p>
          <span className="text-foreground">v1 is live</span>
          <span className="mx-2 text-border">·</span>
          Enterprise Integration Sandbox
          <Link
            href="/signup"
            className="ml-2 text-foreground underline-offset-4 hover:underline"
          >
            Start free
          </Link>
        </p>
        <button
          type="button"
          aria-label="Dismiss"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground/60 hover:text-foreground"
          onClick={() => {
            try {
              localStorage.setItem(KEY, "1");
            } catch {
              /* ignore */
            }
            setVisible(false);
          }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
