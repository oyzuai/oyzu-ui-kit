import { DeviceAuthorization } from "./oauth-device";
import { ExpireSessionButton } from "./session-recovery";
import { useActiveContext } from "@/components/patterns/active-context";
import { DocumentEditor } from "@/components/patterns/document-editor";
import { ConnectionDiagnostics } from "@/components/patterns/connection-diagnostics";
import type { Connector } from "./connector-data";
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
import { Button } from "@/components/ui/button";
import { referencesFor, scopes } from "./secret-samples";
import "./connection-wizard.css";
const labels = ["Basics", "Authentication", "Behavior", "Review & test"];
export function ConnectionWizard({
  testOutcome = "success",
  presentation = "page",
  onDone,
  connector,
  onStateChange,
}: {
  testOutcome?: string;
  presentation?: "page" | "modal";
  onDone?: () => void;
  connector?: Connector;
  onStateChange: (dirty: boolean, busy: boolean) => void;
}) {
  const activeContext = useActiveContext();
  const [identity, setIdentity] = useState<IdentityDraft>({
    name: "",
    identifier: "",
    identifierSource: "automatic",
  });
  const [endpoint, setEndpoint] = useState(connector?.endpoint ?? "");
  const [auth, setAuth] = useState("token");
  const [username, setUsername] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [scope, setScope] = useState<SecretScope>(
    activeContext.project ? "project" : "organization",
  );
  const [review, setReview] = useState(true);
  const [oauth, setOauth] = useState(false);
  const [step, setStep] = useState(0);
  const [testStage, setTestStage] = useState(0);
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(testOutcome);
  const [saveFail, setSaveFail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const content = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const busy = status === "running" || saving;
  const [sourcePending, setSourcePending] = useState(false);
  const dirty =
    !done &&
    (sourcePending ||
      !!identity.name ||
      (connector ? endpoint !== connector.endpoint : !!endpoint) ||
      !!secret ||
      !!username ||
      oauth ||
      auth !== "token" ||
      !review ||
      scope !== (activeContext.project ? "project" : "organization"));
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
  function validate(checkStep = step) {
    let message = "";
    if (checkStep === 0) {
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
    if (checkStep === 1) {
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
  async function test() {
    if (!validate(0)) {
      setStep(0);
      return;
    }
    if (!validate(1)) {
      setStep(1);
      return;
    }
    setError("");
    setStatus("running");
    setTestStage(0);
    const stopAt =
      result === "unreachable" ? 0 : result === "credentials" ? 1 : 2;
    for (let i = 0; i <= stopAt; i++) {
      setTestStage(i);
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
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
      identity={connector ? <img className="wizard-header-logo" src={`/brands/${connector.id}.svg`} width="48" height="48" alt=""/> : undefined}
      eyebrow={
        connector
          ? "PROJECT / CHECKOUT SERVICE / CONNECTIONS"
          : "WORKSPACE / CONNECTION SETUP"
      }
      title={
        done
          ? "Connection created"
          : connector
            ? `Connect ${connector.name}`
            : "Create a connection"
      }
      description="Configure, authenticate, and test before saving."
      aside={
        presentation === "page" && (
          <div className="wizard-demo">
            <h2>Simulation controls</h2>
            {!connector && (
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
            )}
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
        )
      }
    >
      {connector && (
        <div className="connector-selected">
          <img
            src={`/brands/${connector.id}.svg`}
            width="32"
            height="32"
            alt=""
          />
          <strong>{connector.name}</strong>
          {presentation === "page" && (
            <a href="#pages/connectors">Change connector</a>
          )}
        </div>
      )}
      {done ? (
        <div className="wizard-success">
          <div className="wizard-completion" role="status"><span aria-hidden="true">✓</span><div><h2>{identity.name} is ready</h2><p>Connection created after successful verification. Saved in this preview session.</p></div></div>
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
          {presentation === "modal" ? (
            <Button onClick={onDone}>Done</Button>
          ) : (
            <a className="page-text-link" href="#pages/resources">
              Back to projects
            </a>
          )}
        </div>
      ) : (
        <>
          <ol className="setup-progress" aria-label="Connection setup progress">
            {labels.map((label, i) => (
              <li key={label} aria-current={step === i ? "step" : undefined}>
                <span>{i < step ? "✓" : i + 1}</span>
                {label}
              </li>
            ))}
          </ol>
          <div className="setup-step" ref={content}>
            <h2 tabIndex={-1} ref={heading}>
              {labels[step]}
            </h2>
            <p className="wizard-step-intent">{["Give this connection a recognizable name and service address.", "Choose how this connection will authenticate. Credentials stay in secret storage.", "Decide how changes made through this connection are applied.", "Verify the service and credentials before creating this connection."][step]}</p>
            {error && step !== 0 && !(step === 1 && auth === "password" && !username.trim()) && <p role="alert" className="wizard-action-error">{error}</p>}
            <DocumentEditor
              disabled={busy}
              onPendingChange={setSourcePending}
              value={{
                connector: connector?.id ?? "generic",
                name: identity.name,
                identifier: identity.identifier,
                endpoint,
                authentication: auth,
                username,
                secretReference: secret,
                reviewChanges: review,
              }}
              validate={(v) => {
                if (v.connector !== (connector?.id ?? "generic"))
                  throw Error("Connector type cannot be changed here.");
                if (typeof v.name !== "string" || v.name.trim().length < 2)
                  throw Error("Enter a name with at least 2 characters.");
                const issue = identifierError(v.identifier as string);
                if (issue) throw Error(issue);
                const url = new URL(v.endpoint as string);
                if (url.protocol !== "https:" || url.username || url.password)
                  throw Error("Use HTTPS without embedded credentials.");
                if (
                  ![
                    "token",
                    "password",
                    "anonymous",
                    "oauth",
                    "managed",
                  ].includes(v.authentication as string)
                )
                  throw Error("Unsupported authentication type.");
                if (
                  connector &&
                  (v.authentication === "managed" ||
                    (v.authentication === "anonymous" &&
                      !["docker", "harbor"].includes(connector.id)) ||
                    (v.authentication === "password" &&
                      !["docker", "harbor", "jenkins", "ansible"].includes(
                        connector.id,
                      )) ||
                    (v.authentication === "oauth" &&
                      !["github", "gitlab"].includes(connector.id)))
                )
                  throw Error(
                    "Authentication type is not available for this connector.",
                  );
                if (
                  v.secretReference !== null &&
                  !referencesFor(scope).some((r) => r.id === v.secretReference)
                )
                  throw Error(
                    "Secret reference is not available in this context.",
                  );
              }}
              onApply={(v) => {
                setIdentity({
                  name: v.name as string,
                  identifier: v.identifier as string,
                  identifierSource: "custom",
                });
                setEndpoint(v.endpoint as string);
                if (v.authentication !== auth) setOauth(false);
                setAuth(v.authentication as string);
                setUsername(v.username as string);
                setSecret(v.secretReference as string | null);
                setReview(v.reviewChanges as boolean);
                changed();
              }}
            >
              <fieldset disabled={busy}>
                {step === 0 && (
                  <>
                    <IdentityFields
                      mode="create"
                      nameLabel="Connection name"
                      nameError={error && identity.name.trim().length < 2 ? error : undefined}
                      identifierError={error && identity.name.trim().length >= 2 ? identifierError(identity.identifier) ?? undefined : undefined}
                      value={identity}
                      onChange={(value) => {
                        setIdentity(value);
                        changed();
                      }}
                    />
                    <TextField
                      label="Service URL"
                      error={error && identity.name.trim().length >= 2 && !identifierError(identity.identifier) ? error : undefined}
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
                      {(!connector ||
                        ["docker", "harbor"].includes(connector.id)) && (
                        <option value="anonymous">Anonymous</option>
                      )}
                      {(!connector ||
                        ["docker", "harbor", "jenkins", "ansible"].includes(
                          connector.id,
                        )) && (
                        <option value="password">Username and password</option>
                      )}
                      <option value="token">API token</option>
                      {(!connector ||
                        ["github", "gitlab"].includes(connector.id)) && (
                        <option value="oauth">OAuth</option>
                      )}
                      {!connector && (
                        <option value="managed">Managed identity</option>
                      )}
                    </select>
                    {auth === "password" && (
                      <TextField
                        label="Username"
                        error={error && !username.trim() ? error : undefined}
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
                      <DeviceAuthorization
                        connected={oauth}
                        onChange={(value) => {
                          setOauth(value);
                          changed();
                        }}
                      />
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
                    <div className="wizard-review-identity"><strong>{identity.name}</strong><span>{endpoint}</span></div>
                    <details className="supporting-details"><summary>Configuration summary</summary>
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
                    </dl></details>
                    <ConnectionDiagnostics
                      status={status}
                      stage={testStage}
                      endpoint={endpoint}
                    />
                  </>
                )}
              </fieldset>
            </DocumentEditor>
          </div>
          <footer className="setup-footer">
            <ExpireSessionButton disabled={busy} />
            <Button
              variant="ghost"
              disabled={step === 0 || busy || sourcePending}
              onClick={() => {
                setError("");
                setStep(step - 1);
              }}
            >
              Back
            </Button>
            <span role="status">
              {busy ? (saving ? "Saving…" : "Testing connection…") : null}
            </span>
            {step < 3 ? (
              <Button
                disabled={sourcePending}
                onClick={() => {
                  if (!sourcePending && validate()) setStep(step + 1);
                }}
              >
                Continue
              </Button>
            ) : (
              <Button
                disabled={busy || sourcePending}
                onClick={() => void (status === "success" ? create() : test())}
              >
                {saving
                  ? "Creating…"
                  : status === "running"
                    ? "Testing…"
                    : status === "success"
                      ? "Create connection"
                      : status === "idle"
                        ? "Test connection"
                        : "Retry test"}
              </Button>
            )}
          </footer>
        </>
      )}
    </PageLayout>
  );
}
