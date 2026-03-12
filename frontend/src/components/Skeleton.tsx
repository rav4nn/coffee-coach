import { cn } from "@/lib/utils";

/**
 * Base skeleton block — warm pulse matching the app's dark amber theme.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-primary/10",
        className,
      )}
    />
  );
}
