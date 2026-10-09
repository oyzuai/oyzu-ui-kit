import { useState } from "react";
import {
  Plus,
  Trash2,
  Layers3,
  FolderOpen,
  Building2,
  Check,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { roots, matchingResources } from "./rbac-model";
import {
  directActions,
  newDirectEntry,
  type DirectEntry,
} from "./automation-direct-model";
const categories = [
  {
    type: "component",
    name: "Components",
    description: "Application components and their metadata.",
    icon: Layers3,
  },
  {
    type: "project",
    name: "Projects",
    description: "Project details and lifecycle.",
    icon: FolderOpen,
  },
  {
    type: "organization",
    name: "Organizations",
    description: "Organization details and lifecycle.",
    icon: Building2,
  },
];
export function DirectSummary({ entries }: { entries: DirectEntry[] }) {
  return (
    <div className="ad-summary gh-permission-summary">
      {entries.map((e) => {
        const matches = matchingResources(e.selector),
          category = categories.find((c) => c.type === e.selector.types[0]);
        return (
          <article key={e.id}>
            <Check size={18} />
            <div>
              <span className="ai-kicker">
                {category?.name} ·{" "}
                {e.selector.exact
                  ? "Selected resources"
                  : "All matching resources"}
              </span>
              <h3>
                {e.actions
                  .map((a) => directActions.find((x) => x.id === a)?.label ?? a)
                  .join(", ") || "No permissions selected"}
              </h3>
              <p className="gh-summary-targets">
                {e.selector.exact
                  ? matches.map((r) => r.name).join(", ") ||
                    "No resources selected"
                  : `All ${category?.name.toLowerCase()} in ${e.selector.root}`}
              </p>
              <small>
                {e.selector.exact
                  ? "Only selected resource IDs; future resources are excluded."
                  : e.selector.descendants
                    ? "Includes current and future matching descendants."
                    : "Only this scope; descendants are excluded."}
              </small>
              <details>
                <summary>
                  {matches.length} matching{" "}
                  {matches.length === 1 ? "resource" : "resources"} · inspect
                  scope
                </summary>
                <p>{e.selector.root}</p>
                <ul>
                  {matches.map((r) => (
                    <li key={r.id}>
                      {r.name} · {r.id}
                    </li>
                  ))}
                  {!matches.length && <li>No current matches.</li>}
                </ul>
              </details>
            </div>
          </article>
        );
      })}
    </div>
  );
}
export function DirectAccessEditor({
  entries,
  onChange,
  root,
}: {
  entries: DirectEntry[];
  onChange: (v: DirectEntry[]) => void;
  root: string;
}) {
  const [search, setSearch] = useState<Record<string, string>>({});
  const update = (id: string, patch: Partial<DirectEntry>) =>
    onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const add = (type: string) => {
    const entry = newDirectEntry(root);
    entry.selector.types = [type];
    onChange([...entries, entry]);
  };
  return (
    <section className="gh-access">
      <header>
        <h2>Permissions</h2>
        <p>
          Choose what this automation can do, then select the resources it can
          access.
        </p>
        <span>All permissions start with no access.</span>
      </header>
      {categories.map((category) => {
        const selected = entries.filter(
          (e) => e.selector.types[0] === category.type,
        );
        const Icon = category.icon;
        return (
          <details
            className="gh-category"
            data-configured={selected.some(e => e.actions.length > 0)}
            key={category.type}
            open={selected.length > 0 || undefined}
          >
            <summary>
              <Icon size={21} />
              <div>
                <strong>{category.name}</strong>
                <p>{category.description}</p>
              </div>
              <span>
                {selected.filter((e) => e.actions.length).length
                  ? `${selected.filter((e) => e.actions.length).length} configured`
                  : "No access"}
              </span>
            </summary>
            <div className="gh-category-body">
              {!selected.length && (
                <div className="gh-no-access">
                  <p>
                    This identity has no access to {category.name.toLowerCase()}
                    .
                  </p>
                  <Button variant="outline" onClick={() => add(category.type)}>
                    Configure {category.name.toLowerCase()}
                  </Button>
                </div>
              )}
              {selected.map((e, i) => {
                const sel = e.selector;
                const candidates = matchingResources({
                  ...sel,
                  exact: false,
                  ids: [],
                }).filter((r) =>
                  r.name
                    .toLowerCase()
                    .includes((search[e.id] ?? "").toLowerCase()),
                );
                const level = e.actions.includes("scope.update")
                  ? "write"
                  : e.actions.includes("scope.read")
                    ? "read"
                    : "none";
                return (
                  <fieldset className="gh-grant" key={e.id}>
                    <legend>
                      {category.name} access {i + 1}
                    </legend>
                    <div className="gh-permission-row">
                      <div>
                        <strong>Details</strong>
                        <p>View metadata or update details.</p>
                      </div>
                      <select
                        aria-label={`${category.name} details access ${i + 1}`}
                        value={level}
                        onChange={(v) =>
                          update(e.id, {
                            actions: [
                              ...e.actions.filter(
                                (a) =>
                                  !["scope.read", "scope.update"].includes(a),
                              ),
                              ...(v.target.value === "write"
                                ? ["scope.read", "scope.update"]
                                : v.target.value === "read"
                                  ? ["scope.read"]
                                  : []),
                            ],
                          })
                        }
                      >
                        <option value="none">No access</option>
                        <option value="read">Read-only</option>
                        <option value="write">Read and write</option>
                      </select>
                    </div>
                    <details className="gh-additional">
                      <summary>
                        Additional permissions
                        {e.actions.filter((a) =>
                          ["scope.suspend", "scope.restore"].includes(a),
                        ).length
                          ? " · configured"
                          : ""}
                      </summary>
                      <p>These actions are not included in read and write.</p>
                      {directActions
                        .filter((a) =>
                          ["scope.suspend", "scope.restore"].includes(a.id),
                        )
                        .map((a) => (
                          <label key={a.id}>
                            <input
                              type="checkbox"
                              checked={e.actions.includes(a.id)}
                              onChange={() =>
                                update(e.id, {
                                  actions: e.actions.includes(a.id)
                                    ? e.actions.filter((id) => id !== a.id)
                                    : [...e.actions, a.id],
                                })
                              }
                            />
                            {a.label}
                          </label>
                        ))}
                    </details>
                    <div className="gh-resource-access">
                      <strong>Resource access</strong>
                      <label>
                        <input
                          type="radio"
                          name={`selection-${e.id}`}
                          checked={sel.exact}
                          onChange={() =>
                            update(e.id, { selector: { ...sel, exact: true } })
                          }
                        />
                        Only selected {category.name.toLowerCase()}
                      </label>
                      <label>
                        <input
                          type="radio"
                          name={`selection-${e.id}`}
                          checked={!sel.exact}
                          onChange={() =>
                            update(e.id, { selector: { ...sel, exact: false } })
                          }
                        />
                        All {category.name.toLowerCase()} in {sel.root}
                      </label>
                      {sel.exact ? (
                        <details className="gh-picker">
                          <summary>
                            {sel.ids.length
                              ? `${sel.ids.length} selected`
                              : `Select ${category.name.toLowerCase()}…`}
                          </summary>
                          <input
                            aria-label={`Search ${category.name.toLowerCase()} access ${i + 1}`}
                            placeholder="Search resources…"
                            value={search[e.id] ?? ""}
                            onChange={(v) =>
                              setSearch({ ...search, [e.id]: v.target.value })
                            }
                          />
                          <div className="ad-resources">
                            {candidates.map((r) => (
                              <label key={r.id}>
                                <input
                                  type="checkbox"
                                  checked={sel.ids.includes(r.id)}
                                  onChange={() =>
                                    update(e.id, {
                                      selector: {
                                        ...sel,
                                        ids: sel.ids.includes(r.id)
                                          ? sel.ids.filter((id) => id !== r.id)
                                          : [...sel.ids, r.id],
                                      },
                                    })
                                  }
                                />
                                <span>
                                  {r.name}
                                  <small>{r.root}</small>
                                </span>
                              </label>
                            ))}
                            {!candidates.length && (
                              <p>
                                No resources match. Adjust your search or
                                coverage.
                              </p>
                            )}
                          </div>
                        </details>
                      ) : (
                        <p className="gh-future">
                          {matchingResources(sel).length} current matches.{" "}
                          {sel.descendants
                            ? "Includes future matching descendants."
                            : "Descendants are excluded."}
                        </p>
                      )}
                      <details className="gh-coverage">
                        <summary>
                          Coverage: {sel.root}
                          {sel.descendants ? " and descendants" : ""}
                        </summary>
                        <label>
                          Within scope
                          <select
                            aria-label={`${category.name} scope ${i + 1}`}
                            value={sel.root}
                            onChange={(v) =>
                              update(e.id, {
                                selector: {
                                  ...sel,
                                  root: v.target.value,
                                  ids: [],
                                },
                              })
                            }
                          >
                            {roots.map((r) => (
                              <option key={r}>{r}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={sel.descendants}
                            onChange={(v) =>
                              update(e.id, {
                                selector: {
                                  ...sel,
                                  descendants: v.target.checked,
                                  ids: [],
                                },
                              })
                            }
                          />
                          {sel.exact
                            ? "Search descendant scopes"
                            : "Include current and future descendants"}
                        </label>
                      </details>
                    </div>
                    <Button
                      variant="ghost"
                      aria-label={`Remove ${category.name.toLowerCase()} access ${i + 1}`}
                      onClick={() =>
                        onChange(entries.filter((x) => x.id !== e.id))
                      }
                    >
                      <Trash2 size={14} />
                      Remove access
                    </Button>
                  </fieldset>
                );
              })}
              {selected.length > 0 && (
                <Button variant="ghost" onClick={() => add(category.type)}>
                  <Plus size={14} />
                  Add different {category.name.toLowerCase()} access
                </Button>
              )}
            </div>
          </details>
        );
      })}
      <p className="gh-access-note">
        Permissions apply only to the resources selected alongside them.
        Administrator approval is required before authentication setup.
      </p>
    </section>
  );
}
