import { DocumentEditor } from "@/components/patterns/document-editor";
import { useEffect, useRef, useState } from "react";
import { PageLayout } from "@/components/patterns/page-layout";
import { IdentityFields } from "@/components/patterns/identity-fields";
import {
  identifierError,
  type IdentityDraft,
} from "@/components/patterns/identity";
import { TextField } from "@/components/patterns/text-field";
import { SettingRow } from "@/components/patterns/setting-row";
import { Button } from "@/components/ui/button";
import { FeedbackBanner } from "@/components/patterns/feedback-banner";
import "./connection-editor.css";
type Draft = IdentityDraft & {
  endpoint: string;
  auth: string;
  credential: string;
  review: boolean;
  timeout: string;
};
const initial: Draft = {
  name: "",
  identifier: "",
  identifierSource: "automatic",
  endpoint: "",
  auth: "managed",
  credential: "",
  review: true,
  timeout: "30",
};
export function ConnectionEditor({
  onStateChange,
}: {
  onStateChange: (dirty: boolean, busy: boolean) => void;
}) {
  const [saved, setSaved] = useState<Draft | null>(null);
  const [draft, setDraft] = useState<Draft>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState("normal");
  const [advanced, setAdvanced] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const [sourcePending, setSourcePending] = useState(false);
  const projectDocument = (v: Draft) => ({
    name: v.name,
    identifier: v.identifier,
    endpoint: v.endpoint,
    authentication: v.auth,
    secretReference: v.credential,
    reviewChanges: v.review,
    timeoutSeconds: v.timeout,
  });
  const dirty =
    sourcePending || JSON.stringify(draft) !== JSON.stringify(saved ?? initial);
  useEffect(() => {
    onStateChange(dirty, busy);
  }, [dirty, busy, onStateChange]);
  useEffect(() => () => onStateChange(false, false), [onStateChange]);
  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setNotice("");
  }
  function reset() {
    setDraft(saved ?? initial);
    setErrors({});
    setFailure("");
    setNotice("");
  }
  async function save() {
    if (busy || sourcePending) return;
    const next: Record<string, string> = {};
    if (draft.name.trim().length < 2) next.name = "Use at least 2 characters.";
    const idError = identifierError(draft.identifier);
    if (idError) next.identifier = idError;
    try {
      const url = new URL(draft.endpoint);
      if (url.protocol !== "https:" || url.username || url.password)
        throw Error();
    } catch {
      next.endpoint = "Enter an HTTPS URL without embedded credentials.";
    }
    if (draft.auth === "reference" && !draft.credential.trim())
      next.credential = "Choose a credential reference.";
    if (
      !/^\d+$/.test(draft.timeout) ||
      Number(draft.timeout) < 1 ||
      Number(draft.timeout) > 120
    ) {
      next.timeout = "Use a whole number from 1 to 120 seconds.";
      setAdvanced(true);
    }
    setErrors(next);
    setFailure("");
    if (Object.keys(next).length) {
      requestAnimationFrame(() =>
        form.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      );
      return;
    }
    setBusy(true);
    try {
      await new Promise((resolve) =>
        setTimeout(resolve, mode === "slow" ? 3000 : 650),
      );
      if (mode === "fail")
        throw Error(
          "We couldn’t save the connection. Your draft is safe. Try again.",
        );
      const value = { ...draft, name: draft.name.trim() };
      setSaved(value);
      setDraft(value);
      setNotice(
        "Connection saved in this preview. No external connection was made.",
      );
    } catch (error) {
      setFailure((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <PageLayout
      variant="entity"
      eyebrow="WORKSPACE / CONNECTIONS"
      title={saved ? "Edit connection" : "Create connection"}
      description="Configure how your workspace connects to a service."
      aside={
        <>
          <h2>About this connection</h2>
          <p>
            Use a recognizable name and a permanent identifier. Credentials are
            referenced, never pasted into this example.
          </p>
          <div className="editor-demo">
            <label htmlFor="editor-save-mode">Save behavior</label>
            <select
              id="editor-save-mode"
              disabled={busy}
              value={mode}
              onChange={(event) => setMode(event.target.value)}
            >
              <option value="normal">Successful save</option>
              <option value="slow">Slow save</option>
              <option value="fail">Failed save</option>
            </select>
            <p>Fictional configuration. Refreshing resets this preview.</p>
          </div>
        </>
      }
    >
      <form
        ref={form}
        className="connection-editor"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        {failure && (
          <FeedbackBanner tone="error" title="Couldn’t save">
            {failure}
          </FeedbackBanner>
        )}
        {notice && (
          <FeedbackBanner tone="success" title="Saved">
            {notice}
          </FeedbackBanner>
        )}
        {Object.keys(errors).length > 0 && (
          <p className="field-error" role="alert">
            Check the highlighted fields before saving.
          </p>
        )}
        <DocumentEditor
          value={projectDocument(draft)}
          saved={saved ? projectDocument(saved) : undefined}
          disabled={busy}
          onPendingChange={setSourcePending}
          validate={(v) => {
            if (saved && v.identifier !== saved.identifier)
              throw Error("The saved identifier cannot change.");
            const issue = identifierError(v.identifier as string);
            if (issue) throw Error(issue);
            if ((v.name as string).trim().length < 2)
              throw Error("Enter a name with at least 2 characters.");
            const url = new URL(v.endpoint as string);
            if (url.protocol !== "https:" || url.username || url.password)
              throw Error("Use HTTPS without embedded credentials.");
            if (!["managed", "reference"].includes(v.authentication as string))
              throw Error("Unsupported authentication type.");
            if (
              !/^\d+$/.test(v.timeoutSeconds as string) ||
              Number(v.timeoutSeconds) < 1 ||
              Number(v.timeoutSeconds) > 120
            )
              throw Error("Timeout must be from 1 to 120 seconds.");
          }}
          onApply={(v) => {
            setDraft({
              name: v.name as string,
              identifier: v.identifier as string,
              identifierSource: "custom",
              endpoint: v.endpoint as string,
              auth: v.authentication as string,
              credential: (v.secretReference as string | null) ?? "",
              review: v.reviewChanges as boolean,
              timeout: v.timeoutSeconds as string,
            });
            setNotice("");
          }}
        >
          <fieldset disabled={busy}>
            <section className="editor-section">
              <h2>
                <span>01</span> Basics
              </h2>
              <p>The name people recognize and the service to connect.</p>
              {saved ? (
                <IdentityFields
                  mode="saved"
                  nameLabel="Connection name"
                  value={draft}
                  nameError={errors.name}
                  onNameChange={(name) => update("name", name)}
                />
              ) : (
                <IdentityFields
                  mode="create"
                  nameLabel="Connection name"
                  value={draft}
                  nameError={errors.name}
                  identifierError={errors.identifier}
                  onChange={(identity) =>
                    setDraft((previous) => ({ ...previous, ...identity }))
                  }
                />
              )}
              <TextField
                label="Service URL"
                value={draft.endpoint}
                onChange={(value) => update("endpoint", value)}
                error={errors.endpoint}
                placeholder="https://api.example.com"
                hint="Used only as sample configuration; no request will be sent."
              />
            </section>
            <section className="editor-section">
              <h2>
                <span>02</span> Authentication
              </h2>
              <p>Choose how this connection would authenticate.</p>
              <div className="editor-select">
                <label htmlFor="connection-auth">Authentication method</label>
                <select
                  id="connection-auth"
                  value={draft.auth}
                  onChange={(event) => update("auth", event.target.value)}
                >
                  <option value="managed">Managed identity</option>
                  <option value="reference">Credential reference</option>
                </select>
              </div>
              {draft.auth === "reference" && (
                <TextField
                  label="Credential reference"
                  value={draft.credential}
                  onChange={(value) => update("credential", value)}
                  error={errors.credential}
                  hint="A reference name, such as source-control-token. Do not enter a secret."
                />
              )}
            </section>
            <section className="editor-section">
              <h2>
                <span>03</span> Behavior
              </h2>
              <SettingRow
                title="Review changes"
                description="Require review before changes are applied."
                checked={draft.review}
                onCheckedChange={(value) => update("review", value)}
              />
              <button
                type="button"
                className="editor-advanced"
                aria-expanded={advanced}
                aria-controls="editor-advanced"
                onClick={() => setAdvanced(!advanced)}
              >
                {advanced ? "Hide" : "Show"} advanced settings
              </button>
              <div id="editor-advanced" hidden={!advanced}>
                <TextField
                  label="Request timeout (seconds)"
                  inputMode="numeric"
                  value={draft.timeout}
                  onChange={(value) => update("timeout", value)}
                  error={errors.timeout}
                  hint="Between 1 and 120 seconds."
                />
              </div>
            </section>
          </fieldset>
        </DocumentEditor>
        {(dirty || busy) && (
          <div className="editor-savebar">
            <span role="status">
              {busy ? "Saving…" : "You have unsaved changes."}
            </span>
            <div>
              <Button
                type="button"
                variant="ghost"
                disabled={busy || sourcePending}
                onClick={reset}
              >
                Cancel changes
              </Button>
              <Button type="submit" disabled={busy || sourcePending}>
                {busy
                  ? "Saving…"
                  : saved
                    ? "Save changes"
                    : "Create connection"}
              </Button>
            </div>
          </div>
        )}
      </form>
    </PageLayout>
  );
}
