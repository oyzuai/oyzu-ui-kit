import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  FlaskConical,
  Layers3,
  Pencil,
  Plus,
  Settings2,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { FlowDialog } from "@/components/patterns/flow-dialog";
import { WizardDialog } from "@/components/patterns/wizard-dialog";
import { TextField } from "@/components/patterns/text-field";
import { IdentityFields } from "@/components/patterns/identity-fields";
import {
  identifierError,
  suggestIdentifier,
  type IdentityDraft,
} from "@/components/patterns/identity";
import {
  ConnectionCard,
  type DemoConnection,
} from "@/examples/connection-card";
import "./App.css";

type Workspace = { name: string; email: string; identifier: string };
type Setup = IdentityDraft & { access: "review" | "automatic" };
export type SaveMode = "normal" | "slow" | "fail";
const initialWorkspace = {
  name: "Acme Studio",
  email: "team@example.com",
  identifier: "acme-studio",
};
const blankSetup: Setup = {
  name: "",
  identifier: "",
  identifierSource: "automatic",
  access: "review",
};

export default function App({
  initialMode = "normal",
}: {
  initialMode?: SaveMode;
}) {
  const [workspace, setWorkspace] = useState<Workspace>(initialWorkspace);
  const [draft, setDraft] = useState(workspace);
  const [editing, setEditing] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [setup, setSetup] = useState<Setup>(blankSetup);
  const [connections, setConnections] = useState<DemoConnection[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<SaveMode>(initialMode);
  const [notice, setNotice] = useState("");
  const [notifications, setNotifications] = useState(true);
  const [tab, setTab] = useState("General");
  const [guide, setGuide] = useState(false);

  async function save() {
    await new Promise((resolve) =>
      setTimeout(resolve, mode === "slow" ? 3000 : 650),
    );
    if (mode === "fail")
      throw new Error(
        "We couldn’t save your changes. Your draft is safe. Try again when you’re ready.",
      );
  }
  function editOpen(open: boolean) {
    if (open) {
      setDraft(workspace);
      setErrors({});
    }
    setEditing(open);
  }
  function wizardOpen(open: boolean) {
    if (open) {
      setSetup(blankSetup);
      setErrors({});
    }
    setSetupOpen(open);
  }
  async function saveWorkspace() {
    const next: Record<string, string> = {};
    if (draft.name.trim().length < 2) next.name = "Use at least 2 characters.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim()))
      next.email = "Enter a valid email address.";
    setErrors(next);
    if (Object.keys(next).length) return;
    await save();
    setWorkspace({
      name: draft.name.trim(),
      email: draft.email.trim(),
      identifier: workspace.identifier,
    });
    setEditing(false);
    setNotice("Workspace details updated.");
  }
  const usedIdentifiers = connections.map((item) => item.identifier);
  const duplicate = usedIdentifiers.includes(setup.identifier);
  const currentIdentifierError = identifierError(setup.identifier);
  function validateConnection() {
    const next: Record<string, string> = {};
    if (setup.name.trim().length < 2)
      next.connection =
        "Give this connection a name with at least 2 characters.";
    if (currentIdentifierError) next.identifier = currentIdentifierError;
    else if (duplicate)
      next.identifier =
        "This identifier is already used by a connection in this workspace.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }
  async function createConnection() {
    if (!validateConnection())
      throw new Error("Check the name and identifier in the Details step.");
    await save();
    setConnections((items) => [
      ...items,
      {
        name: setup.name.trim(),
        identifier: setup.identifier,
        access: setup.access,
      },
    ]);
    setSetupOpen(false);
    setNotice("Connection created. You’re all set.");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#main" aria-label="Oyzu home">
          <img
            src="/brand/oyzu-full-logo-color.svg"
            alt="Oyzu"
            width="160"
            className="brand-logo"
          />
        </a>
        <div className="workspace-picker">
          <span className="workspace-avatar">AS</span>
          <div>
            <strong>{workspace.name}</strong>
            <small>Demo workspace</small>
          </div>
          <ChevronRight size={14} />
        </div>
        <span className="nav-caption">WORKSPACE</span>
        <button
          className="nav-item active"
          onClick={() => {
            setGuide(false);
            setTab("General");
          }}
        >
          <Settings2 size={17} /> Settings <span className="nav-indicator" />
        </button>
        <div className="sidebar-bottom">
          <span className="lab-icon">
            <FlaskConical size={17} />
          </span>
          <strong>A little room to experiment.</strong>
          <p>Our first patterns, taking shape.</p>
          <span className="version">
            UI KIT <span>0.1 / EXPLORATION</span>
          </span>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div>
            Workspace <ChevronRight size={13} />{" "}
            <span>{guide ? "Pattern notes" : "Settings"}</span>
          </div>
          <Badge variant="outline">
            <span className="status-dot" /> Component playground
          </Badge>
        </header>
        <main id="main">
          <div className="page-heading">
            <div>
              <span className="eyebrow">MAKE IT YOURS</span>
              <h1>{guide ? "Patterns in practice" : "Workspace settings"}</h1>
              <p>A thoughtful home for the way your team works.</p>
            </div>
            <Button variant="outline" onClick={() => setGuide(!guide)}>
              {guide ? "Back to settings" : "Pattern notes"}
              <ArrowUpRight size={15} />
            </Button>
          </div>
          {guide ? (
            <section className="settings-card notes">
              <span className="section-icon">
                <Layers3 />
              </span>
              <h2>Small details. Shared everywhere.</h2>
              <p>These are provisional patterns to explore together.</p>
              <h3>Edit with confidence</h3>
              <p>
                Keep edits in a draft. Validate fields before saving, preserve
                input after a failure, and confirm before discarding changes.
              </p>
              <h3>One decision at a time</h3>
              <p>
                Break setup into short steps. Keep answers when moving back and
                give people a summary before they commit.
              </p>
              <h3>Make the system visible</h3>
              <p>
                Show progress while saving, explain errors plainly, and announce
                successful changes. Try each state in the playground below.
              </p>
            </section>
          ) : (
            <>
              <div
                className="tabs"
                role="tablist"
                aria-label="Settings sections"
              >
                {["General", "Preferences"].map((item) => (
                  <button
                    key={item}
                    id={"tab-" + item}
                    role="tab"
                    aria-selected={tab === item}
                    aria-controls={"panel-" + item}
                    tabIndex={tab === item ? 0 : -1}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                        const next =
                          item === "General" ? "Preferences" : "General";
                        setTab(next);
                        document.getElementById("tab-" + next)?.focus();
                      }
                    }}
                    onClick={() => setTab(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div
                role="tabpanel"
                id={"panel-" + tab}
                aria-labelledby={"tab-" + tab}
              >
                {tab === "General" ? (
                  <>
                    <section className="settings-card">
                      <div className="card-heading">
                        <div className="title-with-icon">
                          <span className="section-icon">
                            <Layers3 size={19} />
                          </span>
                          <div>
                            <h2>Workspace details</h2>
                            <p>The essentials that make this space yours.</p>
                          </div>
                        </div>
                        <FlowDialog
                          title="Edit workspace"
                          description="Update the details your team sees across the workspace."
                          trigger={
                            <Button variant="outline">
                              <Pencil size={14} />
                              Edit details
                            </Button>
                          }
                          open={editing}
                          onOpenChange={editOpen}
                          dirty={
                            draft.name.trim() !== workspace.name ||
                            draft.email.trim() !== workspace.email
                          }
                          submitLabel="Save changes"
                          submitDisabled={
                            draft.name.trim() === workspace.name &&
                            draft.email.trim() === workspace.email
                          }
                          onSubmit={saveWorkspace}
                        >
                          <IdentityFields
                            mode="saved"
                            nameLabel="Workspace name"
                            value={draft}
                            onNameChange={(name) =>
                              setDraft({ ...draft, name })
                            }
                            nameError={errors.name}
                          />
                          <TextField
                            label="Contact email"
                            value={draft.email}
                            onChange={(email) => setDraft({ ...draft, email })}
                            error={errors.email}
                            inputMode="email"
                            maxLength={254}
                            hint="Where workspace updates will be sent."
                          />
                        </FlowDialog>
                      </div>
                      <div className="details-grid">
                        <div>
                          <span>Workspace name</span>
                          <strong>{workspace.name}</strong>
                        </div>
                        <div>
                          <span>Contact email</span>
                          <strong>{workspace.email}</strong>
                        </div>
                        <div>
                          <span>Workspace identifier</span>
                          <code>{workspace.identifier}</code>
                        </div>
                      </div>
                      <div className="card-foot">
                        <ShieldCheck size={14} /> Visible to members of your
                        workspace.
                      </div>
                    </section>
                    <section className="settings-card">
                      <div className="card-heading">
                        <div className="title-with-icon">
                          <span className="section-icon">
                            <Workflow size={19} />
                          </span>
                          <div>
                            <h2>
                              Connections{" "}
                              <span className="count">
                                {connections.length}
                              </span>
                            </h2>
                            <p>Bring your tools into one shared workflow.</p>
                          </div>
                        </div>
                        <Badge variant="secondary">Preview</Badge>
                      </div>
                      {connections.length ? (
                        connections.map((connection) => (
                          <ConnectionCard
                            key={connection.identifier}
                            connection={connection}
                            onRename={async (name) => {
                              await save();
                              setConnections((items) =>
                                items.map((item) =>
                                  item.identifier === connection.identifier
                                    ? { ...item, name }
                                    : item,
                                ),
                              );
                              setNotice(
                                "Connection name updated. Identifier unchanged.",
                              );
                            }}
                          />
                        ))
                      ) : (
                        <div className="empty-state">
                          <div className="connection-art">
                            <span />
                            <Workflow size={30} />
                            <span />
                          </div>
                          <h3>Good work starts with a connection.</h3>
                          <p>
                            Set up your first connection in a few small steps.
                            <br />
                            We’ll walk you through it.
                          </p>
                        </div>
                      )}
                      <div className="connection-action">
                        <WizardDialog
                          trigger={
                            <Button
                              variant={
                                connections.length ? "outline" : "default"
                              }
                            >
                              <Plus size={15} />
                              {connections.length
                                ? "Add another connection"
                                : "Set up a connection"}
                            </Button>
                          }
                          open={setupOpen}
                          onOpenChange={wizardOpen}
                          dirty={
                            setup.name !== "" ||
                            setup.identifier !== "" ||
                            setup.access !== "review"
                          }
                          submitLabel="Create connection"
                          onComplete={createConnection}
                          steps={[
                            {
                              label: "Details",
                              title: "Name your connection",
                              description:
                                "Start with a name your team will recognize.",
                              validate: validateConnection,
                              content: (
                                <IdentityFields
                                  mode="create"
                                  nameLabel="Connection name"
                                  value={setup}
                                  onChange={(identity) => {
                                    setSetup({ ...setup, ...identity });
                                    setErrors({});
                                  }}
                                  nameError={errors.connection}
                                  identifierError={
                                    duplicate
                                      ? "This identifier is already used by a connection in this workspace."
                                      : errors.identifier ||
                                        (setup.identifierSource === "custom"
                                          ? currentIdentifierError
                                          : undefined)
                                  }
                                  suggestedIdentifier={
                                    duplicate
                                      ? suggestIdentifier(
                                          setup.identifier,
                                          usedIdentifiers,
                                        )
                                      : undefined
                                  }
                                />
                              ),
                            },
                            {
                              label: "Behavior",
                              title: "Choose how it works",
                              description:
                                "Decide how changes move through your workspace.",
                              content: (
                                <fieldset className="choice-group">
                                  <legend>Change handling</legend>
                                  {(["review", "automatic"] as const).map(
                                    (access) => (
                                      <label
                                        className={
                                          "choice " +
                                          (setup.access === access
                                            ? "selected"
                                            : "")
                                        }
                                        key={access}
                                      >
                                        <input
                                          type="radio"
                                          name="access"
                                          value={access}
                                          checked={setup.access === access}
                                          onChange={() =>
                                            setSetup({ ...setup, access })
                                          }
                                        />
                                        <span>
                                          <strong>
                                            {access === "review"
                                              ? "Review before applying"
                                              : "Apply automatically"}
                                          </strong>
                                          <small>
                                            {access === "review"
                                              ? "Give your team a chance to approve each change."
                                              : "Keep things moving without a manual review."}
                                          </small>
                                        </span>
                                        {access === "review" && (
                                          <Badge variant="secondary">
                                            Recommended
                                          </Badge>
                                        )}
                                      </label>
                                    ),
                                  )}
                                </fieldset>
                              ),
                            },
                            {
                              label: "Review",
                              title: "Ready when you are",
                              description:
                                "Take a moment to review your choices.",
                              content: (
                                <div className="review">
                                  <span className="review-icon">
                                    <Sparkles size={23} />
                                  </span>
                                  <h3>Everything in its place.</h3>
                                  <dl>
                                    <div>
                                      <dt>Connection</dt>
                                      <dd>{setup.name}</dd>
                                    </div>
                                    <div>
                                      <dt>Identifier</dt>
                                      <dd>
                                        <code>{setup.identifier}</code>
                                      </dd>
                                    </div>
                                    <div>
                                      <dt>Change handling</dt>
                                      <dd>
                                        {setup.access === "review"
                                          ? "Review before applying"
                                          : "Apply automatically"}
                                      </dd>
                                    </div>
                                  </dl>
                                  <p>
                                    This playground creates a demo connection.
                                    No external account is connected.
                                  </p>
                                </div>
                              ),
                            },
                          ]}
                        />
                      </div>
                    </section>
                    <div className="gentle-note">
                      <span>✳</span>
                      <p>
                        Built for the details.
                        <small>
                          Consistent patterns make the whole workspace feel
                          familiar.
                        </small>
                      </p>
                    </div>
                  </>
                ) : (
                  <section className="settings-card">
                    <div className="card-heading">
                      <div>
                        <h2>Notifications</h2>
                        <p>A little less noise. The updates that matter.</p>
                      </div>
                    </div>
                    <div className="preference-row">
                      <div>
                        <label htmlFor="notifications">Workspace updates</label>
                        <p>
                          Receive a summary of activity in this demo workspace.
                        </p>
                      </div>
                      <Switch
                        id="notifications"
                        checked={notifications}
                        onCheckedChange={(value) => {
                          setNotifications(value);
                          setNotice(
                            "Notification preference updated for this session.",
                          );
                        }}
                      />
                    </div>
                  </section>
                )}
              </div>
            </>
          )}
          <section className="playground">
            <div>
              <FlaskConical size={17} />
              <strong>Interaction playground</strong>
              <span>Try the edges.</span>
            </div>
            <label>
              Save behavior
              <select
                aria-label="Save behavior"
                value={mode}
                onChange={(e) => setMode(e.target.value as SaveMode)}
              >
                <option value="normal">Successful save</option>
                <option value="slow">Slow save · 3 seconds</option>
                <option value="fail">Failed save</option>
              </select>
            </label>
            <p>Sample data only. Changes last until you refresh.</p>
          </section>
          <footer className="page-footer">
            <span>OYZU / DESIGN IN PROGRESS</span>
            <span>Made to feel like second nature.</span>
          </footer>
        </main>
      </div>
      <div className={"toast " + (notice ? "visible" : "")} role="status">
        {notice && (
          <>
            <Check size={16} />
            <span>{notice}</span>
            <button
              aria-label="Dismiss notification"
              onClick={() => setNotice("")}
            >
              ×
            </button>
          </>
        )}
      </div>
    </div>
  );
}
