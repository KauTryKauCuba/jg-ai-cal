import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

// A custom-built dropdown, not a native <select> — native select popups
// render with OS-level UA chrome that a page's CSS can't fully control (on
// macOS/Safari this can render dark even under a locked-light design), so
// every dropdown in this app uses this component instead. Styled to the
// text-input spec: 29.6px height, hairline-input border, 4.8px radius.
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
        className={cn(
          "flex h-[29.6px] min-w-[104px] items-center justify-between gap-2 rounded-[8px] border border-[var(--input)] bg-white px-3 text-sm text-[var(--text)] transition-colors hover:border-[var(--accent)] focus-visible:border-[var(--accent)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60",
          open && "border-[var(--accent)]",
        )}
      >
        <span>{selected?.label ?? "Select"}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-[var(--text-mute)] transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="absolute left-0 top-[calc(100%+6px)] z-10 m-0 min-w-full w-max list-none overflow-hidden rounded-[10px] border border-[var(--border)] bg-white p-1.5 shadow-[0_10px_24px_-8px_rgba(7,33,28,0.2)]"
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-4 rounded-[7px] px-2.5 py-1.5 text-sm transition-colors",
                    isSelected
                      ? "bg-[var(--accent-bg)] font-medium text-[var(--accent)]"
                      : "text-[var(--text)] hover:bg-[var(--canvas-soft)]",
                  )}
                >
                  {opt.label}
                  {isSelected && <Check className="size-3.5 shrink-0" />}
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
