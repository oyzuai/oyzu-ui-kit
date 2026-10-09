import { useState } from "react";
import { ArrowRight, Building2, FolderOpen, Mail } from "lucide-react";
import { Button } from "../components/ui/button";
import type { NavigationContext } from "../components/patterns/active-context";
import { organizations } from "./workspace-data";

export function WorkspaceArrival({
  invitation,
  onEnter,
  onBack,
}: {
  invitation: boolean;
  onEnter: (value: NavigationContext) => void;
  onBack: () => void;
}) {
  const [invite, setInvite] = useState(invitation);
  const [org, setOrg] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [outcome, setOutcome] = useState("success");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function accept() {
    setPending(true);
    setError("");
    await new Promise((resolve) => setTimeout(resolve, 600));
    setPending(false);
    if (outcome !== "success") {
      setError(
        outcome === "expired"
          ? "This invitation has expired. Ask Jordan Lee for a new invitation."
          : "We couldn’t accept the invitation. Try again.",
      );
      return;
    }
    onEnter({ organization: "Engineering", project: "Checkout service" });
  }
  return (
    <div className="workspace-arrival">
      <span className="eyebrow">
        {invite ? "YOU’RE INVITED" : "YOUR WORKSPACES"}
      </span>
      <h1>{invite ? "Build with your team." : (org ?? "Where to next?")}</h1>
      {invite ? (
        <>
          <p>Jordan Lee invited you to join Engineering.</p>
          <div className="arrival-invite">
            <Mail size={24} />
            <div>
              <strong>Engineering</strong>
              <p>Checkout service · Project member</p>
              <small>Invitation for alex@example.com</small>
            </div>
          </div>
          <p className="session-caption">
            As a project member, you can collaborate on resources in Checkout
            service. Organization administration is not included.
          </p>
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
          <div className="session-actions">
            <Button
              disabled={pending || (outcome === "expired" && !!error)}
              onClick={accept}
            >
              {pending ? "Joining workspace…" : "Accept invitation"}
              <ArrowRight />
            </Button>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => {
                setInvite(false);
                setError("");
              }}
            >
              Not now
            </Button>
          </div>
          <div className="signin-preview">
            <label htmlFor="invitation-outcome">Invitation preview</label>
            <select
              id="invitation-outcome"
              disabled={pending}
              value={outcome}
              onChange={(e) => {
                setOutcome(e.target.value);
                setError("");
              }}
            >
              <option value="success">Valid invitation</option>
              <option value="expired">Expired invitation</option>
              <option value="failure">Temporary failure</option>
            </select>
          </div>
        </>
      ) : (
        <>
          <p>
            {org
              ? "Choose a project, or open the organization overview."
              : "Choose an organization to find your projects."}
          </p>
          {org && (
            <Button
              variant="ghost"
              onClick={() => {
                setOrg(null);
                setQuery("");
              }}
            >
              All organizations
            </Button>
          )}
          <label className="arrival-search">
            {org ? "Find a project" : "Find an organization"}
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
            />
          </label>
          <div className="arrival-options">
            {org ? (
              <>
                <button
                  onClick={() => onEnter({ organization: org, project: null })}
                >
                  <Building2 />
                  <span>
                    <strong>Organization overview</strong>
                    <small>{org}</small>
                  </span>
                  <ArrowRight />
                </button>
                {organizations
                  .find((o) => o.name === org)!
                  .projects.filter((p) =>
                    p.toLowerCase().includes(query.toLowerCase()),
                  )
                  .map((p) => (
                    <button
                      key={p}
                      onClick={() => onEnter({ organization: org, project: p })}
                    >
                      <FolderOpen />
                      <span>
                        <strong>{p}</strong>
                        <small>Project</small>
                      </span>
                      <ArrowRight />
                    </button>
                  ))}
                {!organizations
                  .find((o) => o.name === org)!
                  .projects.filter((p) =>
                    p.toLowerCase().includes(query.toLowerCase()),
                  ).length && (
                  <p className="session-caption">
                    {query
                      ? "No matching projects."
                      : "No projects yet. Open the organization to get started."}
                  </p>
                )}
              </>
            ) : (
              organizations
                .filter((o) =>
                  o.name.toLowerCase().includes(query.toLowerCase()),
                )
                .map((o) => (
                  <button
                    key={o.name}
                    onClick={() => {
                      setOrg(o.name);
                      setQuery("");
                    }}
                  >
                    <Building2 />
                    <span>
                      <strong>{o.name}</strong>
                      <small>{o.projects.length} projects</small>
                    </span>
                    <ArrowRight />
                  </button>
                ))
            )}
            {!org &&
              !organizations.some((o) =>
                o.name.toLowerCase().includes(query.toLowerCase()),
              ) && <p>No matching organizations.</p>}
          </div>
        </>
      )}
      <Button variant="ghost" disabled={pending} onClick={onBack}>
        Use another account
      </Button>
      <p className="session-caption">
        Fictional memberships and invitations. Nothing is sent or changed
        outside this preview.
      </p>
    </div>
  );
}
