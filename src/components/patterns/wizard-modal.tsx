import { useState, type ReactNode, type RefObject } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "../ui/alert-dialog";
export function WizardModal({
  title,
  children,
  dirty,
  busy,
  onClose,
  returnFocusRef,
}: {
  title: string;
  children: ReactNode;
  dirty: boolean;
  busy: boolean;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open && !busy) {
            if (dirty) setConfirm(true);
            else onClose();
          }
        }}
      >
        <DialogContent
          className="connector-wizard-modal"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocusRef.current?.focus();
          }}
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (busy) event.preventDefault();
          }}
        >
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Configure and test your connection before creating it.
          </DialogDescription>
          {children}
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard connection setup?</AlertDialogTitle>
            <AlertDialogDescription>
              Your configuration has not been saved. Keep editing or discard
              this setup.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={onClose}>
              Discard setup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
