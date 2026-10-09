import { stringify } from "yaml";
import { useState } from "react";
import {
  Users,
  ShieldCheck,
  Layers3,
  Search,
  Plus,
  ArrowRight,
} from "lucide-react";
import { PageLayout } from "../components/patterns/page-layout";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import "./access-library.css";

import {
  domains,
  permissions,
  people as basePeople,
  roots,
  types,
  resources,
  newSelector,
  type Role,
  type Group,
  type Selector,
  useRbac,
  saveDefinition,
  publishDefinition,
  definitionKey,
  memberAssignments,
  memberGroups,
  rbacEvents,
  setMemberStatus,
  membershipStatus,
  principalId,
  changeGroupMembership,
} from "./rbac-model";
export function AccessLibrary() {
  const [tab, setTab] = useState(() => { const tab = new URLSearchParams(location.hash.split("?")[1]).get("tab"); return tab && ["Users", "Roles", "Resource groups"].includes(tab) ? tab : "Users"; }),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("All"),
    [page, setPage] = useState(0);
  const model = useRbac();
  const roles = model.roles.map((r) => ({
    ...r,
    bindings: model.assignments.filter((a) => a.role === definitionKey(r))
      .length,
  }));
  const groups = model.groups;
  const people = basePeople.map((p) => ({
    ...p,
    status: membershipStatus(principalId(p)),
    groups: memberGroups(principalId(p)).length,
    grants: memberAssignments(principalId(p)).length,
  }));
  const [publishing, setPublishing] = useState<Role | Group | null>(null);
  const [role, setRole] = useState<Role | null>(() => {
      const key = new URLSearchParams(window.location.hash.split("?")[1]).get(
        "role",
      );
      return model.roles.find((r) => definitionKey(r) === key) ?? null;
    }),
    [group, setGroup] = useState<Group | null>(() => {
      const key = new URLSearchParams(window.location.hash.split("?")[1]).get(
        "group",
      );
      return model.groups.find((g) => definitionKey(g) === key) ?? null;
    }),
    [person, setPerson] = useState<(typeof people)[number] | null>(() => people.find(p => principalId(p) === new URLSearchParams(location.hash.split("?")[1]).get("member")) ?? null),
    [notice, setNotice] = useState("");
  const data = tab === "Users" ? people : tab === "Roles" ? roles : groups;
  const rows = data.filter(
    (r) =>
      `${r.name} ${"team" in r ? r.team : "actions" in r ? r.kind : r.selectors.map((s) => s.root).join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "All" || ("status" in r ? r.status : r.state) === filter),
  );
  const shown = rows.slice(page * 16, page * 16 + 16);
  return (
    <PageLayout
      contextLabel="ACCOUNT / ACME DEMO"
      eyebrow="ACCOUNT / ACME DEMO"
      title="People & access"
      description="Manage participation, reusable permissions, and resource coverage."
      actions={
        <a className="al-link" href="#pages/access">
          Access assignments →
        </a>
      }
    >
      <nav className="al-tabs" aria-label="Access library">
        {["Users", "Roles", "Resource groups"].map((t, i) => (
          <button
            key={t}
            aria-current={tab === t ? "page" : undefined}
            onClick={() => {
              setTab(t);
              setQuery("");
              setFilter("All");
              setPage(0);
            }}
          >
            {i === 0 ? (
              <Users size={18} />
            ) : i === 1 ? (
              <ShieldCheck size={18} />
            ) : (
              <Layers3 size={18} />
            )}{" "}
            {t}
            <span>
              {i === 0 ? people.length : i === 1 ? roles.length : groups.length}
            </span>
          </button>
        ))}
        <a href="#pages/user-groups"><Users size={18}/>User groups <span>{model.userGroups.length}</span></a>
      </nav>
      <div className="al-heading">
        <div>
          <h2>
            {tab === "Users"
              ? "Your account directory"
              : tab === "Roles"
                ? "What people can do"
                : "Where access applies"}
          </h2>
          <p>
            {tab === "Users"
              ? "Membership enables participation. Assignments provide resource access."
              : tab === "Roles"
                ? "Roles collect explicit actions. Published revisions never change existing assignments."
                : "Combine scope and resource selectors. Resource groups contain no permissions."}
          </p>
        </div>
        {tab !== "Users" && (
          <Button
            onClick={() =>
              tab === "Roles"
                ? setRole({
                    id: crypto.randomUUID(),
                    name: "",
                    kind: "Custom",
                    actions: [],
                    revision: 1,
                    bindings: 0,
                    state: "Draft",
                  })
                : setGroup({
                    id: crypto.randomUUID(),
                    name: "",
                    selectors: [newSelector()],
                    revision: 1,
                    state: "Draft",
                  })
            }
          >
            <Plus size={15} />
            Create {tab === "Roles" ? "role" : "resource group"}
          </Button>
        )}
      </div>
      <div className="al-toolbar">
        <label>
          <Search size={16} />
          <input
            aria-label={`Search ${tab.toLowerCase()}`}
            value={query}
            placeholder={`Search ${tab.toLowerCase()} by name${tab === "Users" ? " or team" : ""}…`}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <select
          aria-label="Filter state"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(0);
          }}
        >
          {(tab === "Users"
            ? ["All", "Active", "Invited", "Suspended"]
            : ["All", "Published", "Draft"]
          ).map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <span>{rows.length} results</span>
      </div>
      {notice && <p role="status">{notice}</p>}
      <div className="al-table-wrap">
        <table className="al-table">
          <thead>
            <tr>
              {(tab === "Users"
                ? [
                    "Member",
                    "Team",
                    "Source",
                    "Groups",
                    "Assignments",
                    "Last seen",
                    "Status",
                  ]
                : tab === "Roles"
                  ? [
                      "Role",
                      "Kind",
                      "Permissions",
                      "Revision",
                      "Assignments",
                      "Status",
                    ]
                  : [
                      "Resource group",
                      "Scope roots",
                      "Coverage",
                      "Selectors",
                      "Revision",
                      "Status",
                    ]
              ).map((x) => (
                <th key={x}>{x}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={"team" in r ? r.id : `${definitionKey(r)}-${r.state}`}>
                <td>
                  <button
                    className="al-row-name"
                    onClick={() => {
                      if ("team" in r) setPerson(r);
                      else if ("actions" in r)
                        setRole({ ...r, actions: [...r.actions] });
                      else
                        setGroup({
                          ...r,
                          selectors: r.selectors.map((s) => ({
                            ...s,
                            types: [...s.types],
                            ids: [...s.ids],
                          })),
                        });
                    }}
                  >
                    {"team" in r && (
                      <span className={`al-avatar color-${r.id % 4}`}>
                        {r.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </span>
                    )}
                    <span>
                      <strong>{r.name}</strong>
                      <small>
                        {"team" in r
                          ? `${r.name.toLowerCase().replace(" ", ".")}@example.com`
                          : "actions" in r
                            ? "Reusable action definition"
                            : `resource-group-${page * 16 + i + 1}`}
                      </small>
                    </span>
                    <ArrowRight size={13} />
                  </button>
                </td>
                {"team" in r ? (
                  <>
                    <td>{r.team}</td>
                    <td>{r.source}</td>
                    <td>{r.groups}</td>
                    <td>{r.grants}</td>
                    <td>{r.last}</td>
                    <td>
                      <span className="al-badge">{r.status}</span>
                    </td>
                  </>
                ) : "actions" in r ? (
                  <>
                    <td>{r.kind}</td>
                    <td>{r.actions.length} actions</td>
                    <td>v{r.revision}</td>
                    <td>{r.bindings}</td>
                    <td>
                      <span className="al-badge">{r.state}</span>
                      {r.state === "Draft" && (
                        <Button
                          variant="ghost"
                          onClick={() => setPublishing(r)}
                        >
                          Publish
                        </Button>
                      )}
                    </td>
                  </>
                ) : (
                  <>
                    <td>{r.selectors.map((s) => s.root).join(", ")}</td>
                    <td>
                      {r.selectors.some((s) => s.exact)
                        ? "Exact resources"
                        : r.selectors.some((s) => s.descendants)
                          ? "Includes descendants"
                          : "Exact scope"}
                    </td>
                    <td>{r.selectors.length}</td>
                    <td>v{r.revision}</td>
                    <td>
                      <span className="al-badge">{r.state}</span>
                      {r.state === "Draft" && (
                        <Button
                          variant="ghost"
                          onClick={() => setPublishing(r)}
                        >
                          Publish
                        </Button>
                      )}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
        <p className="al-empty">
          No results. Try a different search or filter.
        </p>
      )}
      <footer className="al-pagination">
        <span>
          Showing {rows.length ? page * 16 + 1 : 0}–
          {Math.min(page * 16 + 16, rows.length)} of {rows.length}
        </span>
        <Button
          variant="ghost"
          disabled={page === 0}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          disabled={(page + 1) * 16 >= rows.length}
          onClick={() => setPage(page + 1)}
        >
          Next page
        </Button>
      </footer>
      <p className="al-note">
        Fictional account-wide design study. Permission bundles and impact
        counts are illustrative; no access is granted here.
      </p>
      {publishing && (
        <PublishReview value={publishing} onClose={() => setPublishing(null)} />
      )}
      {role && (
        <RoleEditor
          value={role}
          onClose={() => setRole(null)}
          onSave={(r) => {
            saveDefinition("roles", r);
            setRole(null);
            setNotice("Role draft saved. Existing assignments are unchanged.");
          }}
        />
      )}
      {group && (
        <GroupEditor
          value={group}
          onClose={() => setGroup(null)}
          onSave={(g) => {
            saveDefinition("groups", g);
            setGroup(null);
            setNotice("Resource group draft saved. No access granted.");
          }}
        />
      )}
      {person && (
        <PersonDetails person={person} onClose={() => setPerson(null)} />
      )}
    </PageLayout>
  );
}
function PersonDetails({
  person,
  onClose,
}: {
  person: (typeof basePeople)[number];
  onClose: () => void;
}) {
  const model = useRbac();
  const id = principalId(person);
  const assignments = memberAssignments(id),
    memberships = memberGroups(id);
  const status = membershipStatus(id);
  const [tab, setTab] = useState("Assignments");
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="al-editor al-member-detail">
        <header className="al-editor-header">
          <span>ACCOUNT MEMBER / ACME DEMO</span>
          <DialogTitle>{person.name}</DialogTitle>
          <DialogDescription>
            {person.team} · {status}
          </DialogDescription>
        </header>
        <nav className="al-detail-tabs" aria-label="Member details">
          {["Assignments", "Group memberships", "Activity"].map((t) => (
            <button
              key={t}
              aria-current={tab === t ? "page" : undefined}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </nav>
        <div className="al-editor-body">
          {tab === "Assignments" && (
            <>
              <h2>Where this person has access</h2>
              <p className="al-note">
                {assignments.length} assignments. Membership alone grants no
                permissions.
              </p>
              {status !== "Active" && (
                <p className="al-member-state">
                  Membership is {status.toLowerCase()}. Assignments do not
                  provide active access.
                </p>
              )}
              <div className="al-table-scroll">
                <table className="al-table">
                  <thead>
                    <tr>
                      <th>Role / revision</th>
                      <th>Coverage / revision</th>
                      <th>Assigned through</th>
                      <th>State</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((a) => {
                      const role = model.roles.find(
                          (r) => definitionKey(r) === a.role,
                        ),
                        group = model.groups.find(
                          (g) => definitionKey(g) === a.target,
                        );
                      return (
                        <tr key={a.id}>
                          <td>
                            {role?.name}
                            <small>Revision {role?.revision}</small>
                          </td>
                          <td>
                            {group?.name}
                            <small>
                              Revision {group?.revision} · {a.scope}
                            </small>
                          </td>
                          <td>
                            {a.principal === id
                              ? "Direct assignment"
                              : model.userGroups.find(
                                  (g) => g.id === a.principal,
                                )?.name}
                            <small>
                              {a.principal === id
                                ? "Assigned to this member"
                                : "Through user group"}
                            </small>
                          </td>
                          <td>
                            {status !== "Active" && a.state === "Active"
                              ? "Suppressed"
                              : a.state}
                          </td>
                          <td>
                            <a href={`#pages/access?assignment=${a.id}`}>
                              View assignment →
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {!assignments.length && (
                <p className="al-empty">No assignments.</p>
              )}
              <a className="al-link" href="#pages/access">
                Assign or explain access →
              </a>
            </>
          )}
          {tab === "Group memberships" && (
            <>
              <h2>Group memberships</h2>
              <p className="al-note">
                Changes to local groups immediately change which group
                assignments apply in this preview. Identity-provider memberships
                are managed externally.
              </p>
              {model.userGroups.map((g) => (
                <div className="al-membership-row" key={g.id}>
                  <Users />
                  <div>
                    <strong>{g.name}</strong>
                    <small>
                      {g.source === "Local"
                        ? "Managed in Oyzu"
                        : "Managed by example identity provider"}
                    </small>
                  </div>
                  <label>
                    <input
                      type="checkbox"
                      aria-label={`Member of ${g.name}`}
                      checked={memberships.some((m) => m.id === g.id)}
                      disabled={g.source !== "Local"}
                      onChange={(e) =>
                        changeGroupMembership(g.id, id, e.target.checked)
                      }
                    />{" "}
                    Member
                  </label>
                </div>
              ))}
            </>
          )}
          {tab === "Activity" && (
            <>
              <h2>Membership activity</h2>
              {rbacEvents(id).map((e) => (
                <div className="al-membership-row" key={e.id}>
                  <div>
                    <strong>{e.action}</strong>
                    <small>{e.detail}</small>
                  </div>
                  <time>{new Date(e.time).toLocaleTimeString()}</time>
                </div>
              ))}
              {!rbacEvents(id).length && (
                <p className="al-empty">
                  No membership changes in this preview session.
                </p>
              )}
              <a href="#pages/audit">Open audit trail →</a>
            </>
          )}
        </div>
        <footer className="al-editor-footer">
          <details>
            <summary>Prototype controls</summary>
            <Button
              variant="outline"
              onClick={() =>
                setMemberStatus(
                  id,
                  status === "Active" ? "Suspended" : "Active",
                )
              }
            >
              {status === "Active"
                ? "Suspend membership"
                : "Activate membership"}
            </Button>
          </details>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

function PublishReview({
  value,
  onClose,
}: {
  value: Role | Group;
  onClose: () => void;
}) {
  const model = useRbac();
  const isRole = "actions" in value;
  const previous = (isRole ? model.roles : model.groups)
    .filter((d) => d.id === value.id && d.state === "Published")
    .sort((a, b) => b.revision - a.revision)[0];
  const affected = model.assignments.filter((a) =>
    (isRole ? a.role : a.target).startsWith(`${value.id}@`),
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="al-editor">
        <header className="al-editor-header">
          <span>PUBLISH REVISION {value.revision}</span>
          <DialogTitle>{value.name}</DialogTitle>
          <DialogDescription>
            Publish a reusable definition. Existing assignments remain pinned.
          </DialogDescription>
        </header>
        <div className="al-editor-body">
          <div className="al-review-lead">
            <ShieldCheck />
            <div>
              <h2>{affected.length} existing assignments stay unchanged</h2>
              <p>
                New assignments can select this revision after publication.
                Migration is a separate explicit change.
              </p>
            </div>
          </div>
          {"actions" in value && (
            <div className="rbac-publication-delta">
              <h3>Permission changes</h3>
              <p>
                <strong>Added:</strong>{" "}
                {value.actions
                  .filter(
                    (a) =>
                      !previous ||
                      !("actions" in previous) ||
                      !previous.actions.includes(a),
                  )
                  .join(", ") || "None"}
              </p>
              <p>
                <strong>Removed:</strong>{" "}
                {previous && "actions" in previous
                  ? previous.actions
                      .filter((a) => !value.actions.includes(a))
                      .join(", ") || "None"
                  : "None"}
              </p>
            </div>
          )}
          <details className="supporting-details">
            <summary>Compare definition YAML</summary>
            <div className="al-review-groups">
              <section>
                <h3>Previous published revision {previous?.revision ?? "—"}</h3>
                <pre className="rbac-definition">
                  {previous
                    ? stringify(
                        isRole && "actions" in previous
                          ? previous.actions
                          : "selectors" in previous
                            ? previous.selectors
                            : [],
                      )
                    : "First publication"}
                </pre>
              </section>
              <section>
                <h3>New revision {value.revision}</h3>
                <pre className="rbac-definition">
                  {stringify(
                    "actions" in value ? value.actions : value.selectors,
                  )}
                </pre>
              </section>
            </div>
          </details>
        </div>
        <footer className="al-editor-footer">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              publishDefinition(
                isRole ? "roles" : "groups",
                value.id,
                value.revision,
              );
              onClose();
            }}
          >
            Publish revision
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

function RoleEditor({
  value,
  onClose,
  onSave,
}: {
  value: Role;
  onClose: () => void;
  onSave: (r: Role) => void;
}) {
  const [name, setName] = useState(value.name),
    [chosen, setChosen] = useState(value.actions),
    [domain, setDomain] = useState("Scopes"),
    [search, setSearch] = useState(""),
    [selectedOnly, setSelectedOnly] = useState(false),
    [review, setReview] = useState(false),
    [error, setError] = useState("");
  const builtin = value.kind !== "Custom";
  const visible = permissions.filter(
    (p) =>
      (search
        ? p.id.includes(search.toLowerCase())
        : selectedOnly || p.domain === domain) &&
      (!selectedOnly || chosen.includes(p.id)),
  );
  const toggle = (id: string) =>
    setChosen((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  const sensitive = permissions.filter(
    (p) => chosen.includes(p.id) && p.sensitive,
  );
  const [discard, setDiscard] = useState(false);
  const close = () => {
    if (
      name !== value.name ||
      JSON.stringify(chosen) !== JSON.stringify(value.actions)
    )
      setDiscard(true);
    else onClose();
  };
  if (discard)
    return (
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) setDiscard(false);
        }}
      >
        <DialogContent>
          <DialogTitle>Discard unsaved changes?</DialogTitle>
          <DialogDescription>
            Your changes have not been saved.
          </DialogDescription>
          <Button variant="outline" onClick={() => setDiscard(false)}>
            Keep editing
          </Button>
          <Button variant="destructive" onClick={onClose}>
            Discard changes
          </Button>
        </DialogContent>
      </Dialog>
    );
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v) close();
      }}
    >
      <DialogContent className="al-editor">
        <header className="al-editor-header">
          <span>
            ROLE DEFINITION / {builtin ? "BUILT-IN PREVIEW" : "DRAFT"}
          </span>
          <DialogTitle>
            {builtin ? name : review ? "Review role draft" : "Design a role"}
          </DialogTitle>
          <DialogDescription>
            Choose capabilities here. Assign people and resource coverage
            separately.
          </DialogDescription>
        </header>
        <div className="al-editor-body">
          <label className="al-field">
            Role name
            <input
              value={name}
              disabled={builtin}
              placeholder="e.g. Release observers"
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          {review ? (
            <>
              <div className="al-review-lead">
                <ShieldCheck size={28} />
                <div>
                  <h2>{name}</h2>
                  <p>
                    {chosen.length} explicit permissions across{" "}
                    {
                      new Set(
                        permissions
                          .filter((p) => chosen.includes(p.id))
                          .map((p) => p.domain),
                      ).size
                    }{" "}
                    categories.
                  </p>
                </div>
              </div>
              <div className="al-review-groups">
                {domains
                  .filter((d) =>
                    permissions.some(
                      (p) => p.domain === d.name && chosen.includes(p.id),
                    ),
                  )
                  .map((d) => (
                    <section key={d.name}>
                      <h3>{d.name}</h3>
                      {chosen
                        .filter((id) => id.startsWith(d.prefix + "."))
                        .map((id) => (
                          <code key={id}>{id}</code>
                        ))}
                    </section>
                  ))}
              </div>
              <p className="al-note">
                Saving creates a draft. Publishing a revision and migrating
                assignments are separate actions. No current grant changes.
              </p>
            </>
          ) : (
            <>
              <div className="al-permission-toolbar">
                <label>
                  <Search size={15} />
                  <input
                    aria-label="Search permissions"
                    placeholder="Search all permissions…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedOnly}
                    onChange={(e) => setSelectedOnly(e.target.checked)}
                  />{" "}
                  Selected only
                </label>
                <strong>{chosen.length} selected</strong>
              </div>
              <div className="al-permission-layout">
                <nav aria-label="Permission categories">
                  {domains.map((d) => (
                    <button
                      key={d.name}
                      aria-current={
                        domain === d.name && !search ? "page" : undefined
                      }
                      onClick={() => {
                        setDomain(d.name);
                        setSearch("");
                      }}
                    >
                      {d.name}
                      <span>
                        {
                          permissions.filter(
                            (p) => p.domain === d.name && chosen.includes(p.id),
                          ).length
                        }
                        /{d.actions.length}
                      </span>
                    </button>
                  ))}
                </nav>
                <div>
                  <div className="al-permission-heading">
                    <h2>{search ? "Search results" : domain}</h2>
                    {!builtin && (
                      <button
                        onClick={() =>
                          setChosen((prev) =>
                            Array.from(
                              new Set([...prev, ...visible.map((p) => p.id)]),
                            ),
                          )
                        }
                      >
                        Select shown ({visible.length})
                      </button>
                    )}
                  </div>
                  {visible.map((p) => (
                    <label className="al-permission" key={p.id}>
                      <input
                        type="checkbox"
                        disabled={builtin}
                        checked={chosen.includes(p.id)}
                        onChange={() => toggle(p.id)}
                      />
                      <span>
                        <strong>
                          {p.action.replaceAll(".", " ").replaceAll("-", " ")}
                        </strong>
                        <code>{p.id}</code>
                      </span>
                      {p.sensitive && <small>Review impact</small>}
                    </label>
                  ))}
                  {!visible.length && <p>No matching permissions.</p>}
                  <p className="al-note">
                    Exact actions only. New catalog actions are never added
                    automatically. Owner-only mutations are unavailable in
                    custom roles.
                  </p>
                </div>
                <aside
                  className="al-selection-summary"
                  aria-label="Selected permissions"
                >
                  <span>THIS ROLE CAN</span>
                  <h2>{chosen.length} permissions</h2>
                  {!chosen.length && (
                    <p>
                      Select actions to build the role. Its resource coverage is
                      assigned separately.
                    </p>
                  )}
                  {domains.map((d) => {
                    const selected = permissions.filter(
                      (p) => p.domain === d.name && chosen.includes(p.id),
                    );
                    return selected.length ? (
                      <section key={d.name}>
                        <h3>
                          {d.name} <small>{selected.length}</small>
                        </h3>
                        {selected.map((p) => (
                          <div key={p.id}>
                            <code>{p.id}</code>
                            {!builtin && (
                              <button
                                aria-label={`Remove ${p.id}`}
                                onClick={() => toggle(p.id)}
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                      </section>
                    ) : null;
                  })}
                  <p>Saving creates a draft. It grants no access.</p>
                </aside>
              </div>
            </>
          )}
          {sensitive.length > 0 && (
            <details className="supporting-details">
              <summary>
                {sensitive.length} selected actions deserve additional review
              </summary>
              <p>
                These actions can change resources, access, or expose exported
                information. This is a preview hint, not the server's
                grant-review classification.
              </p>
              <p>{sensitive.map((p) => p.id).join(", ")}</p>
            </details>
          )}
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
        </div>
        <footer className="al-editor-footer">
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          {builtin ? (
            <Button
              onClick={() =>
                onSave({
                  id: crypto.randomUUID(),
                  name: `${name} copy`,
                  kind: "Custom",
                  actions: chosen,
                  revision: 1,
                  bindings: 0,
                  state: "Draft",
                })
              }
            >
              Duplicate as custom draft
            </Button>
          ) : (
            <div>
              {review && (
                <Button variant="ghost" onClick={() => setReview(false)}>
                  Back to permissions
                </Button>
              )}
              <Button
                onClick={() => {
                  if (!name.trim() || !chosen.length) {
                    setError(
                      "Enter a role name and select at least one permission.",
                    );
                    return;
                  }
                  setError("");
                  if (review)
                    onSave({
                      id: value.id,
                      name,
                      kind: "Custom",
                      actions: chosen,
                      revision:
                        value.state === "Published"
                          ? value.revision + 1
                          : value.revision,
                      bindings: 0,
                      state: "Draft",
                    });
                  else setReview(true);
                }}
              >
                {review ? "Save role draft" : "Review role"}
              </Button>
            </div>
          )}
        </footer>
      </DialogContent>
    </Dialog>
  );
}
type CoverageScope = {
  root: string;
  descendants: boolean;
  choices: Record<string, { mode: "none" | "all" | "exact"; ids: string[] }>;
};
function scopeChoices(selectors: Selector[]): CoverageScope[] {
  const result: CoverageScope[] = [];
  for (const sel of selectors) {
    let scope = result.find(
      (s) => s.root === sel.root && s.descendants === sel.descendants,
    );
    if (!scope) {
      scope = { root: sel.root, descendants: sel.descendants, choices: {} };
      result.push(scope);
    }
    for (const type of sel.types) {
      const prev = scope.choices[type];
      scope.choices[type] = {
        mode: !sel.exact || prev?.mode === "all" ? "all" : "exact",
        ids: [
          ...new Set([
            ...(prev?.ids ?? []),
            ...sel.ids.filter(
              (id) => resources.find((r) => r.id === id)?.type === type,
            ),
          ]),
        ],
      };
    }
  }
  return result;
}
function GroupEditor({
  value,
  onClose,
  onSave,
}: {
  value: Group;
  onClose: () => void;
  onSave: (g: Group) => void;
}) {
  const [name, setName] = useState(value.name),
    [scopes, setScopes] = useState(() => scopeChoices(value.selectors)),
    [active, setActive] = useState(0),
    [selectedType, setSelectedType] = useState("component"),
    [query, setQuery] = useState(""),
    [review, setReview] = useState(false),
    [error, setError] = useState(""),
    [discard, setDiscard] = useState(false);
  const selectors: Selector[] = scopes.flatMap((s) =>
    Object.entries(s.choices)
      .filter(([, v]) => v.mode !== "none")
      .map(([type, v]) => ({
        root: s.root,
        descendants: s.descendants,
        types: [type],
        exact: v.mode === "exact",
        ids: v.ids,
      })),
  );
  const scope = scopes[active];
  const update = (patch: Partial<CoverageScope>) => {
    setScopes((prev) =>
      prev.map((s, i) => (i === active ? { ...s, ...patch } : s)),
    );
    setError("");
  };
  const candidates = (type: string) =>
    resources.filter(
      (r) =>
        r.type === type &&
        (((["organization", "project"].includes(r.type) ||
          r.root === "Acme account") &&
          r.root === scope.root) ||
          (scope.descendants && r.ancestors.includes(scope.root))),
    );
  const matches = [
    ...new Map(
      selectors
        .flatMap((sel) =>
          resources.filter(
            (r) =>
              sel.types.includes(r.type) &&
              (((["organization", "project"].includes(r.type) ||
                r.root === "Acme account") &&
                r.root === sel.root) ||
                (sel.descendants && r.ancestors.includes(sel.root))) &&
              (!sel.exact || sel.ids.includes(r.id)),
          ),
        )
        .map((r) => [r.id, r]),
    ).values(),
  ];
  const choice = scope.choices[selectedType] ?? { mode: "none", ids: [] };
  const dirty =
    name !== value.name ||
    JSON.stringify(scopes) !== JSON.stringify(scopeChoices(value.selectors));
  const close = () => (dirty ? setDiscard(true) : onClose());
  if (discard)
    return (
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) setDiscard(false);
        }}
      >
        <DialogContent>
          <DialogTitle>Discard unsaved changes?</DialogTitle>
          <DialogDescription>
            Your coverage changes have not been saved.
          </DialogDescription>
          <Button variant="outline" onClick={() => setDiscard(false)}>
            Keep editing
          </Button>
          <Button variant="destructive" onClick={onClose}>
            Discard changes
          </Button>
        </DialogContent>
      </Dialog>
    );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className="al-editor">
        <header className="al-editor-header">
          <span>RESOURCE COVERAGE / DRAFT</span>
          <DialogTitle>
            {review ? "Review resource group" : "Build a resource group"}
          </DialogTitle>
          <DialogDescription>
            Choose where, then include all or specific resources of each type.
          </DialogDescription>
        </header>
        <div className="al-editor-body">
          <label className="al-field">
            Resource group name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          {review ? (
            <>
              <div className="al-review-lead">
                <Layers3 />
                <div>
                  <h2>{name}</h2>
                  <p>
                    {scopes.length} scopes · {matches.length} matching example
                    resources
                  </p>
                </div>
              </div>
              {scopes.map((s, i) => (
                <section className="al-selector-review" key={i}>
                  <h3>
                    {s.root} {s.descendants ? "and descendants" : "only"}
                  </h3>
                  {Object.entries(s.choices)
                    .filter(([, c]) => c.mode !== "none")
                    .map(([type, c]) => (
                      <p key={type}>
                        {type}:{" "}
                        {c.mode === "all"
                          ? "All current and future matches"
                          : `${c.ids.length} specific resources; future resources excluded`}
                      </p>
                    ))}
                </section>
              ))}
              <p className="al-note">
                Overlapping coverage is counted once. Saving a draft grants no
                access.
              </p>
            </>
          ) : (
            <>
              <div className="al-selector-tabs">
                {scopes.map((s, i) => (
                  <button
                    key={i}
                    aria-current={i === active ? "page" : undefined}
                    onClick={() => {
                      setActive(i);
                      setQuery("");
                    }}
                  >
                    Scope {i + 1}
                    <small>{s.root}</small>
                  </button>
                ))}
                <Button
                  variant="outline"
                  onClick={() => {
                    setScopes((prev) => [
                      ...prev,
                      ...scopeChoices([newSelector()]),
                    ]);
                    setActive(scopes.length);
                  }}
                >
                  Add another scope
                </Button>
              </div>
              <div className="al-group-layout">
                <section>
                  <div className="al-permission-heading">
                    <h2>1. Where?</h2>
                    {scopes.length > 1 && (
                      <button
                        onClick={() => {
                          setScopes((prev) =>
                            prev.filter((_, i) => i !== active),
                          );
                          setActive(0);
                        }}
                      >
                        Remove scope
                      </button>
                    )}
                  </div>
                  <label className="al-field">
                    Scope
                    <select
                      aria-label="Scope"
                      value={scope.root}
                      onChange={(e) =>
                        update({ root: e.target.value, choices: {} })
                      }
                    >
                      {roots.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </label>
                  <label className="al-descendants">
                    <input
                      type="checkbox"
                      checked={scope.descendants}
                      onChange={(e) =>
                        update({ descendants: e.target.checked, choices: {} })
                      }
                    />
                    <span>
                      <strong>Include descendants</strong>
                      <small>
                        Changing coverage clears resource selections.
                      </small>
                    </span>
                  </label>
                  <h2>2. Which resources?</h2>
                  <div className="rbac-type-choices">
                    {types.map((type) => (
                      <div key={type}>
                        <button
                          onClick={() => {
                            setSelectedType(type);
                            setQuery("");
                          }}
                          aria-current={
                            selectedType === type ? "page" : undefined
                          }
                        >
                          {type}
                          <small>{candidates(type).length} available</small>
                        </button>
                        <select
                          aria-label={`${type} selection`}
                          value={scope.choices[type]?.mode ?? "none"}
                          onChange={(e) => {
                            update({
                              choices: {
                                ...scope.choices,
                                [type]: {
                                  mode: e.target.value as
                                    "none" | "all" | "exact",
                                  ids: [],
                                },
                              },
                            });
                            setSelectedType(type);
                            setQuery("");
                          }}
                        >
                          <option value="none">Not included</option>
                          <option value="all">All matching</option>
                          <option value="exact">Specific resources</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="al-resource-preview">
                  <h2>{selectedType}</h2>
                  <p>
                    {choice.mode === "all"
                      ? "All current and future matching resources"
                      : choice.mode === "exact"
                        ? `${choice.ids.length} explicitly selected`
                        : "Not included. Choose a selection mode to include this type."}
                  </p>
                  <input
                    aria-label="Search matching resources"
                    value={query}
                    placeholder="Find a resource…"
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <div className="al-resource-options">
                    {candidates(selectedType)
                      .filter((r) =>
                        r.name.toLowerCase().includes(query.toLowerCase()),
                      )
                      .map((r) => (
                        <label key={r.id}>
                          <input
                            type="checkbox"
                            disabled={choice.mode !== "exact"}
                            checked={
                              choice.mode === "all" || choice.ids.includes(r.id)
                            }
                            onChange={(e) =>
                              update({
                                choices: {
                                  ...scope.choices,
                                  [selectedType]: {
                                    ...choice,
                                    ids: e.target.checked
                                      ? [...choice.ids, r.id]
                                      : choice.ids.filter((id) => id !== r.id),
                                  },
                                },
                              })
                            }
                          />
                          <span>
                            <strong>{r.name}</strong>
                            <small>
                              {r.root} / {r.type}
                            </small>
                          </span>
                        </label>
                      ))}
                    {!candidates(selectedType).length && (
                      <p className="al-empty">
                        No matching resources here. Adjust scope or include
                        descendants.
                      </p>
                    )}
                  </div>
                </section>
              </div>
            </>
          )}
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
        </div>
        <footer className="al-editor-footer">
          <span>{matches.length} current example matches</span>
          <div>
            <Button
              variant="ghost"
              onClick={review ? () => setReview(false) : close}
            >
              {review ? "Back to coverage" : "Cancel"}
            </Button>
            <Button
              onClick={() => {
                if (
                  !name.trim() ||
                  scopes.some(
                    (s) =>
                      !Object.values(s.choices).some(
                        (c) => c.mode !== "none",
                      ) ||
                      Object.values(s.choices).some(
                        (c) => c.mode === "exact" && !c.ids.length,
                      ),
                  )
                ) {
                  setError(
                    "Name the group, include a resource type in each scope, and choose resources for every specific selection.",
                  );
                  return;
                }
                if (review)
                  onSave({
                    id: value.id,
                    name: name.trim(),
                    selectors,
                    revision:
                      value.state === "Published"
                        ? value.revision + 1
                        : value.revision,
                    state: "Draft",
                  });
                else setReview(true);
              }}
            >
              {review ? "Save resource group draft" : "Review coverage"}
            </Button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
