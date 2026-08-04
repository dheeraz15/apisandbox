/** Platform admin vs normal user workspace view. */

export type AppViewMode = "user" | "platform";

const KEY = "br-view-mode";
const WS_KEY = "br-last-workspace";

export function getViewMode(): AppViewMode {
  if (typeof window === "undefined") return "user";
  try {
    return localStorage.getItem(KEY) === "platform" ? "platform" : "user";
  } catch {
    return "user";
  }
}

export function setViewMode(mode: AppViewMode) {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("br-view-mode", { detail: mode }));
  }
}

export function rememberWorkspace(slug: string) {
  try {
    localStorage.setItem(WS_KEY, slug);
  } catch {
    /* ignore */
  }
}

export function lastWorkspace(): string | null {
  try {
    return localStorage.getItem(WS_KEY);
  } catch {
    return null;
  }
}
