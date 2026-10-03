export type ConnectionConfig = {
  name: string;
  identifier: string;
  endpoint: string;
  secretReference: string;
  reviewChanges: boolean;
};
export type Revision = {
  number: number;
  at: string;
  actor: string;
  source: string;
  message: string;
  config: ConnectionConfig;
};
const base: ConnectionConfig = {
  name: "Production GitHub",
  identifier: "production-github",
  endpoint: "https://github.example.com",
  secretReference: "org/github-token-v1",
  reviewChanges: true,
};
export const initialRevisions: Revision[] = [
  {
    number: 1,
    at: "2026-10-01T10:00:00Z",
    actor: "Alex Morgan",
    source: "Console",
    message: "Created connection",
    config: { ...base },
  },
  {
    number: 2,
    at: "2026-10-02T12:30:00Z",
    actor: "Git sync bot",
    source: "Git",
    message: "Use the public API endpoint",
    config: { ...base, endpoint: "https://api.github.com" },
  },
  {
    number: 3,
    at: "2026-10-03T09:10:00Z",
    actor: "Sam Rivera",
    source: "Console",
    message: "Rotate credential reference",
    config: {
      ...base,
      endpoint: "https://api.github.com",
      secretReference: "project/github-token-v2",
    },
  },
];
export function validateConfig(value: ConnectionConfig) {
  if (value.identifier !== "production-github")
    throw Error("The saved identifier cannot change.");
  if (value.name.trim().length < 2)
    throw Error("Use a name with at least two characters.");
  const url = new URL(value.endpoint);
  if (url.protocol !== "https:" || url.username || url.password)
    throw Error("Use an HTTPS endpoint without embedded credentials.");
  if (
    !["org/github-token-v1", "project/github-token-v2"].includes(
      value.secretReference,
    )
  )
    throw Error("Choose an available secret reference.");
}
