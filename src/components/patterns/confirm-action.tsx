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
  onConfirm: () => Promise<void>;
}) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen ?? localOpen;
  function setOpen(next: boolean) {
    setLocalOpen(next);
    onOpenChange?.(next);
  }
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
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
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={busy || (!!confirmText && text !== confirmText)}
            onClick={async () => {
              if (busy) return;
              setBusy(true);
              setError("");
              try {
                await onConfirm();
                setOpen(false);
                setText("");
              } catch (cause) {
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Could not complete the action. Please try again.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy && <LoaderCircle size={14} className="animate-spin" />}
            {busy ? "Working…" : actionLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
