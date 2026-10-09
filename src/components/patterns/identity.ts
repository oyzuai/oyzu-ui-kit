/** Provisional UI policy, not an authoritative platform schema. */
export type EntityIdentity = { name: string; identifier: string };
export type IdentityDraft = EntityIdentity & {
  identifierSource: "automatic" | "custom";
};

export function identifierFromName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63)
    .replace(/-+$/g, "");
}
export function identifierError(identifier: string): string | undefined {
  if (!identifier)
    return "Enter an identifier using lowercase letters or numbers.";
  if (identifier.length > 63) return "Use 63 characters or fewer.";
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(identifier))
    return "Use lowercase letters, numbers or hyphens. Start and end with a letter or number.";
}
export function suggestIdentifier(
  identifier: string,
  used: readonly string[],
): string {
  if (!used.includes(identifier)) return identifier;
  for (let suffix = 2; ; suffix++) {
    const tail = "-" + suffix;
    const candidate =
      identifier.slice(0, 63 - tail.length).replace(/-+$/g, "") + tail;
    if (!used.includes(candidate)) return candidate;
  }
}
