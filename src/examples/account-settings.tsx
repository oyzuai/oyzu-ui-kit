import { useState } from "react";
import {
  Bell,
  UserRound,
  ShieldCheck,
  KeyRound,
  Monitor,
  Smartphone,
} from "lucide-react";
import {
  SectionNavigation,
  type SectionLink,
} from "@/components/patterns/section-navigation";
import { TextField } from "@/components/patterns/text-field";
import { SettingRow } from "@/components/patterns/setting-row";
import { ConfirmAction } from "@/components/patterns/confirm-action";
import { FeedbackBanner } from "@/components/patterns/feedback-banner";
import { EmptyState } from "@/components/patterns/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import "@/components/patterns/catalog.css";
import "./account-settings.css";
const sections: SectionLink[] = [
  {
    id: "profile",
    label: "Profile",
    description: "Your name and details",
    href: "#account/profile",
    icon: <UserRound />,
  },
  {
    id: "security",
    label: "Security",
    description: "Sign-in and sessions",
    href: "#account/security",
    icon: <ShieldCheck />,
  },
  {
    id: "api-keys",
    label: "API keys",
    description: "Personal access",
    href: "#account/api-keys",
    icon: <KeyRound />,
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "What reaches you",
    href: "#account/notifications",
    icon: <Bell />,
  },
];
export function AccountSettings({
  section,
  profile,
  onProfileSave,
  draft,
  onDraftChange,
}: {
  draft?: { name: string; email: string };
  onDraftChange?: (draft: { name: string; email: string }) => void;
  section: string;
  profile?: { name: string; email: string };
  onProfileSave?: (profile: { name: string; email: string }) => void;
}) {
  const current = sections.find((item) => item.id === section) ?? sections[0];
  const [savedName, setSavedName] = useState(profile?.name ?? "Alex Morgan");
  const [name, setName] = useState(draft?.name ?? savedName);
  const [email, setEmail] = useState(
    draft?.email ?? profile?.email ?? "alex@example.com",
  );
  const [savedEmail, setSavedEmail] = useState(
    profile?.email ?? "alex@example.com",
  );
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sessions, setSessions] = useState(true);
  const [keys, setKeys] = useState(["local-development", "automation-preview"]);
  const [digest, setDigest] = useState(true);
  const [mentions, setMentions] = useState(true);
  const dirty = name !== savedName || email !== savedEmail;
  return (
    <div className="account-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR SPACE</span>
          <h1>Account settings</h1>
          <p>A few details that make this space yours.</p>
        </div>
        <Badge variant="outline">Interactive example</Badge>
      </div>
      <div className="account-layout">
        <aside className="account-sidebar">
          <div className="account-person">
            <span className="account-avatar">
              {savedName
                .split(" ")
                .map((word) => word[0])
                .slice(0, 2)
                .join("")}
            </span>
            <strong>{savedName}</strong>
            <small>@alex-morgan</small>
          </div>
          <SectionNavigation
            label="Account sections"
            items={sections}
            active={current.id}
            onNavigate={(href) => {
              window.location.hash = href;
            }}
          />
          <p className="account-demo-note">
            Fictional account. Changes stay in this preview session.
          </p>
        </aside>
        <section
          className="account-content"
          aria-labelledby="account-section-title"
        >
          <header className="account-section-heading">
            <span className="account-section-icon">{current.icon}</span>
            <div>
              <h2 id="account-section-title">{current.label}</h2>
              <p>{current.description}</p>
            </div>
          </header>
          {notice && (
            <FeedbackBanner
              tone="success"
              title={notice}
              onDismiss={() => setNotice("")}
            />
          )}
          {current.id === "profile" && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (
                  name.trim().length < 2 ||
                  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
                ) {
                  setError("Enter a name and a valid email address.");
                  return;
                }
                onProfileSave?.({ name: name.trim(), email: email.trim() });
                setSavedName(name.trim());
                setName(name.trim());
                setSavedEmail(email.trim());
                setEmail(email.trim());
                onDraftChange?.({ name: name.trim(), email: email.trim() });
                setError("");
                setNotice("Example profile saved.");
              }}
            >
              <div className="account-fields">
                <TextField
                  label="Full name"
                  value={name}
                  onChange={(value) => {
                    setName(value);
                    onDraftChange?.({ name: value, email });
                  }}
                  labelAccessory={
                    <code className="account-identifier">alex-morgan</code>
                  }
                  hint="The name people see across your workspace."
                />
                <TextField
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={(value) => {
                    setEmail(value);
                    onDraftChange?.({ name, email: value });
                  }}
                />
                {error && (
                  <p role="alert" className="field-error">
                    {error}
                  </p>
                )}
              </div>
              <footer className="account-form-footer">
                <span>
                  {dirty
                    ? "You have unsaved changes."
                    : "Your profile is up to date."}
                </span>
                <div>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={!dirty}
                    onClick={() => {
                      setName(savedName);
                      setEmail(savedEmail);
                      onDraftChange?.({ name: savedName, email: savedEmail });
                      setError("");
                    }}
                  >
                    Reset
                  </Button>
                  <Button type="submit" disabled={!dirty}>
                    Save profile
                  </Button>
                </div>
              </footer>
            </form>
          )}
          {current.id === "security" && (
            <div className="account-fields">
              <div className="account-info-row">
                <div>
                  <h3>Sign-in method</h3>
                  <p>
                    This example account uses your organization’s single
                    sign-on.
                  </p>
                </div>
                <Badge variant="outline">SSO</Badge>
              </div>
              <div>
                <h3>Active sessions</h3>
                <p className="account-description">
                  Devices currently signed in to this example account.
                </p>
              </div>
              <div className="account-device">
                <Monitor size={20} />
                <div>
                  <strong>Chrome on desktop</strong>
                  <p>Current session</p>
                </div>
                <Badge variant="outline">This device</Badge>
              </div>
              {sessions ? (
                <div className="account-device">
                  <Smartphone size={20} />
                  <div>
                    <strong>Safari on iPhone</strong>
                    <p>Last active 2 hours ago</p>
                  </div>
                  <ConfirmAction
                    title="Sign out this device?"
                    description="This removes the fictional mobile session from the preview."
                    actionLabel="Sign out"
                    trigger={
                      <Button variant="outline" size="sm">
                        Sign out
                      </Button>
                    }
                    onConfirm={async () => {
                      setSessions(false);
                      setNotice("Example mobile session signed out.");
                    }}
                  />
                </div>
              ) : (
                <p className="account-description">No other sessions.</p>
              )}
            </div>
          )}
          {current.id === "api-keys" && (
            <div className="account-fields">
              <FeedbackBanner
                tone="info"
                title="Personal access, under your control"
              >
                These are sample key records, not usable credentials. Real keys
                would only be revealed once when created.
              </FeedbackBanner>
              {keys.length ? (
                keys.map((key, i) => (
                  <div className="account-key" key={key}>
                    <KeyRound size={19} />
                    <div>
                      <strong>
                        {key === "local-development"
                          ? "Local development"
                          : "Automation preview"}
                      </strong>
                      <code>{key}</code>
                      <p>•••• •••• {i ? "82fa" : "3e71"} · Read only</p>
                    </div>
                    <ConfirmAction
                      title="Revoke this key?"
                      description={`Remove ${key} from the example account. You can reset the sample records below.`}
                      actionLabel="Revoke key"
                      trigger={
                        <Button variant="outline" size="sm">
                          Revoke
                        </Button>
                      }
                      onConfirm={async () => {
                        setKeys((items) =>
                          items.filter((item) => item !== key),
                        );
                        setNotice("Example key revoked.");
                      }}
                    />
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No API keys"
                  description="You’ve removed all sample keys."
                />
              )}
              <Button
                variant="ghost"
                onClick={() => {
                  setKeys(["local-development", "automation-preview"]);
                  setNotice("");
                }}
              >
                Reset sample keys
              </Button>
            </div>
          )}
          {current.id === "notifications" && (
            <div className="account-fields">
              <p className="account-description">
                Choose which updates you want. Preferences apply immediately in
                this preview.
              </p>
              <SettingRow
                title="Mentions and replies"
                description="When someone brings you into a conversation."
                checked={mentions}
                onCheckedChange={setMentions}
              />
              <SettingRow
                title="Weekly summary"
                description="A short digest of activity across your workspace."
                checked={digest}
                onCheckedChange={setDigest}
              />
              <SettingRow
                title="Security alerts"
                description="Critical account updates are always enabled."
                checked
                disabled
                onCheckedChange={() => {}}
                badge={<Badge variant="outline">Required</Badge>}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
