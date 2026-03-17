"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { cn } from "@/lib/utils";

export type ComboboxOption = {
  label: string;
  value: string;
};

type SearchableComboboxProps = {
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  value: string;
  options: ComboboxOption[];
  onChange: (value: string) => void;
  onAddNew?: (query: string) => void;
  disabled?: boolean;
};

export function SearchableCombobox({
  label,
  placeholder,
  searchPlaceholder,
  value,
  options,
  onChange,
  onAddNew,
  disabled,
}: SearchableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const term = query.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(term));
  }, [options, query]);

  function close() {
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="space-y-2">
      {label ? <p className="text-sm font-medium text-espresso">{label}</p> : null}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(true)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-xl border border-mocha/20 bg-steam px-3 text-sm text-left text-espresso",
          disabled && "opacity-60",
        )}
      >
        <span className={cn(!selected && "text-mocha/60")}>{selected?.label ?? placeholder}</span>
        <ChevronsUpDown className="h-4 w-4 text-mocha/70" />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40 bg-black/50" onClick={close} />

          {/* Bottom sheet panel */}
          <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl bg-steam border-t border-mocha/15 shadow-2xl max-h-[70dvh]">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-mocha/25" />
            </div>

            {/* Search row */}
            <div className="flex items-center gap-2 px-4 pt-1 pb-3 shrink-0">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="flex-1 h-10 rounded-xl border border-mocha/15 bg-cream px-3 text-sm text-espresso outline-none focus:ring-2 focus:ring-mocha/40 placeholder:text-mocha/50"
              />
              <button
                type="button"
                onClick={close}
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-mocha/10 text-mocha/60 hover:text-mocha transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Results list */}
            <div className="overflow-y-auto flex-1 px-4 pb-6">
              {filtered.length > 0 ? (
                filtered.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => { onChange(option.value); close(); }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm text-espresso hover:bg-latte/50 active:bg-latte transition-colors"
                  >
                    <span>{option.label}</span>
                    {option.value === value && <Check className="h-4 w-4 text-mocha shrink-0" />}
                  </button>
                ))
              ) : onAddNew && query.trim() ? (
                <button
                  type="button"
                  onClick={() => { onAddNew(query.trim()); close(); }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-mocha hover:bg-latte/50 active:bg-latte transition-colors"
                >
                  <span className="material-symbols-outlined text-base">add_circle</span>
                  Add &ldquo;{query.trim()}&rdquo;
                </button>
              ) : (
                <p className="px-3 py-3 text-sm text-mocha/60">
                  {query.trim() ? `No results for "${query.trim()}"` : "No options available."}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
