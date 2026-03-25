import type { ReactNode } from "react";

export default function GuestLayout({ children }: { children: ReactNode }) {
  return (
    <div className="w-full mx-auto max-w-phone">
      {children}
    </div>
  );
}
