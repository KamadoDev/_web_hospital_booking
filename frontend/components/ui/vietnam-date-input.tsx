"use client";

import { formatVietnamDate } from "@/lib/date";

type VietnamDateInputProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
};

export function VietnamDateInput({
  value,
  onChange,
  className = "",
  min,
  max,
  required,
  disabled,
  ariaLabel,
}: VietnamDateInputProps) {
  return (
    <div className="relative">
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        required={required}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.target.value)}
        className={`${className} text-transparent caret-transparent [color-scheme:light]`}
      />
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#172033]">
        {formatVietnamDate(value)}
      </span>
    </div>
  );
}
