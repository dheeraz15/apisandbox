"use client";

import { useEffect, useRef, useState } from "react";
import { Link2, Link2Off, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, AuthUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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


export function GoogleLinkCard({ onUpdated }: { onUpdated?: (u: AuthUser) => void }) {
  const btnRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const me = await api.auth.me();
    setUser(me);
    return me;
  };

  useEffect(() => {
    refresh()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading || user?.google_linked) return;

    const mount = () => {
      if (!window.google || !btnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response: { credential: string }) => {
          setBusy(true);
          try {
            const res = await api.auth.googleLink(response.credential);
            setUser(res.user);
            onUpdated?.(res.user);
            toast.success("Google account linked");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to link Google");
          } finally {
            setBusy(false);
          }
        },
      });
      btnRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(btnRef.current, {
        theme: "filled_black",
        size: "large",
        shape: "rectangular",
        text: "continue_with",
        width: 280,
      });
    };

    const existing = document.getElementById("google-gsi");
    if (existing) {
      mount();
      return;
    }
    const script = document.createElement("script");
    script.id = "google-gsi";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = mount;
    document.head.appendChild(script);
  }, [loading, user?.google_linked, onUpdated]);

  const unlink = async () => {
    setBusy(true);
    try {
      await api.auth.googleUnlink();
      const me = await refresh();
      onUpdated?.(me);
      toast.success("Google unlinked");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unlink failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading account…
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Google sign-in
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Link Google so you can sign in faster next time without a password.
          </p>
        </div>
        {user?.google_linked ? (
          <Badge variant="secondary">Linked</Badge>
        ) : (
          <Badge variant="outline">Not linked</Badge>
        )}
      </div>

      {user?.google_linked ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            <span className="text-muted-foreground">Connected as </span>
            <span className="font-medium">{user.google_email || user.email}</span>
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={unlink}
            className="gap-1.5"
          >
            <Link2Off className="h-3.5 w-3.5" />
            Unlink
          </Button>
        </div>
      ) : (
        <div className="relative">
          <div ref={btnRef} className="min-h-10" />
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-xs text-muted-foreground">
              Linking…
            </div>
          )}
        </div>
      )}
    </section>
  );
}
