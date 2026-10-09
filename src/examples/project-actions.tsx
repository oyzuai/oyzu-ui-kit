import { useRef, useState } from "react";
import { Ellipsis, ArrowUpRight, Pencil, Trash2 } from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../components/ui/dropdown-menu";
import { FlowDialog } from "../components/patterns/flow-dialog";
import { ConfirmAction } from "../components/patterns/confirm-action";
import { TextField } from "../components/patterns/text-field";
export type ActionProject = {
  id: string;
  name: string;
  owner: string;
  updated: string;
};
export function ProjectActions({
  project,
  onEdit,
  onDelete,
}: {
  project: ActionProject;
  onEdit: (name: string) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [action, setAction] = useState<"edit" | "delete" | null>(null);
  const [draft, setDraft] = useState(project.name);
  const [error, setError] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const href = "#pages/detail/" + project.id;
  return (
    <div className="project-row-actions">
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            aria-label={"Quick view " + project.name}
          >
            Quick view
          </Button>
        </DialogTrigger>
        <DialogContent className="resource-drawer">
          <DialogHeader>
            <span className="eyebrow">PROJECT / QUICK VIEW</span>
            <DialogTitle>{project.name}</DialogTitle>
            <DialogDescription>
              Project details without leaving your list.
            </DialogDescription>
          </DialogHeader>
          <dl className="page-facts">
            <div>
              <dt>Identifier</dt>
              <dd>
                <code>{project.id}</code>
              </dd>
            </div>
            <div>
              <dt>Team</dt>
              <dd>{project.owner}</dd>
            </div>
            <div>
              <dt>Last updated</dt>
              <dd>{project.updated}</dd>
            </div>
          </dl>
          <a href={href} className="page-text-link">
            Open project page <ArrowUpRight size={15} />
          </a>
        </DialogContent>
      </Dialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            ref={trigger}
            variant="ghost"
            size="icon-sm"
            aria-label={"Actions for " + project.name}
          >
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onCloseAutoFocus={(event) => {
            if (action) event.preventDefault();
          }}
        >
          <DropdownMenuItem asChild>
            <a href={href}>
              <ArrowUpRight />
              Open page
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              setDraft(project.name);
              setError("");
              setAction("edit");
            }}
          >
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setAction("delete")}
          >
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <FlowDialog
        title="Edit project"
        description="Update the friendly name. The identifier stays the same."
        trigger={<span hidden />}
        open={action === "edit"}
        onOpenChange={(open) => {
          if (!open) setAction(null);
        }}
        dirty={draft !== project.name}
        submitLabel="Save changes"
        submitDisabled={draft === project.name}
        returnFocusRef={trigger}
        onSubmit={async () => {
          if (draft.trim().length < 2) {
            setError("Use at least 2 characters.");
            return;
          }
          await onEdit(draft.trim());
          setAction(null);
        }}
      >
        <TextField
          label="Project name"
          value={draft}
          onChange={setDraft}
          error={error}
          labelAccessory={
            <code className="account-identifier">{project.id}</code>
          }
        />
      </FlowDialog>
      <ConfirmAction
        trigger={<span hidden />}
        open={action === "delete"}
        onOpenChange={(open) => {
          if (!open) setAction(null);
        }}
        returnFocusRef={trigger}
        title={"Delete " + project.name + "?"}
        description="This removes the project from this fictional workspace. This cannot be undone within this preview session."
        actionLabel="Delete project"
        onConfirm={onDelete}
      />
    </div>
  );
}
