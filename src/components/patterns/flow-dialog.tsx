import { useState, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type FlowDialogProps = {
  title: string;
  description: string;
  trigger: ReactNode;
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dirty: boolean;
  submitLabel: string;
  onSubmit: () => Promise<void>;
  onBack?: () => void;
  submitDisabled?: boolean;
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
}: FlowDialogProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [discarding, setDiscarding] = useState(false);
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
    setPending(true);
    try {
      await onSubmit();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className="flow-dialog"
        showCloseButton={!pending}
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
                disabled={pending}
                onClick={() => changeOpen(false)}
              >
                Cancel
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
                  {pending ? "Saving…" : submitLabel}
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
