import { CopyIdentifier } from "./copy-identifier";
import { useId, useRef, useState } from "react";
import { Check, X, LockKeyhole, Pencil, RotateCcw } from "lucide-react";
import { TextField } from "./text-field";
import {
  identifierFromName,
  identifierError as validateIdentifier,
  type EntityIdentity,
  type IdentityDraft,
} from "./identity";

type CommonProps = {
  nameLabel?: string;
  nameError?: string;
  identifierError?: string;
};
type IdentityFieldsProps = CommonProps &
  (
    | {
        mode: "create";
        value: IdentityDraft;
        onChange: (value: IdentityDraft) => void;
        suggestedIdentifier?: string;
      }
    | {
        mode: "saved";
        value: EntityIdentity;
        onNameChange: (name: string) => void;
      }
  );

/** The identifier stays in the name's label row; its source remains caller-owned. */
export function IdentityFields(props: IdentityFieldsProps) {
  const { value, nameLabel = "Name" } = props;
  const descriptionId = useId();
  const [editing, setEditing] = useState(
    props.mode === "create" && props.value.identifierSource === "custom",
  );
  const snapshot = useRef(props.mode === "create" ? props.value : null);
  const editButton = useRef<HTMLButtonElement>(null);
  function finish(cancel = false) {
    if (props.mode !== "create") return;
    if (cancel && snapshot.current) {
      props.onChange({
        ...props.value,
        identifierSource: snapshot.current.identifierSource,
        identifier:
          snapshot.current.identifierSource === "automatic"
            ? identifierFromName(props.value.name)
            : snapshot.current.identifier,
      });
    } else if (
      validateIdentifier(props.value.identifier) ||
      props.identifierError
    )
      return;
    setEditing(false);
    requestAnimationFrame(() => editButton.current?.focus());
  }
  const saved = props.mode === "saved";
  const automatic =
    props.mode === "create" && props.value.identifierSource === "automatic";
  const help = saved
    ? "Identifier is permanent. Renaming does not change it."
    : "Lowercase letters, numbers, hyphens or underscores; up to 63 characters. Permanent after creation.";
  const accessory = (
    <div className="identifier-inline">
      <span className="identifier-prefix" title={help}>
        ID:
      </span>
      {!saved && !editing ? (
        <button
          type="button"
          ref={editButton}
          className="identifier-edit"
          aria-label="Edit identifier"
          title="Edit identifier before creating"
          onClick={() => {
            if (props.mode !== "create") return;
            snapshot.current = props.value;
            props.onChange({ ...props.value, identifierSource: "custom" });
            setEditing(true);
          }}
        >
          <code
            aria-label={
              automatic ? "Generated identifier" : "Custom identifier"
            }
          >
            {value.identifier || "auto-generated"}
          </code>
          <Pencil size={11} />
        </button>
      ) : (
        <input
          className="identifier-input"
          data-handles-escape={saved ? undefined : true}
          aria-label="Identifier"
          value={value.identifier}
          readOnly={saved}
          autoFocus={!saved}
          onFocus={(event) => {
            if (!saved) event.currentTarget.select();
          }}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={!!props.identifierError}
          aria-describedby={descriptionId}
          title={saved ? value.identifier + " · " + help : help}
          onChange={(event) => {
            if (props.mode === "create")
              props.onChange({
                ...props.value,
                identifier: event.target.value,
              });
          }}
          onKeyDown={(event) => {
            if (!saved && (event.key === "Enter" || event.key === "Escape")) {
              event.preventDefault();
              event.stopPropagation();
              finish(event.key === "Escape");
            }
          }}
        />
      )}
      {editing && !saved && (
        <>
          <button
            type="button"
            className="identifier-action"
            aria-label="Confirm identifier"
            title="Confirm identifier"
            onClick={() => finish()}
          >
            <Check size={13} />
          </button>
          <button
            type="button"
            className="identifier-action"
            aria-label="Cancel identifier edit"
            title="Cancel identifier edit"
            onClick={() => finish(true)}
          >
            <X size={13} />
          </button>
        </>
      )}
      {saved ? (
        <>
          <LockKeyhole size={11} aria-label="Identifier locked" />
          <CopyIdentifier key={value.identifier} value={value.identifier} />
        </>
      ) : (
        !automatic && (
          <button
            type="button"
            className="identifier-reset"
            aria-label="Generate from name"
            title="Generate from name"
            onClick={() => {
              props.onChange({
                ...props.value,
                identifier: identifierFromName(value.name),
                identifierSource: "automatic",
              });
              setEditing(false);
            }}
          >
            <RotateCcw size={11} />
          </button>
        )
      )}
    </div>
  );
  return (
    <div className="identity-fields">
      <TextField
        label={nameLabel}
        value={value.name}
        maxLength={80}
        error={props.nameError}
        autoFocus
        labelAccessory={accessory}
        onChange={(name) => {
          if (props.mode === "saved") props.onNameChange(name);
          else
            props.onChange({
              ...props.value,
              name,
              identifier: automatic
                ? identifierFromName(name)
                : value.identifier,
            });
        }}
      />
      <span
        id={descriptionId}
        className={props.identifierError ? "field-error" : "sr-only"}
        role={props.identifierError ? "alert" : undefined}
      >
        {props.identifierError || help}
      </span>
      {props.mode === "create" && props.suggestedIdentifier && (
        <button
          type="button"
          className="identifier-suggestion"
          onClick={() =>
            props.onChange({
              ...props.value,
              identifier: props.suggestedIdentifier!,
              identifierSource: "custom",
            })
          }
        >
          Use {props.suggestedIdentifier}
        </button>
      )}
    </div>
  );
}
