import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// A custom-built dropdown, not a native <select> — native select popups
// render with OS-level UA chrome that a page's CSS can't fully control (on
// macOS/Safari this can render dark even under a locked-light design), so
// every dropdown in this app uses this component instead. Styled to the
// text-input spec: 37px height, hairline-input border, 6px radius.
export interface SelectDropdownOption {
  value: string;
  label: string;
}

export function SelectDropdown({
  value,
  options,
  onChange,
  disabled,
  className,
}: {
  value: string;
  options: SelectDropdownOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const selected = options.find((o) => o.value === value);

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  return (
    <div ref={rootRef} className={cn("relative inline-block", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-[37px] min-w-[130px] items-center justify-between gap-2 rounded-[6px] border border-[var(--input)] bg-white px-3 text-sm text-[var(--text)] transition-colors focus-visible:border-[var(--accent)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span>{selected?.label ?? "Select"}</span>
        <ChevronDown className="size-4 shrink-0 text-[var(--text-mute)]" />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute left-0 top-[calc(100%+4px)] z-10 min-w-full overflow-hidden rounded-[6px] border border-[var(--input)] bg-white py-1 shadow-[0_10px_20px_-6px_rgba(0,0,0,0.15)]"
        >
          {options.map((opt) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--canvas-soft)]"
            >
              {opt.label}
              {opt.value === value && (
                <Check className="size-4 shrink-0 text-[var(--accent)]" />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
