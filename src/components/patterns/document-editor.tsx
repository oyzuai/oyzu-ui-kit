import { useState, type ReactNode } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { yaml } from "@codemirror/lang-yaml";
import { parseDocument, stringify } from "yaml";
import "./document-editor.css";
type DocumentValue = Record<string, string | boolean | null>;
/** Strict draft projection: unknown keys are rejected, never silently dropped. */
export function DocumentEditor({
  value,
  saved,
  validate,
  onApply,
  onPendingChange,
  disabled,
  children,
}: {
  value: DocumentValue;
  saved?: DocumentValue;
  validate: (value: DocumentValue) => void;
  onApply: (value: DocumentValue) => void;
  onPendingChange: (pending: boolean) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  const [mode, setMode] = useState("visual");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  function encode(v: DocumentValue) {
    return stringify(v, { indent: 2, lineWidth: 88, sortMapEntries: false });
  }
  function format() {
    try {
      const doc = parseDocument(text, { uniqueKeys: true });
      if (doc.errors.length) throw Error(doc.errors[0].message);
      setText(
        doc.toString({ indent: 2, lineWidth: 88, collectionStyle: "block" }),
      );
      setError("");
      setNotice("YAML formatted");
    } catch (e) {
      setError((e as Error).message);
      setNotice("");
    }
  }
  function read() {
    const doc = parseDocument(text, { uniqueKeys: true });
    if (doc.errors.length) throw Error(doc.errors[0].message);
    const parsed: unknown = doc.toJS({ maxAliasCount: 0 });
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw Error("Expected a connection object.");
    const result = parsed as DocumentValue;
    for (const key of Object.keys(result))
      if (!(key in value)) throw Error(`Unsupported field: ${key}`);
    for (const [key, original] of Object.entries(value)) {
      if (!(key in result)) throw Error(`Missing field: ${key}`);
      if (original === null || key === "secretReference") {
        if (result[key] !== null && typeof result[key] !== "string")
          throw Error(`${key} must be a reference string or null.`);
      } else if (typeof result[key] !== typeof original)
        throw Error(`Invalid type for ${key}.`);
    }
    validate(result);
    return result;
  }
  function switchMode(next: string) {
    if (next === mode) return;
    try {
      const current = mode === "visual" ? value : read();
      if (mode !== "visual") onApply(current);
      setText(encode(current));
      setMode(next);
      setError("");
      onPendingChange(next !== "visual");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="document-editor">
      <div className="document-toolbar">
        <div role="group" aria-label="Editor representation">
          {["visual", "yaml"].map((item) => (
            <button
              type="button"
              disabled={disabled}
              aria-pressed={mode === item}
              key={item}
              onClick={() => switchMode(item)}
            >
              {item === "visual" ? "Visual" : item.toUpperCase()}
            </button>
          ))}
        </div>
        <small>Connection configuration</small>
      </div>
      {mode === "visual" ? (
        children
      ) : (
        <>
          <div className="yaml-filebar">
            <div>
              <span aria-hidden="true">≡</span>
              <strong>connection.yaml</strong>
              <small>YAML</small>
            </div>
            <button type="button" disabled={disabled} onClick={format}>
              Format YAML
            </button>
          </div>
          <CodeMirror
            value={text}
            height="360px"
            theme="dark"
            extensions={[yaml()]}
            editable={!disabled}
            basicSetup={{ lineNumbers: true, foldGutter: true }}
            onChange={(next) => {
              setText(next);
              onPendingChange(true);
              setError("");
              setNotice("");
            }}
            aria-label={`${mode.toUpperCase()} connection document`}
          />
          <div className="yaml-status">
            <span role="status">{notice || "2-space indent · UTF-8"}</span>
            <span>Secret references only</span>
          </div>
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
          <button
            type="button"
            className="document-apply"
            disabled={disabled}
            onClick={() => switchMode("visual")}
          >
            Apply YAML
          </button>
          <button
            type="button"
            className="document-discard"
            disabled={disabled}
            onClick={() => {
              setMode("visual");
              setError("");
              onPendingChange(false);
            }}
          >
            Discard edits
          </button>
        </>
      )}
      {saved && mode === "visual" && (
        <details className="document-diff">
          <summary>Review changes</summary>
          <p>
            Saved values → draft values. This preview does not store an audit
            history.
          </p>
          {Object.keys(value)
            .filter(
              (key) =>
                JSON.stringify(saved[key]) !== JSON.stringify(value[key]),
            )
            .map((key) => (
              <div key={key}>
                <strong>{key}</strong>
                <del>{JSON.stringify(saved[key])}</del>
                <ins>{JSON.stringify(value[key])}</ins>
              </div>
            ))}
          {JSON.stringify(saved) === JSON.stringify(value) && (
            <p>No configuration changes.</p>
          )}
        </details>
      )}
    </div>
  );
}
