import type { NavigationContext } from "../components/patterns/active-context";
export const organizations = [
  {
    name: "Engineering",
    projects: ["Checkout service", "Platform APIs", "Developer tools"],
  },
  {
    name: "Operations",
    projects: ["Production infrastructure", "Internal services"],
  },
  { name: "Research", projects: [] },
];

export function rememberedContext(): NavigationContext | null {
  try {
    const value = JSON.parse(
      sessionStorage.getItem("oyzu-last-context") ?? "null",
    );
    return organizations.some(
      (o) =>
        o.name === value?.organization &&
        (value.project === null || o.projects.includes(value.project)),
    )
      ? value
      : null;
  } catch {
    return null;
  }
}
export function rememberContext(value: NavigationContext) {
  try {
    sessionStorage.setItem("oyzu-last-context", JSON.stringify(value));
  } catch {
    /* Optional preview persistence. */
  }
}
