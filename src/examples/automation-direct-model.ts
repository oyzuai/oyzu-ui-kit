import { matchingResources, type Selector } from "./rbac-model";
// Fictional UI access vocabulary; not an authoritative platform schema.
export const directActions = [
  { id: "scope.read", label: "View details" },
  { id: "scope.update", label: "Edit details" },
  { id: "scope.suspend", label: "Suspend" },
  { id: "scope.restore", label: "Restore" },
];
export type DirectEntry = { id: string; selector: Selector; actions: string[] };
export function newDirectEntry(root = "Checkout service"): DirectEntry {
  return {
    id: crypto.randomUUID(),
    selector: {
      root,
      types: ["component"],
      descendants: true,
      exact: true,
      ids: [],
    },
    actions: [],
  };
}
export function directError(entries: DirectEntry[]): string | undefined {
  if (!entries.length) return "Add at least one access entry.";
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (!e.actions.length)
      return `Choose at least one action for entry ${i + 1}.`;
    if (
      e.actions.some((a) => !directActions.some((x) => x.id === a)) ||
      !["organization", "project", "component"].includes(e.selector.types[0])
    )
      return `Review the actions and resource type in entry ${i + 1}.`;
    if (
      e.selector.exact &&
      (!e.selector.ids.length ||
        matchingResources(e.selector).length !== e.selector.ids.length)
    )
      return `Select valid resources for entry ${i + 1}.`;
  }
}
