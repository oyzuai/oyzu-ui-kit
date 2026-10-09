import { useState } from "react";
import { Check, Pencil } from "lucide-react";
import { Button } from "../components/ui/button";
import { FlowDialog } from "../components/patterns/flow-dialog";
import { IdentityFields } from "../components/patterns/identity-fields";
import type { EntityIdentity } from "../components/patterns/identity";

export type DemoConnection = EntityIdentity & {
  access: "review" | "automatic";
};
export function ConnectionCard({
  connection,
  onRename,
}: {
  connection: DemoConnection;
  onRename: (name: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(connection.name);
  const [error, setError] = useState<string>();
  return (
    <div className="connected">
      <span className="connected-icon">
        <Check />
      </span>
      <div>
        <h3>{connection.name}</h3>
        <code>{connection.identifier}</code>
        <p>
          {connection.access === "review"
            ? "Review before applying"
            : "Apply automatically"}{" "}
          · Demo connection
        </p>
      </div>
      <FlowDialog
        title="Edit connection"
        description="Change the friendly name. Its identifier stays the same."
        trigger={
          <Button variant="outline" aria-label={"Edit " + connection.name}>
            <Pencil size={14} />
            Edit
          </Button>
        }
        open={open}
        onOpenChange={(next) => {
          if (next) {
            setName(connection.name);
            setError(undefined);
          }
          setOpen(next);
        }}
        dirty={name.trim() !== connection.name}
        submitDisabled={name.trim() === connection.name}
        submitLabel="Save changes"
        onSubmit={async () => {
          if (name.trim().length < 2) {
            setError("Use at least 2 characters.");
            return;
          }
          setError(undefined);
          await onRename(name.trim());
          setOpen(false);
        }}
      >
        <IdentityFields
          mode="saved"
          nameLabel="Connection name"
          value={{ name, identifier: connection.identifier }}
          onNameChange={(next) => {
            setName(next);
            setError(undefined);
          }}
          nameError={error}
        />
      </FlowDialog>
    </div>
  );
}
