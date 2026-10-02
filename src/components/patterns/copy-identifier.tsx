import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyIdentifier({ value }: { value: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  return (
    <span className="copy-identifier">
      <button
        type="button"
        className="identifier-action"
        aria-label={
          status === "copied" ? "Identifier copied" : "Copy identifier"
        }
        title={status === "copied" ? "Copied" : "Copy identifier"}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setStatus("copied");
          } catch {
            setStatus("failed");
          }
        }}
      >
        {status === "copied" ? <Check size={12} /> : <Copy size={12} />}
      </button>
      <span
        role="status"
        className={status === "failed" ? "copy-error" : "sr-only"}
      >
        {status === "copied"
          ? "Identifier copied to clipboard."
          : status === "failed"
            ? "Couldn’t copy. Select the identifier and copy it manually."
            : ""}
      </span>
    </span>
  );
}
