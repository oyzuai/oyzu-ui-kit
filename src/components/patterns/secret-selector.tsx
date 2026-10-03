import { useState } from "react";
import { ResourcePicker } from "./resource-picker";
export type SecretScope = "account" | "organization" | "project" | "component";
export type SecretReference = {
  id: string;
  name: string;
  identifier: string;
  scope: SecretScope;
  scopeName: string;
};
/** Receives only references authorized for this context; never accepts secret values. */
export function SecretSelector({
  label = "Choose a secret",
  references,
  value,
  onChange,
}: {
  label?: string;
  references: readonly SecretReference[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const [scope, setScope] = useState("all");
  const activeScope = references.some((item) => item.scope === scope)
    ? scope
    : "all";
  return (
    <ResourcePicker
      label={label}
      placeholder="Select secret reference"
      value={value}
      onChange={onChange}
      items={references.map((item) => ({
        id: item.id,
        name: item.name + " · " + item.scope,
        description: item.identifier + " · " + item.scopeName,
      }))}
      filter={(item) =>
        activeScope === "all" ||
        references.find((ref) => ref.id === item.id)?.scope === activeScope
      }
      filterControls={
        <label className="secret-scope-filter">
          Scope
          <select
            aria-label="Secret scope"
            value={activeScope}
            onChange={(event) => setScope(event.target.value)}
          >
            <option value="all">All available scopes</option>
            {[...new Set(references.map((item) => item.scope))].map((item) => (
              <option key={item} value={item}>
                {item[0].toUpperCase() + item.slice(1)}
              </option>
            ))}
          </select>
        </label>
      }
    />
  );
}
