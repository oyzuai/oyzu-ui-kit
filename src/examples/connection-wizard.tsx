import { useEffect, useRef, useState } from "react";
import { PageLayout } from "@/components/patterns/page-layout";
import { IdentityFields } from "@/components/patterns/identity-fields";
import {
  identifierError,
  type IdentityDraft,
} from "@/components/patterns/identity";
import { TextField } from "@/components/patterns/text-field";
import {
  SecretSelector,
  type SecretScope,
} from "@/components/patterns/secret-selector";
import { SettingRow } from "@/components/patterns/setting-row";
import { FeedbackBanner } from "@/components/patterns/feedback-banner";
import { Button } from "@/components/ui/button";
import { referencesFor, scopes } from "./secret-samples";
import "./connection-wizard.css";
const labels = ["Basics", "Authentication", "Behavior", "Review & test"];
export function ConnectionWizard({
  onStateChange,
}: {
  onStateChange: (dirty: boolean, busy: boolean) => void;
}) {
  const [identity, setIdentity] = useState<IdentityDraft>({
    name: "",
    identifier: "",
    identifierSource: "automatic",
  });
  const [endpoint, setEndpoint] = useState("");
  const [auth, setAuth] = useState("token");
  const [username, setUsername] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [scope, setScope] = useState<SecretScope>("project");
  const [review, setReview] = useState(true);
  const [oauth, setOauth] = useState(false);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState("success");
  const [saveFail, setSaveFail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const content = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const busy = status === "running" || saving;
  const dirty =
    !done &&
    (!!identity.name ||
      !!endpoint ||
      !!secret ||
      !!username ||
      oauth ||
      auth !== "token" ||
      !review ||
      scope !== "project");
  useEffect(() => {
    onStateChange(dirty, busy);
  }, [dirty, busy, onStateChange]);
  useEffect(() => () => onStateChange(false, false), [onStateChange]);
  useEffect(() => {
    heading.current?.focus();
  }, [step]);
  function changed() {
    setStatus("idle");
    setError("");
  }
  function validate() {
    let message = "";
    if (step === 0) {
      if (identity.name.trim().length < 2)
        message = "Enter a connection name with at least 2 characters.";
      else message = identifierError(identity.identifier) ?? "";
      if (!message)
        try {
          const url = new URL(endpoint);
          if (url.protocol !== "https:" || url.username || url.password)
            throw Error();
        } catch {
          message = "Enter an HTTPS service URL without embedded credentials.";
        }
    }
    if (step === 1) {
      if (auth === "password" && !username.trim())
        message = "Enter a username.";
      else if (["token", "password"].includes(auth) && !secret)
        message = "Select a secret reference.";
      else if (auth === "oauth" && !oauth)
        message = "Complete the simulated OAuth authorization.";
    }
    setError(message);
    return !message;
  }
  const testMessages: Record<string, string> = {
    success: "Connectivity and authentication checks passed.",
    credentials:
      "Authentication failed. Review the username or secret reference.",
    permissions: "Authenticated, but required permissions are missing.",
    unreachable: "The service could not be reached. Check the service URL.",
  };
  async function test() {
    setError("");
    setStatus("running");
    await new Promise((resolve) => setTimeout(resolve, 900));
    setStatus(result);
  }
  async function create() {
    if (status !== "success" || busy) return;
    setSaving(true);
    setError("");
    await new Promise((resolve) => setTimeout(resolve, 650));
    if (saveFail)
      setError(
        "Save failed. Your configuration and successful test are preserved. Try again.",
      );
    else setDone(true);
    setSaving(false);
  }
  const secretRef = referencesFor(scope).find((item) => item.id === secret);
  return (
    <PageLayout
      eyebrow="WORKSPACE / CONNECTION SETUP"
      title={done ? "Connection created" : "Create a connection"}
      description="Configure, authenticate, and test before saving."
      aside={
        <div className="wizard-demo">
          <h2>Simulation controls</h2>
          <label>
            Current context
            <select
              aria-label="Current context"
              disabled={busy || done}
              value={scope}
              onChange={(event) => {
                setScope(event.target.value as SecretScope);
                setSecret(null);
                changed();
              }}
            >
              {scopes.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Connection test result
            <select
              aria-label="Connection test result"
              disabled={busy || done}
              value={result}
              onChange={(event) => {
                setResult(event.target.value);
                changed();
              }}
            >
              <option value="success">Success</option>
              <option value="credentials">Invalid credentials</option>
              <option value="permissions">Insufficient permissions</option>
              <option value="unreachable">Service unreachable</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={saveFail}
              disabled={busy || done}
              onChange={(event) => setSaveFail(event.target.checked)}
            />{" "}
            Simulate save failure
          </label>
          <p>
            All tests and OAuth actions are simulated. Only secret references
            are selected; no secret values or network requests are used.
          </p>
        </div>
      }
    >
      {done ? (
        <div className="wizard-success">
          <FeedbackBanner tone="success" title="Connection created">
            {identity.name} is saved in this preview session.
          </FeedbackBanner>
          <dl className="page-facts">
            <div>
              <dt>Identifier</dt>
              <dd>
                <code>{identity.identifier}</code>
              </dd>
            </div>
            <div>
              <dt>Service</dt>
              <dd>{endpoint}</dd>
            </div>
          </dl>
          <a className="page-text-link" href="#pages/resources">
            Back to projects
          </a>
        </div>
      ) : (
        <>
          <ol className="setup-progress" aria-label="Connection setup progress">
            {labels.map((label, i) => (
              <li key={label} aria-current={step === i ? "step" : undefined}>
                <span>{i + 1}</span>
                {label}
              </li>
            ))}
          </ol>
          <div className="setup-step" ref={content}>
            <h2 tabIndex={-1} ref={heading}>
              {labels[step]}
            </h2>
            {error && (
              <FeedbackBanner tone="error" title="Check your configuration">
                {error}
              </FeedbackBanner>
            )}
            <fieldset disabled={busy}>
              {step === 0 && (
                <>
                  <IdentityFields
                    mode="create"
                    nameLabel="Connection name"
                    value={identity}
                    onChange={(value) => {
                      setIdentity(value);
                      changed();
                    }}
                  />
                  <TextField
                    label="Service URL"
                    value={endpoint}
                    onChange={(value) => {
                      setEndpoint(value);
                      changed();
                    }}
                    placeholder="https://api.example.com"
                  />
                </>
              )}
              {step === 1 && (
                <>
                  <label className="wizard-method" htmlFor="wizard-auth">
                    Authentication type
                  </label>
                  <select
                    id="wizard-auth"
                    value={auth}
                    onChange={(event) => {
                      setAuth(event.target.value);
                      setSecret(null);
                      setOauth(false);
                      changed();
                    }}
                  >
                    <option value="anonymous">Anonymous</option>
                    <option value="password">Username and password</option>
                    <option value="token">API token</option>
                    <option value="oauth">OAuth</option>
                    <option value="managed">Managed identity</option>
                  </select>
                  {auth === "password" && (
                    <TextField
                      label="Username"
                      value={username}
                      onChange={(value) => {
                        setUsername(value);
                        changed();
                      }}
                    />
                  )}
                  {["password", "token"].includes(auth) && (
                    <div className="wizard-secret-field">
                      <label>
                        {auth === "password"
                          ? "Password secret"
                          : "API token secret"}
                      </label>
                      <SecretSelector
                        label={
                          auth === "password"
                            ? "Choose password secret"
                            : "Choose token secret"
                        }
                        references={referencesFor(scope)}
                        value={secret}
                        onChange={(value) => {
                          setSecret(value);
                          changed();
                        }}
                      />
                      <p>
                        Reference an existing secret. Its value is never
                        displayed.
                      </p>
                    </div>
                  )}
                  {auth === "anonymous" && (
                    <p>No credentials are sent for anonymous access.</p>
                  )}
                  {auth === "managed" && (
                    <p>
                      Use the current context’s managed identity. Availability
                      depends on the connector.
                    </p>
                  )}
                  {auth === "oauth" && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setOauth(!oauth);
                          changed();
                        }}
                      >
                        {oauth
                          ? "Disconnect simulated OAuth"
                          : "Authorize OAuth (simulation)"}
                      </Button>
                      <p role="status">
                        {oauth
                          ? "Demo authorization complete."
                          : "No real authorization request will be sent."}
                      </p>
                    </>
                  )}
                </>
              )}
              {step === 2 && (
                <>
                  <SettingRow
                    title="Review changes"
                    description="Require review before changes are applied."
                    checked={review}
                    onCheckedChange={(value) => {
                      setReview(value);
                      changed();
                    }}
                  />
                  <p>
                    You can return to earlier steps without losing your
                    configuration.
                  </p>
                </>
              )}
              {step === 3 && (
                <>
                  <dl className="wizard-summary">
                    <div>
                      <dt>Name</dt>
                      <dd>{identity.name}</dd>
                    </div>
                    <div>
                      <dt>Identifier</dt>
                      <dd>
                        <code>{identity.identifier}</code>
                      </dd>
                    </div>
                    <div>
                      <dt>Service</dt>
                      <dd>{endpoint}</dd>
                    </div>
                    <div>
                      <dt>Authentication</dt>
                      <dd>
                        {
                          {
                            anonymous: "Anonymous",
                            password: "Username and password",
                            token: "API token",
                            oauth: "OAuth",
                            managed: "Managed identity",
                          }[auth]
                        }
                      </dd>
                    </div>
                    {secretRef && (
                      <div>
                        <dt>Secret reference</dt>
                        <dd>
                          {secretRef.name} · {secretRef.scope}
                          <small>{secretRef.scopeName}</small>
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt>Review changes</dt>
                      <dd>{review ? "Required" : "Automatic"}</dd>
                    </div>
                  </dl>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void test()}
                  >
                    {status === "running"
                      ? "Testing connection…"
                      : status === "idle"
                        ? "Test connection"
                        : "Test again"}
                  </Button>
                  {status !== "idle" && status !== "running" && (
                    <FeedbackBanner
                      tone={status === "success" ? "success" : "error"}
                      title={
                        status === "success" ? "Test passed" : "Test failed"
                      }
                    >
                      {testMessages[status]}
                    </FeedbackBanner>
                  )}
                  <p>
                    Test connectivity and authentication before creating this
                    connection.
                  </p>
                </>
              )}
            </fieldset>
          </div>
          <footer className="setup-footer">
            <Button
              variant="ghost"
              disabled={step === 0 || busy}
              onClick={() => {
                setError("");
                setStep(step - 1);
              }}
            >
              Back
            </Button>
            <span role="status">
              {busy
                ? saving
                  ? "Saving…"
                  : "Testing connection…"
                : `Step ${step + 1} of 4`}
            </span>
            {step < 3 ? (
              <Button
                onClick={() => {
                  if (validate()) setStep(step + 1);
                }}
              >
                Continue
              </Button>
            ) : (
              <Button
                disabled={status !== "success" || busy}
                onClick={() => void create()}
              >
                {saving ? "Creating…" : "Create connection"}
              </Button>
            )}
          </footer>
        </>
      )}
    </PageLayout>
  );
}
