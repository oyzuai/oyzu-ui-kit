import { useState, type ReactNode, type RefObject } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { useAbortableSubmit } from "./use-abortable-submit";

type FlowDialogProps = {
  title: string;
  description: string;
  trigger: ReactNode;
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dirty: boolean;
  submitLabel: string;
  /** Receives a signal that is aborted when the user gives up on a stalled submit. */
  onSubmit: (signal: AbortSignal) => Promise<void>;
  onBack?: () => void;
  submitDisabled?: boolean;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

/** Shared editing lifecycle. Callers own validation, values and persistence. */
export function FlowDialog({
  title,
  description,
  trigger,
  children,
  open,
  onOpenChange,
  dirty,
  submitLabel,
  onSubmit,
  onBack,
  submitDisabled = false,
  returnFocusRef,
}: FlowDialogProps) {
  const { pending, slow, run, cancel } = useAbortableSubmit();
  const [error, setError] = useState("");
  const [discarding, setDiscarding] = useState(false);
  function stopWaiting() {
    cancel();
    setError(
      "This is taking too long, so we stopped waiting. Check the result before trying again.",
    );
  }
  function changeOpen(next: boolean) {
    if (pending) return;
    if (!next && dirty) {
      setDiscarding(true);
      return;
    }
    setError("");
    setDiscarding(false);
    onOpenChange(next);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending || submitDisabled) return;
    setError("");
    try {
      // A stalled submit the user gave up on resolves false; ignore its late result.
      await run(onSubmit);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Something went wrong. Please try again.",
      );
    }
  }
  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className="flow-dialog"
        showCloseButton={!pending}
        onCloseAutoFocus={(event) => {
          if (returnFocusRef?.current) {
            event.preventDefault();
            returnFocusRef.current.focus();
          }
        }}
        onEscapeKeyDown={(event) => {
          if ((event.target as HTMLElement).matches("[data-handles-escape]"))
            event.preventDefault();
        }}
      >
        <DialogHeader>
          <span className="eyebrow">
            {discarding ? "UNSAVED CHANGES" : "WORKSPACE SETTINGS"}
          </span>
          <DialogTitle>
            {discarding ? "Discard your changes?" : title}
          </DialogTitle>
          <DialogDescription>
            {discarding
              ? "Your changes have not been saved. You can keep editing or discard this draft."
              : description}
          </DialogDescription>
        </DialogHeader>
        {discarding ? (
          <DialogFooter>
            <Button
              variant="outline"
              autoFocus
              onClick={() => setDiscarding(false)}
            >
              Keep editing
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setDiscarding(false);
                setError("");
                onOpenChange(false);
              }}
            >
              Discard changes
            </Button>
          </DialogFooter>
        ) : (
          <form onSubmit={submit} aria-busy={pending}>
            <fieldset disabled={pending} className="flow-fields">
              {children}
            </fieldset>
            {error && (
              <div className="error-banner" role="alert">
                {error}
              </div>
            )}
            <DialogFooter className="flow-footer">
              <Button
                type="button"
                variant="ghost"
                disabled={pending && !slow}
                onClick={() => (pending ? stopWaiting() : changeOpen(false))}
              >
                {pending ? "Stop waiting" : "Cancel"}
              </Button>
              <div className="footer-actions">
                {onBack && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={() => {
                      setError("");
                      onBack();
                    }}
                  >
                    Back
                  </Button>
                )}
                <Button type="submit" disabled={pending || submitDisabled}>
                  {pending && <LoaderCircle className="animate-spin" />}
                  {pending
                    ? slow
                      ? "Still working…"
                      : "Saving…"
                    : submitLabel}
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
