import { useId, type ReactNode } from "react";
import { Switch } from "@/components/ui/switch";
export function SettingRow({
  title,
  description,
  checked,
  onCheckedChange,
  disabled = false,
  badge,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  badge?: ReactNode;
}) {
  const id = useId();
  return (
    <div className="kit-setting">
      <div>
        <label htmlFor={id}>{title}</label>
        {badge}
        <p id={id + "-hint"}>{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-describedby={id + "-hint"}
      />
    </div>
  );
}
