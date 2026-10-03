export type MemberRole = "Reader" | "Contributor" | "Administrator";
export type Member = {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  status: "Active" | "Pending";
  resent: number;
  accountAccess?: string;
};
export const roles: MemberRole[] = ["Reader", "Contributor", "Administrator"];
export const roleDescription: Record<MemberRole, string> = {
  Reader: "View resources and activity.",
  Contributor: "View resources and activity, and create or edit resources.",
  Administrator: "Manage resources, members and workspace settings.",
};
export const initialMembers: Member[] = [
  {
    id: "alex-morgan",
    name: "Alex Morgan",
    email: "alex@example.com",
    role: "Administrator",
    status: "Active",
    resent: 0,
    accountAccess: "Reader",
  },
  {
    id: "sam-rivera",
    name: "Sam Rivera",
    email: "sam@example.com",
    role: "Contributor",
    status: "Active",
    resent: 0,
  },
  {
    id: "jamie-chen",
    name: "Jamie Chen",
    email: "jamie@example.com",
    role: "Reader",
    status: "Active",
    resent: 0,
  },
  {
    id: "taylor-reed",
    name: "Taylor Reed",
    email: "taylor@example.com",
    role: "Contributor",
    status: "Pending",
    resent: 0,
  },
];
export function parseInvites(
  text: string,
  existing: readonly Member[],
): { emails: string[]; error: string } {
  const emails = text
    .split(/[\s,;]+/)
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (!emails.length)
    return { emails, error: "Enter at least one email address." };
  if (emails.length > 20)
    return { emails, error: "Invite up to 20 people at a time." };
  const invalid = emails.filter(
    (email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  );
  if (invalid.length)
    return {
      emails,
      error: "Check these email addresses: " + invalid.join(", "),
    };
  if (new Set(emails).size !== emails.length)
    return {
      emails,
      error: "Remove duplicate email addresses before continuing.",
    };
  const duplicates = emails.filter((email) =>
    existing.some((member) => member.email.toLowerCase() === email),
  );
  return {
    emails,
    error: duplicates.length
      ? "Already a member or invited: " + duplicates.join(", ")
      : "",
  };
}
