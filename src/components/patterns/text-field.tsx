import { useId, type ReactNode } from "react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export function TextField({
  label,
  value,
  onChange,
  error,
  hint,
  labelAccessory,
  ...props
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: ReactNode;
  labelAccessory?: ReactNode;
} & Omit<React.ComponentProps<typeof Input>, "onChange" | "value">) {
  const id = useId();
  return (
    <div className="text-field">
      <div className="field-label-row">
        <Label htmlFor={id}>{label}</Label>
        {labelAccessory}
      </div>
      <Input
        {...props}
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={!!error}
        aria-describedby={error || hint ? id + "-description" : undefined}
      />
      {(error || hint) && (
        <p
          id={id + "-description"}
          className={error ? "field-error" : "field-hint"}
          role={error ? "alert" : undefined}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}
