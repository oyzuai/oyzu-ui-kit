import { useState } from "react";
import {
  Users,
  ArrowLeft,
  ArrowRight,
  Search,
  ShieldCheck,
  Building2,
  Check,
  UserPlus,
  UserMinus,
} from "lucide-react";
import { PageLayout } from "@/components/patterns/page-layout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  useRbac,
  people,
  principalId,
  membershipStatus,
  definitionKey,
  matchingResources,
  rbacEvents,
  replaceGroupMembers,
  groupMembershipImpact,
  type Assignment,
} from "./rbac-model";
import "./access-library.css";
import "./user-groups.css";
type UserGroup = ReturnType<typeof useRbac>["userGroups"][number];
const groupHref = (id: string) => `#pages/user-groups/${id}`;
const personHref = (id: string) => `#pages/access-library?member=${id}`;
function AccessSummary({ assignments }: { assignments: Assignment[] }) {
  const model = useRbac();
  return (
    <div className="ug-grants">
      {assignments.map((a) => {
        const role = model.roles.find((r) => definitionKey(r) === a.role),
          coverage = model.groups.find((g) => definitionKey(g) === a.target),
          count = new Set(
            coverage?.selectors.flatMap(matchingResources).map((r) => r.id),
          ).size;
        return (
          <article key={a.id}>
            <ShieldCheck size={20} />
            <div>
              <a href={`#pages/access?assignment=${a.id}`}>
                <strong>{role?.name ?? "Unavailable role"}</strong>
                <ArrowRight size={14} />
              </a>
              <p>
                {coverage?.name ?? "Unavailable coverage"} · {count} current
                example resources
              </p>
              <small>
                Role v{role?.revision} / coverage v{coverage?.revision} ·{" "}
                {a.scope}
              </small>
            </div>
            <span className="al-badge">{a.state}</span>
          </article>
        );
      })}
    </div>
  );
}
export function UserGroups({ groupId }: { groupId?: string }) {
  const model = useRbac(),
    group = model.userGroups.find((g) => g.id === groupId);
  const [query, setQuery] = useState(""),
    [source, setSource] = useState("All sources"),
    [tab, setTab] = useState("Members"),
    [editing, setEditing] = useState(false),
    [notice, setNotice] = useState(""),
    [memberQuery, setMemberQuery] = useState("");
  const grants = group
    ? model.assignments.filter((a) => a.principal === group.id)
    : [];
  const members = group
    ? people.filter((p) => group.members.includes(principalId(p)))
    : [];
  const events = group
    ? [
        ...rbacEvents(group.id),
        ...model.events.filter((e) => grants.some((a) => a.id === e.entity)),
      ].sort((a, b) => b.time.localeCompare(a.time))
    : [];
  if (groupId && !group)
    return (
      <PageLayout
        eyebrow="USER GROUP"
        title="Group not found"
        description="This example group is unavailable."
      >
        <a href="#pages/user-groups">Return to user groups</a>
      </PageLayout>
    );
  if (!group)
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
          <a href="#pages/access-library">
            Users <small>{people.length}</small>
          </a>
          <a href="#pages/access-library?tab=Roles">
            Roles <small>{model.roles.length}</small>
          </a>
          <a href="#pages/access-library?tab=Resource%20groups">
            Resource groups <small>{model.groups.length}</small>
          </a>
          <a href="#pages/user-groups" aria-current="page">
            User groups <small>{model.userGroups.length}</small>
          </a>
        </nav>
        <div className="al-heading">
          <div>
            <h2>Access through membership</h2>
            <p>
              Bring people together. Assign permissions to the group, then
              manage its membership.
            </p>
          </div>
        </div>
        <div className="al-toolbar">
          <label>
            <Search size={16} />
            <input
              aria-label="Search user groups"
              placeholder="Find a group…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            aria-label="Group membership source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            {["All sources", "Local", "Identity provider"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div
          className="al-table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Scrollable table"
        >
          <table className="al-table ug-directory">
            <thead>
              <tr>
                <th>Group</th>
                <th>Members</th>
                <th>Assigned roles</th>
                <th>Membership source</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {model.userGroups
                .filter(
                  (g) =>
                    g.name.toLowerCase().includes(query.toLowerCase()) &&
                    (source === "All sources" || g.source === source),
                )
                .map((g) => {
                  const assignments = model.assignments.filter(
                      (a) => a.principal === g.id && a.state === "Active",
                    ),
                    roles = [
                      ...new Set(
                        assignments.map(
                          (a) =>
                            model.roles.find((r) => definitionKey(r) === a.role)
                              ?.name,
                        ),
                      ),
                    ];
                  return (
                    <tr key={g.id}>
                      <td>
                        <a className="ug-group-name" href={groupHref(g.id)}>
                          <span className="ug-mark">
                            <Users size={20} />
                          </span>
                          <span>
                            <strong>{g.name}</strong>
                            <small>{g.id}</small>
                          </span>
                          <ArrowRight size={14} />
                        </a>
                      </td>
                      <td>{g.members.length}</td>
                      <td>
                        {roles.length
                          ? roles.join(", ")
                          : "No active assignments"}
                        <small>{assignments.length} active grants</small>
                      </td>
                      <td>
                        {g.source}
                        <small>
                          {g.source === "Local"
                            ? "Managed in Oyzu"
                            : "Acme workforce directory"}
                        </small>
                      </td>
                      <td>
                        <span className="al-badge">Active</span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        {!model.userGroups.some(
          (g) =>
            g.name.toLowerCase().includes(query.toLowerCase()) &&
            (source === "All sources" || g.source === source),
        ) && <p className="al-empty">No groups match these filters.</p>}
        <p className="al-note">
          Fictional account. Group status is active for these examples; member
          status determines whether inherited access can be used.
        </p>
      </PageLayout>
    );
  return (
    <PageLayout
      variant="entity"
      contextLabel="ACCOUNT / ACME DEMO"
      eyebrow="USER GROUP"
      title={group.name}
      description={
        group.source === "Local"
          ? "Membership managed in Oyzu"
          : "Membership managed by Acme workforce directory"
      }
      actions={
        <div className="access-page-actions">
          <a className="al-link" href={`#pages/access?recipient=${group.id}`}>
            Assign access →
          </a>
          {group.source === "Local" && (
            <Button onClick={() => setEditing(true)}>
              <Users size={16} />
              Manage members
            </Button>
          )}
        </div>
      }
    >
      <a className="ug-back" href="#pages/user-groups">
        <ArrowLeft size={14} />
        User groups
      </a>
      <div className="ug-overview">
        <div>
          <strong>{members.length}</strong>
          <span>Members</span>
        </div>
        <div>
          <strong>{grants.filter((a) => a.state === "Active").length}</strong>
          <span>Active assignments</span>
        </div>
        <div>
          <strong>{group.source}</strong>
          <span>Membership source</span>
        </div>
      </div>
      {group.source !== "Local" && (
        <section className="ug-provider">
          <Building2 size={24} />
          <div>
            <h2>Membership follows your identity provider</h2>
            <p>
              Add or remove people in Acme workforce directory. Local membership
              controls are unavailable for this group; access assignments remain
              managed here.
            </p>
            <details>
              <summary>Source details</summary>
              <dl>
                <dt>Provider</dt>
                <dd>Acme workforce directory</dd>
                <dt>External group reference</dt>
                <dd>demo-directory/groups/{group.id}</dd>
                <dt>Import</dt>
                <dd>Fictional snapshot · no live synchronization</dd>
              </dl>
            </details>
          </div>
        </section>
      )}
      <nav className="al-tabs" aria-label="Group sections">
        {["Members", "Access assignments", "Activity"].map((t) => (
          <button
            key={t}
            aria-current={tab === t ? "page" : undefined}
            onClick={() => setTab(t)}
          >
            {t}
            <small>
              {t === "Members"
                ? members.length
                : t === "Access assignments"
                  ? grants.length
                  : events.length}
            </small>
          </button>
        ))}
      </nav>
      {notice && (
        <p role="status" className="ug-notice">
          {notice}
        </p>
      )}
      {tab === "Members" && (
        <>
          <div className="al-toolbar">
            <label>
              <Search size={16} />
              <input
                aria-label="Search group members"
                value={memberQuery}
                onChange={(e) => setMemberQuery(e.target.value)}
                placeholder="Find a member…"
              />
            </label>
          </div>
          <div
            className="al-table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Scrollable table"
          >
            <table className="al-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Team</th>
                  <th>Account membership</th>
                  <th>Group access</th>
                </tr>
              </thead>
              <tbody>
                {members
                  .filter((p) =>
                    p.name.toLowerCase().includes(memberQuery.toLowerCase()),
                  )
                  .map((p) => (
                    <tr key={p.id}>
                      <td>
                        <a
                          className="ug-member-name"
                          href={personHref(principalId(p))}
                        >
                          {p.name}
                          <ArrowRight size={14} />
                        </a>
                        <small>
                          {p.name.toLowerCase().replace(" ", ".")}@example.com
                        </small>
                      </td>
                      <td>{p.team}</td>
                      <td>{membershipStatus(principalId(p))}</td>
                      <td>
                        {membershipStatus(principalId(p)) !== "Active"
                          ? "Suppressed by membership status"
                          : grants.some((a) => a.state === "Active")
                            ? "Through group assignments"
                            : "No active group assignments"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {!members.filter((p) =>
            p.name.toLowerCase().includes(memberQuery.toLowerCase()),
          ).length && (
            <p className="al-empty">
              {members.length
                ? "No members match your search."
                : "No members yet. Add people to share this group’s access."}
            </p>
          )}
        </>
      )}
      {tab === "Access assignments" && (
        <>
          <div className="ug-section-intro">
            <h2>Permissions inherited by members</h2>
            <p>
              Only active assignments contribute access. Each assignment pins a
              role and a resource-group revision.
            </p>
          </div>
          <AccessSummary assignments={grants} />
          {!grants.length && (
            <div className="al-empty">
              <h3>This group has no assignments</h3>
              <p>Joining this group currently grants no resource access.</p>
              <a href={`#pages/access?recipient=${group.id}`}>
                Assign access to {group.name} →
              </a>
            </div>
          )}
        </>
      )}
      {tab === "Activity" && (
        <>
          <div className="ug-section-intro">
            <h2>Membership and access changes</h2>
            <p>Changes made in this preview session appear here.</p>
          </div>
          {events.map((e) => (
            <article className="ug-event" key={e.id}>
              <Check size={16} />
              <div>
                <strong>{e.action}</strong>
                <p>{e.detail}</p>
              </div>
              <time>{new Date(e.time).toLocaleTimeString()}</time>
            </article>
          ))}
          {!events.length &&
            !model.events.some((e) =>
              grants.some((a) => a.id === e.entity),
            ) && (
              <p className="al-empty">No changes recorded in this session.</p>
            )}
          <a className="al-link" href="#pages/audit">
            Open audit trail →
          </a>
        </>
      )}
      {editing && (
        <MembershipEditor
          group={group}
          onClose={() => setEditing(false)}
          onSaved={(added, removed) => {
            setEditing(false);
            setNotice(
              `Membership updated: ${added} added, ${removed} removed.`,
            );
          }}
        />
      )}
    </PageLayout>
  );
}
function MembershipEditor({
  group,
  onClose,
  onSaved,
}: {
  group: UserGroup;
  onClose: () => void;
  onSaved: (added: number, removed: number) => void;
}) {
  const model = useRbac();
  const [original] = useState([...group.members]),
    [selected, setSelected] = useState([...group.members]),
    [query, setQuery] = useState(""),
    [selectedOnly, setSelectedOnly] = useState(false),
    [review, setReview] = useState(false),
    [discard, setDiscard] = useState(false),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [outcome, setOutcome] = useState("success");
  const impact = groupMembershipImpact(group.id, original, selected),
    added = impact.filter((p) => p.added),
    removed = impact.filter((p) => !p.added);
  const candidates = people.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) &&
      (!selectedOnly || selected.includes(principalId(p))),
  );
  const grants = model.assignments.filter((a) => a.principal === group.id);
  const close = () => {
    if (saving) return;
    if (impact.length) setDiscard(true);
    else onClose();
  };
  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
    setError("");
  };
  async function save() {
    if (saving) return;
    setSaving(true);
    setError("");
    await new Promise((r) => setTimeout(r, 300));
    if (outcome === "failure") {
      setSaving(false);
      setError(
        "The membership update did not complete. Your selections are preserved; no membership changed.",
      );
      return;
    }
    const result = replaceGroupMembers(group.id, selected, original);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSaved(added.length, removed.length);
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent
        className="al-editor ug-membership-editor"
        onEscapeKeyDown={(e) => {
          if (saving) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (saving) e.preventDefault();
        }}
      >
        <header className="al-editor-header">
          <span>USER GROUP / MEMBERSHIP</span>
          <DialogTitle>
            {discard
              ? "Discard membership changes?"
              : review
                ? "Review membership changes"
                : "Manage members"}
          </DialogTitle>
          <DialogDescription>
            {group.name} · {group.source} membership
          </DialogDescription>
        </header>
        {discard ? (
          <>
            <div className="al-editor-body">
              <p>No membership changes have been saved.</p>
            </div>
            <footer className="al-editor-footer">
              <Button variant="outline" onClick={() => setDiscard(false)}>
                Keep editing
              </Button>
              <Button variant="destructive" onClick={onClose}>
                Discard changes
              </Button>
            </footer>
          </>
        ) : (
          <>
            <div className="al-editor-body" aria-busy={saving}>
              {review ? (
                <>
                  <div className="ug-impact-lead">
                    <Users size={28} />
                    <div>
                      <h2>
                        {added.length} joining · {removed.length} leaving
                      </h2>
                      <p>Review membership and inherited access together.</p>
                    </div>
                  </div>
                  <div
                    className="al-table-scroll"
                    tabIndex={0}
                    role="region"
                    aria-label="Scrollable table"
                  >
                    <table className="al-table ug-impact-table">
                      <thead>
                        <tr>
                          <th>Member</th>
                          <th>Change</th>
                          <th>Access impact</th>
                        </tr>
                      </thead>
                      <tbody>
                        {impact.map((p) => (
                          <tr key={p.id}>
                            <td>
                              <strong>{p.name}</strong>
                              <small>{p.status}</small>
                            </td>
                            <td>
                              {p.added ? (
                                <>
                                  <UserPlus size={14} />
                                  Add to group
                                </>
                              ) : (
                                <>
                                  <UserMinus size={14} />
                                  Remove from group
                                </>
                              )}
                            </td>
                            <td>
                              {p.status !== "Active" ? (
                                <>
                                  <strong>No immediate access change</strong>
                                  <small>
                                    Account membership is{" "}
                                    {p.status.toLowerCase()}.
                                  </small>
                                </>
                              ) : (
                                <>
                                  <strong>
                                    {p.gained
                                      ? `Gains permissions on ${p.gained} resources`
                                      : p.lost
                                        ? `Loses group permissions on ${p.lost} resources`
                                        : "No effective access change"}
                                  </strong>
                                  {!p.added && p.retained > 0 && (
                                    <small>
                                      Retains access on {p.retained}{" "}
                                      {p.retained === 1
                                        ? "resource"
                                        : "resources"}{" "}
                                      through other assignments.
                                    </small>
                                  )}
                                  {p.added && p.gained === 0 && (
                                    <small>
                                      {grants.some((a) => a.state === "Active")
                                        ? "Equivalent permissions already exist through another assignment."
                                        : "This group has no active grants."}
                                    </small>
                                  )}
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <details className="supporting-details" open>
                    <summary>Group assignments behind this change</summary>
                    <AccessSummary assignments={grants} />
                    {!grants.length && (
                      <p>
                        This group has no assignments. Membership changes alone
                        grant no access.
                      </p>
                    )}
                  </details>
                  <p className="al-note">
                    Resource counts compare explicit permissions before and
                    after this change in the fictional inventory. Independent
                    grants are retained. Future resource matches follow the
                    assigned coverage rules.
                  </p>
                </>
              ) : (
                <div className="ug-editor-layout">
                  <section>
                    <div className="al-toolbar">
                      <label>
                        <Search size={16} />
                        <input
                          aria-label="Search account members"
                          placeholder="Search account members…"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                      </label>
                    </div>
                    <div className="ug-selection-tools">
                      <label>
                        <input
                          type="checkbox"
                          checked={selectedOnly}
                          onChange={(e) => setSelectedOnly(e.target.checked)}
                        />
                        Selected only
                      </label>
                      <Button
                        variant="ghost"
                        disabled={!candidates.length}
                        onClick={() =>
                          setSelected((prev) => [
                            ...new Set([
                              ...prev,
                              ...candidates.map(principalId),
                            ]),
                          ])
                        }
                      >
                        Select shown ({candidates.length})
                      </Button>
                    </div>
                    <div className="ug-member-picker">
                      {candidates.map((p) => (
                        <label key={p.id}>
                          <input
                            type="checkbox"
                            checked={selected.includes(principalId(p))}
                            onChange={() => toggle(principalId(p))}
                          />
                          <span>
                            <strong>{p.name}</strong>
                            <small>{p.team}</small>
                          </span>
                          <small>{membershipStatus(principalId(p))}</small>
                        </label>
                      ))}
                      {!candidates.length && (
                        <p className="al-empty">
                          No members match this filter.
                        </p>
                      )}
                    </div>
                  </section>
                  <aside className="ug-edit-summary">
                    <span>MEMBERSHIP DRAFT</span>
                    <h2>{selected.length} selected</h2>
                    <p>
                      {added.length} additions · {removed.length} removals
                    </p>
                    <h3>Access follows the group</h3>
                    <p>
                      New members inherit active assignments. Removing a member
                      removes this path to access; independent grants remain.
                    </p>
                    <strong>
                      {grants.filter((a) => a.state === "Active").length} active
                      group assignments
                    </strong>
                    <p>No changes take effect until you review and save.</p>
                  </aside>
                </div>
              )}
              {error && (
                <p role="alert" className="field-error">
                  {error}
                </p>
              )}
            </div>
            <footer className="al-editor-footer">
              <Button
                variant="ghost"
                disabled={saving}
                onClick={
                  review
                    ? () => {
                        setReview(false);
                        setError("");
                      }
                    : close
                }
              >
                {review ? "Back to selection" : "Cancel"}
              </Button>
              <Button
                disabled={saving || !impact.length}
                onClick={review ? save : () => setReview(true)}
              >
                {saving
                  ? "Saving…"
                  : review
                    ? "Save membership changes"
                    : "Review changes"}
              </Button>
            </footer>
            {review && (
              <details className="ug-preview-controls">
                <summary>Prototype controls</summary>
                <label>
                  Save outcome
                  <select
                    aria-label="Save outcome"
                    value={outcome}
                    disabled={saving}
                    onChange={(e) => setOutcome(e.target.value)}
                  >
                    <option value="success">Success</option>
                    <option value="failure">Simulated failure</option>
                  </select>
                </label>
              </details>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
