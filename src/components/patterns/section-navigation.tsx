import type { ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import "./section-navigation.css";
export type SectionLink = {
  id: string;
  label: string;
  href: string;
  icon: ReactNode;
  description: string;
};
export function SectionNavigation({
  items,
  active,
  label,
  onNavigate,
}: {
  items: readonly SectionLink[];
  active: string;
  label: string;
  onNavigate: (href: string) => void;
}) {
  return (
    <nav className="section-navigation" aria-label={label}>
      <div className="section-navigation-links">
        {items.map((item) => (
          <a
            key={item.id}
            href={item.href}
            aria-current={active === item.id ? "page" : undefined}
          >
            {item.icon}
            <span>
              <strong>{item.label}</strong>
              <small>{item.description}</small>
            </span>
          </a>
        ))}
      </div>
      <div className="section-navigation-picker">
        <Select
          value={active}
          onValueChange={(id) => {
            const item = items.find((item) => item.id === id);
            if (item) onNavigate(item.href);
          }}
        >
          <SelectTrigger aria-label={label}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </nav>
  );
}
