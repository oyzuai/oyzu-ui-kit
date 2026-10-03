import { useId, useState } from "react";

/** One native text input preserves paste, selection, and mobile keyboard behavior. */
export function DeviceCodeInput({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const id = useId();
  const [cursor, setCursor] = useState(0);
  return (
    <div className="device-code-entry">
      <label htmlFor={id}>Device code</label>
      <div className="code-boxes">
        <div className="code-boxes-visual" aria-hidden="true">
          {Array.from({ length: 8 }, (_, i) => (
            <span
              key={i}
              className={
                (i === Math.min(cursor, 7) ? "code-slot active" : "code-slot") +
                (value[i] ? " filled" : "")
              }
            >
              {value[i] || <span className="code-placeholder">·</span>}
            </span>
          ))}
        </div>
        <input
          id={id}
          aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
          aria-invalid={!!error}
          value={value}
          onChange={(event) => {
            const next = event.target.value
              .toUpperCase()
              .replace(/[^A-Z]/g, "")
              .slice(0, 8);
            onChange(next);
            setCursor(
              Math.min(event.target.selectionStart ?? next.length, next.length),
            );
          }}
          onSelect={(event) =>
            setCursor(event.currentTarget.selectionStart ?? 0)
          }
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          required
          aria-label="Device code"
        />
      </div>
      <p id={`${id}-hint`} className="session-caption">
        Enter the 8-letter code from your terminal, or paste the whole code.
      </p>
      {error && (
        <p id={`${id}-error`} role="alert" className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
