"use client";

import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type CompactFlowHeaderProps = {
  title: string;
  onBack: () => void;
  progressCount?: number;
  currentStep?: number;
  showProgress?: boolean;
  action?: ReactNode;
  className?: string;
};

export function CompactFlowHeader({
  title,
  onBack,
  progressCount = 0,
  currentStep = 0,
  showProgress = false,
  action,
  className,
}: CompactFlowHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-10 transition-colors duration-200",
        isScrolled ? "bg-[#1a0f00cc] backdrop-blur-[8px]" : "bg-transparent",
        className,
      )}
    >
      <div className="relative flex h-11 items-center justify-between px-4">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-[#f49d25] transition-colors hover:bg-[#f49d25]/10"
          aria-label="Go back"
        >
          <span aria-hidden="true">←</span>
        </button>

        <h1 className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-base font-normal text-white">
          {title}
        </h1>

        <div className="flex h-11 w-11 items-center justify-center">
          {action}
        </div>
      </div>

      {showProgress && progressCount > 0 && (
        <div className="mx-4 mb-[6px] flex h-1 gap-1">
          {Array.from({ length: progressCount }).map((_, index) => {
            const stepNumber = index + 1;
            const stateClass =
              stepNumber === currentStep
                ? "bg-[#f49d25]"
                : stepNumber < currentStep
                  ? "bg-[#f49d25]/60"
                  : "bg-white/20";

            return (
              <div
                key={stepNumber}
                className={cn("h-1 flex-1 rounded-[2px]", stateClass)}
              />
            );
          })}
        </div>
      )}
    </header>
  );
}
