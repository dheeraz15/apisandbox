import Image from "next/image";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/site";

type BrandLogoProps = {
  className?: string;
  /** Pixel size of the mark (square). */
  size?: number;
  /**
   * `onDark` — inverted white mark for dark surfaces (default).
   * `onLight` — black mark for light surfaces.
   */
  variant?: "onDark" | "onLight";
  showWordmark?: boolean;
  wordmarkClassName?: string;
};

/**
 * Geometric R mark with house negative space.
 * Source assets are black-on-transparent / black-on-white.
 */
export function BrandLogo({
  className,
  size = 24,
  variant = "onDark",
  showWordmark = false,
  wordmarkClassName,
}: BrandLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        src="/logo-mark.png"
        alt={APP_NAME}
        width={size}
        height={size}
        className={cn(
          "shrink-0 object-contain",
          variant === "onDark" && "invert"
        )}
        priority
      />
      {showWordmark && (
        <span
          className={cn(
            "text-sm font-medium tracking-tight",
            wordmarkClassName
          )}
        >
          {APP_NAME}
        </span>
      )}
    </span>
  );
}
