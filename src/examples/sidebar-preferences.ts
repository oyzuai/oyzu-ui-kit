import { useEffect, useState } from "react";
type Preferences = { collapsed: boolean; closedGroups: string[] };
const key = "oyzu-ui-navigation-v1";
function read(): Preferences {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "null");
    return {
      collapsed: value?.collapsed === true,
      closedGroups: Array.isArray(value?.closedGroups)
        ? value.closedGroups.filter((item: unknown) => typeof item === "string")
        : [],
    };
  } catch {
    return { collapsed: false, closedGroups: [] };
  }
}
export function useSidebarPreferences() {
  const [preferences, setPreferences] = useState(read);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(preferences));
    } catch {
      /* Navigation still works when browser storage is unavailable. */
    }
  }, [preferences]);
  return { preferences, setPreferences };
}
