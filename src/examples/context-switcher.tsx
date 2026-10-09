import { useState } from "react";
import { Building2, ChevronDown, Check, FolderOpen } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "../components/ui/alert-dialog";
import type { NavigationContext } from "../components/patterns/active-context";
import "./context-switcher.css";
import { organizations } from "./workspace-data";
export function ContextSwitcher({
  value,
  onChange,
  dirty,
  busy,
  compact = false,
}: {
  value: NavigationContext;
  onChange: (next: NavigationContext) => void;
  dirty: boolean;
  busy: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [org, setOrg] = useState(value.organization),
    [query, setQuery] = useState(""),
    [pending, setPending] = useState<NavigationContext | null>(null);
  const projects = organizations
    .find((o) => o.name === org)!
    .projects.filter((p) => p.toLowerCase().includes(query.toLowerCase()));
  function choose(next: NavigationContext) {
    if (busy) return;
    if (
      next.organization === value.organization &&
      next.project === value.project
    ) {
      setOpen(false);
      return;
    }
    if (dirty) setPending(next);
    else {
      onChange(next);
      setOpen(false);
    }
  }
  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) {
            setOrg(value.organization);
            setQuery("");
          }
        }}
      >
        <DialogTrigger asChild>
          <button
            className={"context-trigger" + (compact ? " compact" : "")}
            aria-label={`Switch context: ${value.organization}${value.project ? " / " + value.project : " / Organization"}`}
            title={`${value.organization} / ${value.project ?? "Organization"}`}
          >
            <Building2 size={18} />
            {!compact && (
              <>
                <span>
                  <small>{value.organization}</small>
                  <strong>{value.project ?? "Organization overview"}</strong>
                </span>
                <ChevronDown size={14} />
              </>
            )}
          </button>
        </DialogTrigger>
        <DialogContent className="context-dialog">
          <DialogTitle>Switch context</DialogTitle>
          <DialogDescription>
            Choose an organization or a project within it.
          </DialogDescription>
          <div className="context-current">
            Current: {value.organization} / {value.project ?? "Organization"}
          </div>
          <div className="context-columns">
            <nav aria-label="Organizations">
              {organizations.map((o) => (
                <button
                  aria-pressed={org === o.name}
                  key={o.name}
                  onClick={() => {
                    setOrg(o.name);
                    setQuery("");
                  }}
                >
                  <Building2 size={16} />
                  {o.name}
                </button>
              ))}
            </nav>
            <section>
              <button
                className="context-org-option"
                disabled={busy}
                onClick={() => choose({ organization: org, project: null })}
              >
                <Building2 size={17} />
                <span>
                  <strong>{org}</strong>
                  <small>Organization overview</small>
                </span>
                {value.organization === org && !value.project && (
                  <Check size={15} />
                )}
              </button>
              <label className="context-search">
                Find a project
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search projects…"
                />
              </label>
              <div className="context-projects">
                {projects.map((p) => (
                  <button
                    key={p}
                    disabled={busy}
                    onClick={() => choose({ organization: org, project: p })}
                  >
                    <FolderOpen size={16} />
                    <span>{p}</span>
                    {value.organization === org && value.project === p && (
                      <Check size={15} />
                    )}
                  </button>
                ))}
                {!projects.length && (
                  <p>
                    {query
                      ? "No matching projects."
                      : "No projects in this organization."}
                  </p>
                )}
              </div>
            </section>
          </div>
          {busy && (
            <p role="status">
              Wait for the current operation to finish before switching.
            </p>
          )}
          <p className="context-demo">
            Fictional contexts. Switching resets the page's preview data.
          </p>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!pending}
        onOpenChange={(next) => {
          if (!next) setPending(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>
            Switch context and discard changes?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Your unfinished draft belongs to the current context. Stay here to
            keep editing, or discard it and switch.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pending) {
                  onChange(pending);
                  setPending(null);
                  setOpen(false);
                }
              }}
            >
              Discard and switch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
