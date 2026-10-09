import { Search, X } from "lucide-react";
import { Input } from "../ui/input";
export function SearchField({
  value,
  onChange,
  label = "Search resources",
  placeholder = "Search by name or identifier…",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}) {
  return (
    <div className="kit-search">
      <Search size={15} aria-hidden="true" />
      <Input
        aria-label={label}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
