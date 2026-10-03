import { useSyncExternalStore } from "react";
// Fictional interaction fixtures, not a permission schema or authorization engine.
export const domains = [
  {
    name: "Scopes",
    prefix: "scope",
    actions: [
      "read",
      "create",
      "update",
      "move",
      "suspend",
      "restore",
      "delete",
    ],
  },
  {
    name: "Members",
    prefix: "membership",
    actions: ["read", "invite", "suspend", "restore", "remove"],
  },
  {
    name: "User groups",
    prefix: "group",
    actions: [
      "read",
      "create",
      "update",
      "membership.update",
      "suspend",
      "restore",
      "retire",
    ],
  },
  {
    name: "Roles",
    prefix: "role",
    actions: ["read", "create", "update", "publish", "retire"],
  },
  {
    name: "Resource groups",
    prefix: "resource-group",
    actions: ["read", "create", "update", "publish", "retire"],
  },
  {
    name: "Assignments",
    prefix: "binding",
    actions: ["read", "create", "replace", "revoke"],
  },
  { name: "Reviews", prefix: "access-change", actions: ["read", "review"] },
  {
    name: "Access explanations",
    prefix: "access",
    actions: ["explain-self", "explain"],
  },
  { name: "Audit", prefix: "audit", actions: ["read", "export"] },
];
export const permissions = domains.flatMap((d) =>
  d.actions.map((action) => ({
    id: `${d.prefix}.${action}`,
    domain: d.name,
    action,
    sensitive: [
      "delete",
      "remove",
      "suspend",
      "revoke",
      "review",
      "export",
      "membership.update",
      "publish",
      "replace",
      "create",
      "move",
      "restore",
    ].includes(action),
  })),
);
export const teams = [
  "Platform engineering",
  "Commerce",
  "Developer experience",
  "Security",
  "Data systems",
  "Customer operations",
];
const first = [
  "Alex",
  "Jordan",
  "Sam",
  "Morgan",
  "Taylor",
  "Casey",
  "Riley",
  "Avery",
  "Jamie",
  "Drew",
  "Cameron",
  "Quinn",
];
const last = [
  "Morgan",
  "Lee",
  "Rivera",
  "Patel",
  "Chen",
  "Reed",
  "Brooks",
  "Singh",
];
export const people = Array.from({ length: 96 }, (_, i) => ({
  id: i,
  name: `${first[i % 12]} ${last[(i + Math.floor(i / 12)) % last.length]}`,
  team: teams[i % teams.length],
  source: i % 4 === 0 ? "Invitation" : "SSO",
  status:
    i > 0 && i % 17 === 0
      ? "Suspended"
      : i > 0 && i % 11 === 0
        ? "Invited"
        : "Active",
  groups: 1 + (i % 5),
  grants: i % 8,
  last: i % 11 === 0 ? "Not yet" : `${1 + (i % 23)} hours ago`,
}));
export type Role = {
  id: string;
  name: string;
  kind: string;
  actions: string[];
  revision: number;
  bindings: number;
  state: string;
};
const builtins = [
  "Account Administrator",
  "Membership Administrator",
  "Access Definition Editor",
  "Access Administrator",
  "Scoped Access Administrator",
  "Scope Administrator",
  "Scope Reader",
  "Access Reviewer",
  "Access Auditor",
];
function roleActions(index: number) {
  const read = permissions.filter((p) => p.action === "read").map((p) => p.id);
  const inDomains = (names: string[]) =>
    permissions.filter((p) => names.includes(p.domain)).map((p) => p.id);
  const self = ["scope.read", "access.explain-self"];
  const bundles = [
    permissions.map((p) => p.id),
    [...self, ...inDomains(["Members", "User groups"]), "access-change.read"],
    [...self, ...inDomains(["Roles", "Resource groups"]), "access-change.read"],
    [
      ...self,
      ...read,
      ...inDomains(["Assignments", "Reviews", "Access explanations"]),
    ],
    [...self, ...inDomains(["Assignments", "Reviews", "Access explanations"])],
    [...self, ...inDomains(["Scopes"])],
    self,
    [...self, ...inDomains(["Reviews"])],
    [...self, ...read, ...inDomains(["Audit", "Access explanations"])],
  ];
  return Array.from(
    new Set(
      index < 9
        ? bundles[index]
        : index % 2
          ? [...self, "audit.read"]
          : [...self, ...inDomains(["Scopes"])],
    ),
  );
}
const initialRoles: Role[] = [
  ...builtins,
  ...teams.flatMap((t) => [`${t} observer`, `${t} operator`]),
].map((name, i) => ({
  id:
    name === "Scope Reader"
      ? "reader"
      : name === "Scope Administrator"
        ? "admin"
        : `role-${i}`,
  name,
  kind: i < 9 ? "Built-in preview" : "Custom",
  actions: roleActions(i),
  revision:
    name === "Scope Reader"
      ? 1
      : name === "Scope Administrator"
        ? 2
        : 1 + (i % 4),
  bindings: 2 + i * 3,
  state: "Published",
}));
export const roots = [
  "Acme account",
  "Engineering",
  "Checkout service",
  "Developer platform",
  "Commerce",
  "Payments",
  "Data systems",
];
export const types = [
  "organization",
  "project",
  "component",
  "role",
  "resource-group",
  "membership",
  "user-group",
];
const ancestry: Record<string, string[]> = {
  "Acme account": [],
  Engineering: ["Acme account"],
  Commerce: ["Acme account"],
  "Data systems": ["Acme account"],
  "Checkout service": ["Acme account", "Engineering"],
  "Developer platform": ["Acme account", "Engineering"],
  Payments: ["Acme account", "Commerce"],
};
export const resources = [
  ...roots.slice(1).map((root, i) => ({
    id: `scope-${i}`,
    name: root,
    root,
    type: ["Engineering", "Commerce", "Data systems"].includes(root)
      ? "organization"
      : "project",
    ancestors: ancestry[root],
  })),
  ...Array.from({ length: 60 }, (_, i) => {
    const root = ["Checkout service", "Developer platform", "Payments"][i % 3];
    return {
      id: `resource-${i + 1}`,
      name: `${["Checkout", "Payments", "Catalog", "Inventory", "Identity", "Notifications", "Gateway", "Telemetry", "Build", "Delivery"][i % 10]} ${["API", "worker", "service", "pipeline", "store", "adapter"][Math.floor(i / 10)]}`,
      root,
      type: "component",
      ancestors: [...ancestry[root], root],
    };
  }),
  ...["role", "resource-group", "membership", "user-group"].flatMap((type) =>
    Array.from({ length: 8 }, (_, i) => ({
      id: `${type}-${i}`,
      name:
        type === "membership"
          ? people[i].name
          : `${teams[i % 6]} ${type} ${i + 1}`,
      root: "Acme account",
      type,
      ancestors: [],
    })),
  ),
];

export type Selector = {
  root: string;
  descendants: boolean;
  types: string[];
  exact: boolean;
  ids: string[];
};
export type Group = {
  id: string;
  name: string;
  selectors: Selector[];
  revision: number;
  state: string;
};
const initialGroups: Group[] = Array.from({ length: 28 }, (_, i) => ({
  id: `coverage-${i}`,
  name: `${teams[i % 6]} ${["all scopes", "production services", "project inventory", "selected components", "shared infrastructure"][Math.floor(i / 6)]}`,
  selectors: [
    {
      root: roots[1 + (i % 6)],
      descendants: i % 3 !== 0,
      types: [i % 3 === 0 ? "project" : "component"],
      exact: false,
      ids: [],
    },
  ],
  revision: 1 + (i % 5),
  state: "Published",
}));
export const newSelector = (): Selector => ({
  root: "Checkout service",
  descendants: false,
  types: ["project"],
  exact: false,
  ids: [],
});
export type Assignment = {
  id: string;
  replaces?: string;
  activatedAt?: string;
  expiresAt?: string;
  principal: string;
  role: string;
  target: string;
  expiry: string;
  scope: string;
  state:
    | "Active"
    | "Pending review"
    | "Activating"
    | "Activation failed"
    | "Rejected"
    | "Revoked"
    | "Expired";
  events: string[];
};
export const definitionKey = (d: { id: string; revision: number }) =>
  `${d.id}@${d.revision}`;
export const principalId = (person: (typeof people)[number]) =>
  person.id === 0 ? "alex" : `person-${person.id}`;
export const userGroups = [
  {
    id: "readers",
    name: "Project readers",
    members: ["alex", "person-1", "person-2"],
    source: "Local",
  },
  ...teams.map((name, i) => ({
    id: `team-${i}`,
    name,
    members: people.filter((p) => p.id % 6 === i).map(principalId),
    source: i % 2 ? "Identity provider" : "Local",
  })),
];
const baselineGroups: Group[] = [
  {
    id: "current",
    name: "Current scope",
    revision: 1,
    state: "Published",
    selectors: [newSelector()],
  },
  {
    id: "descendants",
    name: "Scope and descendants",
    revision: 3,
    state: "Published",
    selectors: [
      { ...newSelector(), descendants: true, types: ["project", "component"] },
    ],
  },
];
const baseline: Assignment[] = [
  {
    id: "access-001",
    principal: "readers",
    role: "reader@1",
    target: "descendants@3",
    scope: "Engineering / Checkout service",
    expiry: "Indefinite",
    state: "Active",
    events: ["Assignment activated"],
  },
  {
    id: "access-002",
    principal: "alex",
    role: "reader@1",
    target: "current@1",
    scope: "Engineering / Checkout service",
    expiry: "Indefinite",
    state: "Active",
    events: ["Direct assignment activated"],
  },
  ...people.slice(3).map((p, i) => ({
    id: `access-${i + 3}`,
    principal: principalId(p),
    role: "reader@1",
    target: "current@1",
    scope: "Engineering / Checkout service",
    expiry: "Indefinite",
    state: "Active" as const,
    events: ["Direct assignment activated"],
  })),
];
export type RbacEvent = {
  id: string;
  time: string;
  action: string;
  entity: string;
  detail: string;
  relatedEntities?: string[];
  before?: unknown;
  after?: unknown;
};
type Model = {
  roles: Role[];
  groups: Group[];
  assignments: Assignment[];
  events: RbacEvent[];
  statuses: Record<string, string>;
  userGroups: typeof userGroups;
};
let snapshot: Model = {
  roles: initialRoles,
  groups: [...baselineGroups, ...initialGroups],
  assignments: baseline,
  events: [],
  statuses: {},
  userGroups,
};
const listeners = new Set<() => void>();
let expiryTimer: ReturnType<typeof setInterval> | undefined;
function emit(next: Model) {
  snapshot = next;
  listeners.forEach((l) => l());
}
export function useRbac() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      if (!expiryTimer)
        expiryTimer = setInterval(() => {
          if (
            snapshot.assignments.some(
              (a) =>
                a.state === "Active" &&
                a.expiresAt &&
                Date.parse(a.expiresAt) <= Date.now(),
            )
          )
            setAssignments((prev) =>
              prev.map((a) =>
                a.state === "Active" &&
                a.expiresAt &&
                Date.parse(a.expiresAt) <= Date.now()
                  ? {
                      ...a,
                      state: "Expired",
                      events: [...a.events, "Assignment expired"],
                    }
                  : a,
              ),
            );
        }, 1000);
      return () => {
        listeners.delete(cb);
        if (!listeners.size) {
          clearInterval(expiryTimer);
          expiryTimer = undefined;
        }
      };
    },
    () => snapshot,
  );
}
function event(
  action: string,
  entity: string,
  detail: string,
  before?: unknown,
  after?: unknown,
): RbacEvent {
  return {
    id: crypto.randomUUID(),
    time: new Date().toISOString(),
    action,
    entity,
    detail,
    before,
    after,
  };
}
export function saveDefinition(kind: "roles", value: Role): void;
export function saveDefinition(kind: "groups", value: Group): void;
export function saveDefinition(kind: "roles" | "groups", value: Role | Group) {
  const family = snapshot[kind].filter((d) => d.id === value.id);
  if (
    family.some((d) => d.state === "Published" && d.revision === value.revision)
  )
    value = {
      ...value,
      revision: Math.max(...family.map((d) => d.revision)) + 1,
    };
  const old = snapshot[kind].find(
    (d) => definitionKey(d) === definitionKey(value) && d.state === "Draft",
  );
  const list = [
    value,
    ...snapshot[kind].filter(
      (d) =>
        !(definitionKey(d) === definitionKey(value) && d.state === "Draft"),
    ),
  ];
  emit({
    ...snapshot,
    [kind]: list,
    events: [
      event(
        "Draft saved",
        value.name,
        "No active assignments changed.",
        old,
        value,
      ),
      ...snapshot.events,
    ],
  });
}
export function publishDefinition(
  kind: "roles" | "groups",
  id: string,
  revision: number,
) {
  const value = snapshot[kind].find(
    (d) => d.id === id && d.revision === revision && d.state === "Draft",
  );
  if (!value) return;
  if (
    snapshot[kind].some(
      (d) => d.id === id && d.revision === revision && d.state === "Published",
    )
  )
    return;
  const published = { ...value, state: "Published" };
  emit({
    ...snapshot,
    [kind]: snapshot[kind].map((d) => (d === value ? published : d)),
    events: [
      event(
        "Revision published",
        value.name,
        `Revision ${revision}. Existing assignments keep their pinned revisions.`,
        value,
        published,
      ),
      ...snapshot.events,
    ],
  });
}
export function setAssignments(updater: (prev: Assignment[]) => Assignment[]) {
  const proposed = updater(snapshot.assignments).map((a) => {
    if (
      a.state === "Active" &&
      a.replaces &&
      snapshot.assignments.find((old) => old.id === a.id)?.state !== "Active" &&
      snapshot.assignments.find((old) => old.id === a.replaces)?.state !==
        "Active"
    )
      return {
        ...a,
        state: "Activation failed" as const,
        events: [
          ...a.events,
          "Original assignment is no longer active; replacement was not activated",
        ],
      };
    if (
      a.state !== "Active" ||
      a.activatedAt ||
      snapshot.assignments.find((old) => old.id === a.id)?.state === "Active"
    )
      return a;
    const days = parseInt(a.expiry);
    const activatedAt = new Date().toISOString();
    return {
      ...a,
      activatedAt,
      expiresAt:
        a.expiresAt ??
        (Number.isFinite(days)
          ? new Date(Date.now() + days * 86400000).toISOString()
          : undefined),
    };
  });
  const replaced = new Set(
    proposed
      .filter((a) => a.state === "Active" && a.replaces)
      .map((a) => a.replaces),
  );
  const next = proposed.map((a) =>
    replaced.has(a.id) && a.state === "Active"
      ? {
          ...a,
          state: "Revoked" as const,
          events: [...a.events, "Replaced after new revision activation"],
        }
      : a,
  );
  const changed = next.filter(
    (n) => n !== snapshot.assignments.find((o) => o.id === n.id),
  );
  emit({
    ...snapshot,
    assignments: next,
    events: [
      ...changed.map((n) =>
        event(
          `Assignment ${n.state.toLowerCase()}`,
          n.id,
          n.events.at(-1) ?? "",
          snapshot.assignments.find((o) => o.id === n.id),
          n,
        ),
      ),
      ...snapshot.events,
    ],
  });
}
export function memberGroups(id: string) {
  return snapshot.userGroups.filter((g) => g.members.includes(id));
}
export function memberAssignments(id: string) {
  const groups = memberGroups(id).map((g) => g.id);
  return snapshot.assignments.filter(
    (a) => a.principal === id || groups.includes(a.principal),
  );
}
export function rbacEvents(id: string) {
  return snapshot.events.filter(
    (e) => e.entity === id || e.relatedEntities?.includes(id),
  );
}
export function setMemberStatus(id: string, status: string) {
  emit({
    ...snapshot,
    statuses: { ...snapshot.statuses, [id]: status },
    events: [
      event(
        "Membership updated",
        id,
        `Membership is now ${status}.`,
        snapshot.statuses[id],
        status,
      ),
      ...snapshot.events,
    ],
  });
}
export function membershipStatus(id: string) {
  return (
    snapshot.statuses[id] ??
    people.find((p) => principalId(p) === id)?.status ??
    "Active"
  );
}
export function matchingResources(sel: Selector) {
  return resources.filter(
    (r) =>
      sel.types.includes(r.type) &&
      (((["organization", "project"].includes(r.type) ||
        r.root === "Acme account") &&
        r.root === sel.root) ||
        (sel.descendants && r.ancestors.includes(sel.root))) &&
      (!sel.exact || sel.ids.includes(r.id)),
  );
}
export function changeGroupMembership(
  groupId: string,
  member: string,
  include: boolean,
) {
  const group = snapshot.userGroups.find((g) => g.id === groupId);
  if (!group) return;
  replaceGroupMembers(
    groupId,
    include
      ? [...group.members, member]
      : group.members.filter((id) => id !== member),
    group.members,
  );
}
export function replaceGroupMembers(
  groupId: string,
  members: string[],
  expected: string[],
): { ok: true } | { ok: false; error: string } {
  const group = snapshot.userGroups.find((g) => g.id === groupId);
  if (!group) return { ok: false, error: "This group is no longer available." };
  if (group.source !== "Local")
    return {
      ok: false,
      error: "Membership is managed by the identity provider.",
    };
  const same = (a: string[], b: string[]) =>
    [...a].sort().join("|") === [...b].sort().join("|");
  if (!same(group.members, expected))
    return {
      ok: false,
      error:
        "Membership changed while you were editing. Close this draft and reopen the group to review the latest members.",
    };
  const next = [...new Set(members)];
  if (next.some((id) => !people.some((p) => principalId(p) === id)))
    return {
      ok: false,
      error: "A selected account member is unavailable. Review your selection.",
    };
  if (same(next, group.members)) return { ok: true };
  const added = next.filter((id) => !group.members.includes(id)),
    removed = group.members.filter((id) => !next.includes(id));
  const updated = { ...group, members: next };
  emit({
    ...snapshot,
    userGroups: snapshot.userGroups.map((g) =>
      g.id === groupId ? updated : g,
    ),
    events: [
      {
        ...event(
          "Group membership updated",
          group.id,
          `${group.name}: ${added.length} added, ${removed.length} removed.`,
          group,
          updated,
        ),
        relatedEntities: [...added, ...removed],
      },
      ...snapshot.events,
    ],
  });
  return { ok: true };
}
// Bounded fixture comparison for UI review, not a production permission evaluator.
export function groupMembershipImpact(
  groupId: string,
  before: string[],
  after: string[],
) {
  const changed = [...new Set([...before, ...after])].filter(
    (id) => before.includes(id) !== after.includes(id),
  );
  const active = (a: Assignment) =>
    a.state === "Active" &&
    (!a.expiresAt || Date.parse(a.expiresAt) > Date.now());
  const pairs = (assignments: Assignment[]) =>
    new Set(
      assignments.filter(active).flatMap((a) => {
        const role = snapshot.roles.find(
            (r) => definitionKey(r) === a.role && r.state === "Published",
          ),
          coverage = snapshot.groups.find(
            (g) => definitionKey(g) === a.target && g.state === "Published",
          );
        return (
          coverage?.selectors
            .flatMap(matchingResources)
            .flatMap(
              (resource) =>
                role?.actions.map((action) => `${action}|${resource.id}`) ?? [],
            ) ?? []
        );
      }),
    );
  const groupGrants = snapshot.assignments.filter(
    (a) => a.principal === groupId,
  );
  const resourceCount = (pairs: Iterable<string>) =>
    new Set([...pairs].map((key) => key.split("|")[1])).size;
  return changed.map((id) => {
    const status = membershipStatus(id),
      otherGroups = memberGroups(id)
        .filter((g) => g.id !== groupId)
        .map((g) => g.id);
    const independent = snapshot.assignments.filter(
      (a) => a.principal === id || otherGroups.includes(a.principal),
    );
    const original =
      status === "Active"
        ? pairs([...independent, ...(before.includes(id) ? groupGrants : [])])
        : new Set<string>();
    const updated =
      status === "Active"
        ? pairs([...independent, ...(after.includes(id) ? groupGrants : [])])
        : new Set<string>();
    const groupPairs = pairs(groupGrants);
    return {
      id,
      name: people.find((p) => principalId(p) === id)!.name,
      added: after.includes(id),
      status,
      gained: resourceCount([...updated].filter((k) => !original.has(k))),
      lost: resourceCount([...original].filter((k) => !updated.has(k))),
      retained: resourceCount([...updated].filter((k) => groupPairs.has(k))),
    };
  });
}
