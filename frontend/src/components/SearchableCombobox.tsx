"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

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
  disabled?: boolean;
};

export function SearchableCombobox({
  label,
  placeholder,
  searchPlaceholder,
  value,
  options,
  onChange,
  disabled,
}: SearchableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((option) => option.value === value);
  const filtered = useMemo(() => {
    if (!query.trim()) {
      return options;
    }

    const term = query.trim().toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(term));
  }, [options, query]);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-espresso">{label}</p>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((state) => !state)}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-xl border border-mocha/20 bg-steam px-3 text-sm text-left text-espresso",
            disabled && "opacity-60",
          )}
        >
          <span className={cn(!selected && "text-mocha/60")}>{selected?.label ?? placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 text-mocha/70" />
        </button>
        {open ? (
          <div className="absolute z-30 mt-2 w-full rounded-xl border border-mocha/15 bg-steam p-2 shadow-xl">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="mb-2 h-9 w-full rounded-lg border border-mocha/15 bg-cream px-3 text-sm text-espresso outline-none focus:ring-2 focus:ring-mocha/40"
            />
            <div className="max-h-44 overflow-y-auto">
              {filtered.length ? (
                filtered.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setQuery("");
                      setOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm text-espresso hover:bg-latte/50"
                  >
                    <span>{option.label}</span>
                    {option.value === value ? <Check className="h-4 w-4 text-mocha" /> : null}
                  </button>
                ))
              ) : (
                <p className="px-2 py-2 text-sm text-mocha/70">No matches found.</p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
