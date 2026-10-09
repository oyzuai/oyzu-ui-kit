import { useId, useRef, useState, type ReactNode } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import "./resource-picker.css";
export type PickerResource = {
  id: string;
  name: string;
  description?: string;
  disabled?: boolean;
};
/** Callers own the selection, available resources and recent history. */
export function ResourcePicker({
  label,
  filterControls,
  filter,
  items,
  value,
  onChange,
  recentIds = [],
  placeholder = "Choose a resource",
  emptyLabel = "No resources available",
}: {
  filterControls?: ReactNode;
  filter?: (item: PickerResource) => boolean;
  label: string;
  items: readonly PickerResource[];
  value: string | null;
  onChange: (id: string | null) => void;
  recentIds?: readonly string[];
  placeholder?: string;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const search = useRef<HTMLInputElement>(null);
  const results = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const chosen = items.find((item) => item.id === value);
  const needle = query.trim().toLowerCase();
  const matches = items
    .filter((item) => !filter || filter(item))
    .filter((item) =>
      `${item.name} ${item.id} ${item.description ?? ""}`
        .toLowerCase()
        .includes(needle),
    );
  const recent = needle
    ? []
    : [...new Set(recentIds)]
        .flatMap((id) => {
          const item = items.find((item) => item.id === id);
          return item && (!filter || filter(item)) ? [item] : [];
        })
        .slice(0, 5);
  const remaining = matches.filter(
    (item) => !recent.some((entry) => entry.id === item.id),
  );
  function choose(id: string | null) {
    onChange(id);
    setOpen(false);
  }
  function option(item: PickerResource) {
    return (
      <button
        type="button"
        className="picker-option"
        key={item.id}
        disabled={item.disabled}
        aria-pressed={value === item.id}
        onClick={() => choose(item.id)}
      >
        <span>
          <strong>{item.name}</strong>
          <code>{item.id}</code>
          {item.description && <small>{item.description}</small>}
        </span>
        {value === item.id && <Check size={17} aria-hidden="true" />}
        {item.disabled && <small>Unavailable</small>}
      </button>
    );
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setQuery("");
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="resource-picker-trigger"
          aria-label={`${label}: ${chosen?.name ?? placeholder}`}
        >
          <span>{chosen?.name ?? placeholder}</span>
          <ChevronsUpDown size={14} />
        </Button>
      </DialogTrigger>
      <DialogContent
        className="resource-picker-dialog"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          search.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>
            Search by name or identifier. Select a result to apply it.
          </DialogDescription>
          {filterControls}
        </DialogHeader>
        <div className="picker-search">
          <Search size={17} aria-hidden="true" />
          <Input
            ref={search}
            aria-label="Search resources"
            aria-describedby={hintId}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                results.current
                  ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
                  ?.focus();
              }
            }}
            placeholder="Search by name or identifier…"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                search.current?.focus();
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>
        <p className="picker-count" id={hintId} role="status">
          {matches.length} {matches.length === 1 ? "result" : "results"}
        </p>
        <div
          className="picker-results"
          ref={results}
          onKeyDown={(event) => {
            if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key))
              return;
            const buttons = Array.from(
              results.current?.querySelectorAll<HTMLButtonElement>(
                "button:not(:disabled)",
              ) ?? [],
            );
            const index = buttons.indexOf(event.target as HTMLButtonElement);
            if (index < 0) return;
            event.preventDefault();
            if (event.key === "ArrowUp" && index === 0) {
              search.current?.focus();
              return;
            }
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? buttons.length - 1
                  : Math.max(
                      0,
                      Math.min(
                        buttons.length - 1,
                        index + (event.key === "ArrowDown" ? 1 : -1),
                      ),
                    );
            buttons[next]?.focus();
          }}
        >
          {recent.length > 0 && (
            <section aria-label="Recent choices">
              <h3>Recent</h3>
              {recent.map(option)}
            </section>
          )}
          {remaining.length > 0 && (
            <section aria-label="Available resources">
              <h3>
                {needle
                  ? "Matches"
                  : recent.length
                    ? "Other resources"
                    : "All resources"}
              </h3>
              {remaining.map(option)}
            </section>
          )}
          {!matches.length && (
            <div className="picker-empty">
              <h3>{needle ? "No matching resources" : emptyLabel}</h3>
              <p>
                {needle
                  ? "Try a different name or identifier."
                  : "Resources will appear here when they are available."}
              </p>
              {needle && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setQuery("");
                    search.current?.focus();
                  }}
                >
                  Clear search
                </Button>
              )}
            </div>
          )}
        </div>
        <footer className="picker-footer">
          <span>
            {chosen ? (
              <>
                <strong>Selected</strong> {chosen.name}
              </>
            ) : (
              "No selection"
            )}
          </span>
          <Button
            variant="ghost"
            disabled={value === null}
            onClick={() => choose(null)}
          >
            Clear selection
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
