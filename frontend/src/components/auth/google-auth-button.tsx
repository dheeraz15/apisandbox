"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, setAuthToken } from "@/lib/api";
import { GOOGLE_CLIENT_ID, isGoogleAuthConfigured } from "@/lib/google-auth";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: Record<string, unknown>) => void;
          renderButton: (el: HTMLElement, cfg: Record<string, unknown>) => void;
          prompt?: () => void;
        };
      };
    };
  }
}

export function GoogleAuthButton({
  label = "Continue with Google",
}: {
  label?: string;
}) {
  const router = useRouter();
  const btnRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isGoogleAuthConfigured) return;

    const existing = document.getElementById("google-gsi");
    const init = () => {
      if (!window.google || !btnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response: { credential: string }) => {
          setLoading(true);
          setError("");
          try {
            const res = await api.auth.google(response.credential);
            setAuthToken(res.token);
            const workspaces = await api.workspaces.list();
            if (workspaces.length > 0) router.push(`/${workspaces[0].slug}`);
            else router.push("/onboarding");
          } catch (e) {
            setError(e instanceof Error ? e.message : "Google sign-in failed");
          } finally {
            setLoading(false);
          }
        },
      });
      btnRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(btnRef.current, {
        theme: "filled_black",
        size: "large",
        shape: "rectangular",
        text: "continue_with",
        width: 320,
      });
      setReady(true);
    };

    if (existing) {
      init();
      return;
    }
    const script = document.createElement("script");
    script.id = "google-gsi";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = init;
    document.head.appendChild(script);
  }, [router]);

  // Nothing to show on an instance that has not set up a Google OAuth client.
  if (!isGoogleAuthConfigured) return null;

  return (
    <div className="space-y-2">
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>
      {/* Fixed height reservation prevents layout jump while GSI loads */}
      <div className="relative flex min-h-[44px] w-full items-center justify-center">
        {!ready && !loading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg border border-border bg-muted/30 text-xs text-muted-foreground">
            Loading Google…
          </div>
        )}
        <div ref={btnRef} className="flex w-full justify-center" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 text-xs text-muted-foreground">
            Signing in…
          </div>
        )}
      </div>
      <p className="sr-only">{label}</p>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
