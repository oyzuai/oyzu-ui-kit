import { useRef, useState } from "react";
import { Ellipsis, UserPlus, Eye, Pencil, Send, Trash2 } from "lucide-react";
import { PageLayout } from "@/components/patterns/page-layout";
import {
  ResourceTable,
  type ResourceColumn,
} from "@/components/patterns/resource-table";
import { SearchField } from "@/components/patterns/search-field";
import { FlowDialog } from "@/components/patterns/flow-dialog";
import { ConfirmAction } from "@/components/patterns/confirm-action";
import { FeedbackBanner } from "@/components/patterns/feedback-banner";
import {
  identifierFromName,
  suggestIdentifier,
} from "@/components/patterns/identity";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  initialMembers,
  roles,
  roleDescription,
  parseInvites,
  type Member,
  type MemberRole,
} from "./members-model";
import "./members-access.css";
type Action = { kind: "view" | "role" | "remove" | "resend"; id: string };
export function MembersAccess() {
  const [members, setMembers] = useState(initialMembers);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [action, setAction] = useState<Action | null>(null);
  const [draftRole, setDraftRole] = useState<MemberRole>("Reader");
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState("normal");
  const [inviting, setInviting] = useState(false);
  const [emails, setEmails] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("Reader");
  const [reviewInvites, setReviewInvites] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [batch, setBatch] = useState<string[]>([]);
  const origin = useRef<HTMLElement | null>(null);
  const fallback = useRef<HTMLHeadingElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const target = members.find((member) => member.id === action?.id);
  const filtered = members.filter(
    (member) =>
      (roleFilter === "all" || member.role === roleFilter) &&
      (statusFilter === "all" || member.status === statusFilter) &&
      `${member.name} ${member.email} ${member.id}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  async function simulate() {
    await new Promise((resolve) =>
      setTimeout(resolve, mode === "slow" ? 2500 : 450),
    );
    if (mode === "fail") {
      setMode("normal");
      throw Error(
        "The simulated action failed. Nothing changed. Your input is preserved; try again.",
      );
    }
  }
  function openAction(
    kind: Action["kind"],
    member: Member,
    source?: HTMLElement,
  ) {
    origin.current =
      source ?? document.getElementById("member-actions-" + member.id);
    setDraftRole(member.role);
    setAction({ kind, id: member.id });
  }
  function restoreFocus() {
    requestAnimationFrame(() => {
      (origin.current?.isConnected
        ? origin.current
        : fallback.current
      )?.focus();
    });
  }
  function resetFilters() {
    setQuery("");
    setRoleFilter("all");
    setStatusFilter("all");
  }
  const columns: ResourceColumn<Member>[] = [
    {
      key: "name",
      label: "Member",
      sortValue: (member) => member.name,
      render: (member) => (
        <div className="member-name">
          <button
            onClick={(event) => {
              origin.current = event.currentTarget;
              openAction("view", member, event.currentTarget);
            }}
            aria-label={"View access for " + member.name}
          >
            {member.name}
          </button>
          <span>{member.email}</span>
          <code>{member.id}</code>
          <span className="member-mobile-meta">
            {member.role} / {member.status === "Pending" ? "Invited" : "Active"}
          </span>
        </div>
      ),
    },
    {
      key: "role",
      label: "Organization role",
      sortValue: (member) => member.role,
      render: (member) => member.role,
    },
    {
      key: "status",
      label: "Status",
      sortValue: (member) => member.status,
      render: (member) => (
        <div>
          <span
            className={
              "member-status " +
              (member.status === "Pending" ? "member-pending" : "")
            }
          >
            {member.status === "Pending" ? "Invited" : member.status}
          </span>
          {member.resent > 0 && (
            <small className="member-resent">
              Resent {member.resent} {member.resent === 1 ? "time" : "times"}
            </small>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (member) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              id={"member-actions-" + member.id}
              aria-label={"Actions for " + member.name}
              onClick={(event) => {
                origin.current = event.currentTarget;
              }}
            >
              <Ellipsis />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            onCloseAutoFocus={(event) => {
              if (action) event.preventDefault();
            }}
          >
            <DropdownMenuItem onSelect={() => openAction("view", member)}>
              <Eye />
              View access
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openAction("role", member)}>
              <Pencil />
              Change role
            </DropdownMenuItem>
            {member.status === "Pending" && (
              <DropdownMenuItem onSelect={() => openAction("resend", member)}>
                <Send />
                Resend invitation
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => openAction("remove", member)}
            >
              <Trash2 />
              {member.status === "Pending"
                ? "Revoke invitation"
                : "Remove member"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
  return (
    <div className="members-page">
      <PageLayout
        eyebrow="ORGANIZATION / ENGINEERING"
        title="Members & access"
        description="The people in your organization and what they can access."
        actions={
          <FlowDialog
            trigger={
              <Button>
                <UserPlus size={15} />
                Invite people
              </Button>
            }
            title={reviewInvites ? "Review invitations" : "Invite people"}
            description="Invite people to the Engineering organization. No emails are sent in this preview."
            open={inviting}
            onOpenChange={(open) => {
              setInviting(open);
              if (open) {
                setEmails("");
                setInviteRole("Reader");
                setReviewInvites(false);
                setInviteError("");
                setBatch([]);
              }
            }}
            dirty={!!emails.trim() || inviteRole !== "Reader"}
            submitLabel={
              reviewInvites ? "Create invitations" : "Review invitations"
            }
            onBack={reviewInvites ? () => setReviewInvites(false) : undefined}
            onSubmit={async () => {
              const parsed = parseInvites(emails, members);
              setInviteError(parsed.error);
              if (parsed.error) {
                setReviewInvites(false);
                requestAnimationFrame(() => input.current?.focus());
                return;
              }
              if (!reviewInvites) {
                setBatch(parsed.emails);
                setReviewInvites(true);
                return;
              }
              await simulate();
              const used = members.map((member) => member.id);
              const additions: Member[] = parsed.emails.map((email) => {
                const id = suggestIdentifier(identifierFromName(email), used);
                used.push(id);
                return {
                  id,
                  name: email,
                  email,
                  role: inviteRole,
                  status: "Pending",
                  resent: 0,
                };
              });
              setMembers((previous) => [...previous, ...additions]);
              resetFilters();
              setNotice(
                `${additions.length} simulated ${additions.length === 1 ? "invitation" : "invitations"} created. No email was sent.`,
              );
              setInviting(false);
            }}
          >
            {reviewInvites ? (
              <div className="invite-review">
                <h3>
                  {batch.length}{" "}
                  {batch.length === 1 ? "invitation" : "invitations"}
                </h3>
                <ul>
                  {batch.map((email) => (
                    <li key={email}>{email}</li>
                  ))}
                </ul>
                <p>
                  <strong>{inviteRole}</strong> in Engineering
                </p>
                <p>
                  {roleDescription[inviteRole]} Access begins when the
                  invitation is accepted and is inherited by projects and
                  components in this example.
                </p>
              </div>
            ) : (
              <>
                <label htmlFor="invite-emails">Email addresses</label>
                <Textarea
                  id="invite-emails"
                  ref={input}
                  value={emails}
                  onChange={(event) => setEmails(event.target.value)}
                  aria-invalid={!!inviteError}
                  aria-describedby="invite-email-help"
                  placeholder="person@example.com"
                  rows={4}
                />
                <p
                  id="invite-email-help"
                  className={inviteError ? "field-error" : "field-hint"}
                  role={inviteError ? "alert" : undefined}
                >
                  {inviteError ||
                    "Separate addresses with commas or new lines. Up to 20 per invitation batch."}
                </p>
                <label className="member-select">
                  Organization role
                  <select
                    aria-label="Invitation role"
                    value={inviteRole}
                    onChange={(event) =>
                      setInviteRole(event.target.value as MemberRole)
                    }
                  >
                    {roles.map((role) => (
                      <option key={role}>{role}</option>
                    ))}
                  </select>
                </label>
                <p className="field-hint">{roleDescription[inviteRole]}</p>
              </>
            )}
          </FlowDialog>
        }
      >
        <p className="members-context">
          Fictional roles and scope inheritance for interaction review. No live
          permissions are changed.
        </p>
        {notice && (
          <FeedbackBanner
            tone="success"
            title={notice}
            onDismiss={() => setNotice("")}
          />
        )}
        <h2 className="sr-only" ref={fallback} tabIndex={-1}>
          Organization members
        </h2>
        <div className="members-toolbar">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search name, email or identifier…"
          />
          <label className="member-select">
            Role
            <select
              aria-label="Filter by role"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
            >
              <option value="all">All roles</option>
              {roles.map((role) => (
                <option key={role}>{role}</option>
              ))}
            </select>
          </label>
          <label className="member-select">
            Status
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="Active">Active</option>
              <option value="Pending">Invited</option>
            </select>
          </label>
        </div>
        {selected.length > 0 && (
          <div className="page-selection">
            <span>{selected.length} selected</span>
            <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
              Clear selection
            </Button>
          </div>
        )}
        <ResourceTable
          noun="members"
          label="Organization members table"
          rows={filtered}
          columns={columns}
          getId={(member) => member.id}
          getLabel={(member) => member.name}
          selected={selected}
          onSelectionChange={setSelected}
          pageSize={10}
          empty={
            <div className="page-empty">
              <h2>No matching members</h2>
              <p>Try another name or adjust your filters.</p>
              <Button variant="outline" onClick={resetFilters}>
                Clear filters
              </Button>
            </div>
          }
        />
        <div className="member-demo">
          <label className="member-select">
            Action behavior
            <select
              aria-label="Action behavior"
              value={mode}
              onChange={(event) => setMode(event.target.value)}
            >
              <option value="normal">Successful action</option>
              <option value="slow">Slow action</option>
              <option value="fail">Fail next action</option>
            </select>
          </label>
          <span>All changes last until refresh.</span>
        </div>
      </PageLayout>
      {target && action?.kind === "view" && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setAction(null);
          }}
        >
          <DialogContent
            className="resource-drawer member-drawer"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              restoreFocus();
            }}
          >
            <DialogHeader>
              <span className="eyebrow">MEMBER / ACCESS DETAILS</span>
              <DialogTitle>{target.name}</DialogTitle>
              <DialogDescription>
                {target.email} ·{" "}
                {target.status === "Pending"
                  ? "Invitation pending"
                  : "Active member"}
              </DialogDescription>
            </DialogHeader>
            <code className="member-identifier">{target.id}</code>
            <h3>
              {target.status === "Pending"
                ? "Access after acceptance"
                : "Access by scope"}
            </h3>
            {target.status === "Pending" && (
              <p className="field-hint">
                No organization access is active until the invitation is
                accepted.
              </p>
            )}
            <dl className="member-grants">
              {[
                {
                  scope: "Account",
                  name: "Acme account",
                  role: target.accountAccess ?? "No access",
                  source: target.accountAccess
                    ? "Separate account assignment"
                    : "No assignment",
                },
                {
                  scope: "Organization",
                  name: "Engineering",
                  role: target.role,
                  source: "Direct assignment",
                },
                {
                  scope: "Project",
                  name: "Developer tools",
                  role: target.role,
                  source: "Inherited from Engineering",
                },
                {
                  scope: "Component",
                  name: "Source control",
                  role: target.role,
                  source: "Inherited from Engineering",
                },
              ].map((grant) => (
                <div key={grant.scope}>
                  <dt>
                    <small>{grant.scope}</small>
                    <strong>{grant.name}</strong>
                  </dt>
                  <dd>
                    <strong>{grant.role}</strong>
                    <small>{grant.source}</small>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="field-hint">
              Example inheritance only. The platform’s authorization policy will
              define effective access.
            </p>
          </DialogContent>
        </Dialog>
      )}
      {target && action?.kind === "role" && (
        <FlowDialog
          key={"role/" + target.id}
          trigger={<span hidden />}
          open
          onOpenChange={(open) => {
            if (!open) setAction(null);
          }}
          title={"Change role for " + target.name}
          description="Review the scope and capabilities before saving."
          dirty={draftRole !== target.role}
          submitDisabled={draftRole === target.role}
          submitLabel="Save role"
          returnFocusRef={origin}
          onSubmit={async () => {
            await simulate();
            setMembers((previous) =>
              previous.map((member) =>
                member.id === target.id
                  ? { ...member, role: draftRole }
                  : member,
              ),
            );
            setNotice(
              `${target.name} now has the ${draftRole} role in Engineering.`,
            );
            setAction(null);
          }}
        >
          <label className="member-select">
            Organization role
            <select
              aria-label="New role"
              value={draftRole}
              onChange={(event) =>
                setDraftRole(event.target.value as MemberRole)
              }
            >
              {roles.map((role) => (
                <option key={role}>{role}</option>
              ))}
            </select>
          </label>
          <div className="role-impact" role="status">
            <h3>
              {target.role} → {draftRole}
            </h3>
            <p>{roleDescription[draftRole]}</p>
            <ul>
              <li>Engineering organization: changes to {draftRole}.</li>
              <li>
                Developer tools project and Source control component: inherited
                access changes to {draftRole}.
              </li>
              <li>Account access stays unchanged.</li>
            </ul>
            {target.status === "Pending" && (
              <p>Applies after this invitation is accepted.</p>
            )}
          </div>
        </FlowDialog>
      )}
      {target && action?.kind === "resend" && (
        <FlowDialog
          key={"resend/" + target.id}
          trigger={<span hidden />}
          open
          onOpenChange={(open) => {
            if (!open) setAction(null);
          }}
          title="Resend invitation"
          description={
            "Create a simulated reminder for " +
            target.email +
            ". No email will be sent."
          }
          dirty={false}
          submitLabel="Resend invitation"
          returnFocusRef={origin}
          onSubmit={async () => {
            await simulate();
            setMembers((previous) =>
              previous.map((member) =>
                member.id === target.id
                  ? { ...member, resent: member.resent + 1 }
                  : member,
              ),
            );
            setNotice(
              "Simulated invitation resent to " +
                target.email +
                ". No email was sent.",
            );
            setAction(null);
          }}
        >
          <p className="field-hint">
            The invitation keeps its current {target.role} role in Engineering.
          </p>
        </FlowDialog>
      )}
      {target && action?.kind === "remove" && (
        <ConfirmAction
          key={"remove/" + target.id}
          trigger={<span hidden />}
          open
          onOpenChange={(open) => {
            if (!open) setAction(null);
          }}
          returnFocusRef={origin}
          title={
            target.status === "Pending"
              ? "Revoke invitation for " + target.email + "?"
              : "Remove " + target.name + "?"
          }
          description={
            target.status === "Pending"
              ? "The pending invitation will be removed. It will no longer grant access if accepted in this example."
              : "Remove membership in Engineering and inherited access to its projects and components. Separate account access is unchanged. This action cannot be undone in this session."
          }
          actionLabel={
            target.status === "Pending" ? "Revoke invitation" : "Remove member"
          }
          onConfirm={async () => {
            await simulate();
            const name = target.name;
            const pending = target.status === "Pending";
            setMembers((previous) =>
              previous.filter((member) => member.id !== target.id),
            );
            setSelected((ids) => ids.filter((id) => id !== target.id));
            origin.current = fallback.current;
            setAction(null);
            setNotice(
              pending
                ? "Invitation revoked for " + name + "."
                : name + " removed from Engineering.",
            );
            requestAnimationFrame(() => fallback.current?.focus());
          }}
        />
      )}
    </div>
  );
}
