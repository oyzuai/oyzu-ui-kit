import { useState, type ReactNode, type RefObject } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "../ui/alert-dialog";
import { TextField } from "./text-field";
import { useAbortableSubmit } from "./use-abortable-submit";
export function ConfirmAction({
  trigger,
  title,
  description,
  actionLabel,
  confirmText,
  onConfirm,
  open: controlledOpen,
  onOpenChange,
  returnFocusRef,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
  trigger: ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  confirmText?: string;
  /** Receives a signal that is aborted when the user gives up on a stalled action. */
  onConfirm: (signal: AbortSignal) => Promise<void>;
}) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen ?? localOpen;
  function setOpen(next: boolean) {
    setLocalOpen(next);
    onOpenChange?.(next);
  }
  const [text, setText] = useState("");
  const { pending: busy, slow, run, cancel } = useAbortableSubmit();
  const [error, setError] = useState("");
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        setOpen(next);
        setText("");
        setError("");
      }}
    >
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent
        className="kit-confirm"
        onCloseAutoFocus={(event) => {
          if (returnFocusRef?.current?.isConnected) {
            event.preventDefault();
            returnFocusRef.current.focus();
          }
        }}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <AlertDialogHeader>
          <span className="destructive-icon">
            <Trash2 size={19} />
          </span>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {confirmText && (
          <TextField
            label={"Type " + confirmText + " to confirm"}
            value={text}
            onChange={setText}
            disabled={busy}
            autoComplete="off"
            spellCheck={false}
          />
        )}
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={busy && !slow}
            onClick={(event) => {
              if (!busy) return;
              event.preventDefault();
              cancel();
              setError(
                "This is taking too long, so we stopped waiting. Check the result before trying again.",
              );
            }}
          >
            {busy ? "Stop waiting" : "Cancel"}
          </AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={busy || (!!confirmText && text !== confirmText)}
            onClick={async () => {
              if (busy) return;
              setError("");
              try {
                if (!(await run(onConfirm))) return;
                setOpen(false);
                setText("");
              } catch (cause) {
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Could not complete the action. Please try again.",
                );
              }
            }}
          >
            {busy && <LoaderCircle size={14} className="animate-spin" />}
            {busy ? (slow ? "Still working…" : "Working…") : actionLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
