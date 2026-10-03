import type {
  SecretReference,
  SecretScope,
} from "@/components/patterns/secret-selector";
export const scopes: SecretScope[] = [
  "account",
  "organization",
  "project",
  "component",
];
export const secretSamples: SecretReference[] = scopes.flatMap((scope) => [
  {
    id: scope + "/service-token",
    identifier: "service-token",
    name: "Service token",
    scope,
    scopeName: {
      account: "Acme account",
      organization: "Engineering",
      project: "Developer tools",
      component: "Source control",
    }[scope],
  },
  {
    id: scope + "/service-password",
    identifier: "service-password",
    name: "Service password",
    scope,
    scopeName: {
      account: "Acme account",
      organization: "Engineering",
      project: "Developer tools",
      component: "Source control",
    }[scope],
  },
]);
// Example lineage, not an authorization implementation. Production supplies authorized references.
export function referencesFor(scope: SecretScope) {
  return secretSamples.filter(
    (item) => scopes.indexOf(item.scope) <= scopes.indexOf(scope),
  );
}
