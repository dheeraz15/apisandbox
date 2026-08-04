"use client";

import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";

const KEY = "br-announce-v1-dismissed";

export function AnnouncementBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="relative z-[60] border-b border-white/10 bg-white text-black">
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-4 py-2.5 text-center text-sm">
        <BrandLogo size={16} variant="onLight" className="hidden sm:inline-flex" />
        <p className="font-medium tracking-tight">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-black/55">
            v1
          </span>
          <span className="mx-2 text-black/30">·</span>
          Enterprise Integration Sandbox is live
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
        >
          Start free
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <button
          type="button"
          aria-label="Dismiss announcement"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-black/40 hover:text-black"
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
