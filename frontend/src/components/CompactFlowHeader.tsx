"use client";

import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type CompactFlowHeaderProps = {
  title: string;
  onBack: () => void;
  progressCount: number;
  currentStep: number;
  action?: ReactNode;
  className?: string;
};

export function CompactFlowHeader({
  title,
  onBack,
  progressCount,
  currentStep,
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
        "sticky top-0 z-10 px-4 transition-colors duration-200",
        isScrolled ? "bg-[#1a0f00cc] backdrop-blur-[8px]" : "bg-transparent",
        className,
      )}
    >
      <div className="flex h-12 items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-[#f49d25] transition-colors hover:bg-[#f49d25]/10"
          aria-label="Go back"
        >
          <span aria-hidden="true">←</span>
        </button>

        <h1 className="flex-1 px-2 text-center text-base font-semibold text-white">
          {title}
        </h1>

        <div className="flex h-11 w-11 items-center justify-center">
          {action}
        </div>
      </div>

      <div className="mb-[6px] mt-[6px] flex gap-1">
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
    </header>
  );
}
