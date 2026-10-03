import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
export type ThemePreference = "light" | "dark" | "system";
const key = "oyzu-appearance";
function readTheme(): ThemePreference {
  try {
    const value = localStorage.getItem(key);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}
function applyTheme(preference: ThemePreference) {
  document.documentElement.classList.toggle(
    "dark",
    preference === "dark" ||
      (preference === "system" &&
        matchMedia("(prefers-color-scheme: dark)").matches),
  );
}
applyTheme(readTheme());
export function AppearanceControl() {
  const [preference, setPreference] = useState<ThemePreference>(readTheme);
  useEffect(() => {
    applyTheme(preference);
    const media = matchMedia("(prefers-color-scheme: dark)");
    const update = () => applyTheme(preference);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [preference]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === key || event.key === null) setPreference(readTheme());
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const Icon =
    preference === "system" ? Monitor : preference === "dark" ? Moon : Sun;
  return (
    <label className="appearance-control">
      <Icon size={15} aria-hidden="true" />
      <span className="sr-only">Appearance</span>
      <select
        aria-label="Appearance"
        value={preference}
        onChange={(event) => {
          const next = event.target.value as ThemePreference;
          setPreference(next);
          try {
            localStorage.setItem(key, next);
          } catch {
            /* Preference still applies for this page. */
          }
        }}
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}
