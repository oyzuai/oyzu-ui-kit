export type AuditEvent = {
  snapshots?: { before: unknown; after: unknown };
  id: string;
  time: string;
  actor: string;
  source: string;
  action: string;
  resource: string;
  kind: string;
  scope: string;
  outcome: "Succeeded" | "Denied" | "Failed";
  summary: string;
  changes: { field: string; before: string | null; after: string | null }[];
};
export const auditSamples: AuditEvent[] = [
  {
    id: "evt-1042",
    time: "2026-10-02T16:42:18Z",
    actor: "Alex Morgan",
    source: "Console",
    action: "Updated",
    resource: "Production GitHub",
    kind: "Connection",
    scope: "Checkout service",
    outcome: "Succeeded",
    summary: "Changed the endpoint and credential reference.",
    changes: [
      {
        field: "endpoint",
        before: "https://github.example.com",
        after: "https://api.github.com",
      },
      {
        field: "secretReference",
        before: "org/github-token-v1",
        after: "project/github-token-v2",
      },
    ],
  },
  {
    id: "evt-1041",
    time: "2026-10-02T16:35:04Z",
    actor: "Git sync bot",
    source: "Git sync",
    action: "Updated",
    resource: "Production registry",
    kind: "Connection",
    scope: "Checkout service",
    outcome: "Succeeded",
    summary: "Applied configuration from a fictional Git revision.",
    changes: [{ field: "reviewChanges", before: "false", after: "true" }],
  },
  {
    id: "evt-1040",
    time: "2026-10-02T15:58:21Z",
    actor: "Jamie Chen",
    source: "Console",
    action: "Deleted",
    resource: "Production registry",
    kind: "Connection",
    scope: "Checkout service",
    outcome: "Denied",
    summary:
      "The actor did not have permission to delete this connection. No configuration changed.",
    changes: [],
  },
  {
    id: "evt-1039",
    time: "2026-10-02T15:40:10Z",
    actor: "Alex Morgan",
    source: "Console",
    action: "Created",
    resource: "Staging cluster",
    kind: "Connection",
    scope: "Checkout service",
    outcome: "Succeeded",
    summary: "Created a Kubernetes connection after verification.",
    changes: [
      { field: "name", before: null, after: "Staging cluster" },
      { field: "identifier", before: null, after: "staging-cluster" },
      { field: "endpoint", before: null, after: "https://cluster.example.com" },
    ],
  },
  {
    id: "evt-1038",
    time: "2026-10-02T14:16:32Z",
    actor: "Sam Rivera",
    source: "API",
    action: "Updated",
    resource: "Service token",
    kind: "Secret",
    scope: "Engineering",
    outcome: "Succeeded",
    summary:
      "Rotated a secret value. Sensitive values are never included in this preview.",
    changes: [{ field: "value", before: "[REDACTED]", after: "[REDACTED]" }],
  },
  {
    id: "evt-1037",
    time: "2026-10-02T13:22:09Z",
    actor: "Alex Morgan",
    source: "Console",
    action: "Updated",
    resource: "Jamie Chen",
    kind: "Member",
    scope: "Engineering",
    outcome: "Succeeded",
    summary: "Changed the member role.",
    changes: [{ field: "role", before: "Reader", after: "Contributor" }],
  },
  {
    id: "evt-1036",
    time: "2026-10-01T19:08:45Z",
    actor: "Automation bot",
    source: "API",
    action: "Created",
    resource: "Security scanner",
    kind: "Connection",
    scope: "Checkout service",
    outcome: "Failed",
    summary: "Credential validation failed. No connection was created.",
    changes: [],
  },
  {
    id: "evt-1035",
    time: "2026-10-01T17:20:00Z",
    actor: "Alex Morgan",
    source: "Console",
    action: "Deleted",
    resource: "Legacy registry",
    kind: "Connection",
    scope: "Checkout service",
    outcome: "Succeeded",
    summary: "Removed an unused connection.",
    changes: [
      { field: "name", before: "Legacy registry", after: null },
      { field: "identifier", before: "legacy-registry", after: null },
    ],
  },
  {
    id: "evt-1034",
    time: "2026-10-01T14:02:12Z",
    actor: "Sam Rivera",
    source: "Console",
    action: "Created",
    resource: "Taylor Reed",
    kind: "Member",
    scope: "Engineering",
    outcome: "Succeeded",
    summary: "Invited a new organization member.",
    changes: [{ field: "role", before: null, after: "Reader" }],
  },
  {
    id: "evt-1033",
    time: "2026-09-30T12:30:00Z",
    actor: "Git sync bot",
    source: "Git sync",
    action: "Updated",
    resource: "Infrastructure automation",
    kind: "Connection",
    scope: "Checkout service",
    outcome: "Succeeded",
    summary: "Updated the connection display name.",
    changes: [
      {
        field: "name",
        before: "Terraform",
        after: "Infrastructure automation",
      },
    ],
  },
];
