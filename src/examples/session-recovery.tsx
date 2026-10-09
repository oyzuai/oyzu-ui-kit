import { createContext, useContext, useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
} from "../components/ui/alert-dialog";
import { Button } from "../components/ui/button";
import { SignInFlow } from "./sign-in-flow";
import "./session-recovery.css";

const RecoveryContext = createContext<(() => void) | null>(null);
export function ExpireSessionButton({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const expire = useContext(RecoveryContext);
  return expire ? (
    <Button variant="ghost" size="sm" disabled={disabled} onClick={expire}>
      Preview session expiry
    </Button>
  ) : null;
}

// Keep the editor subtree mounted. No draft values or credentials enter storage.
export function SessionRecovery({
  children,
  name,
  email,
  context,
  onBlockedChange,
}: {
  children: ReactNode;
  name: string;
  email: string;
  context: string;
  onBlockedChange: (blocked: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<"signin" | "different" | "denied">(
    "signin",
  );
  const [result, setResult] = useState("same");
  function expire() {
    setStage("signin");
    setResult("same");
    setOpen(true);
    onBlockedChange(true);
  }
  function authenticated() {
    if (result !== "same") {
      setStage(result === "different" ? "different" : "denied");
      return;
    }
    setOpen(false);
    onBlockedChange(false);
  }
  return (
    <RecoveryContext.Provider value={expire}>
      <div
        inert={open}
        aria-hidden={open || undefined}
        style={{ display: "contents" }}
      >
        {children}
      </div>
      <AlertDialog open={open}>
        <AlertDialogContent
          className="session-recovery"
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="recovery-heading">
            <span className="eyebrow">SESSION PAUSED</span>
            <AlertDialogTitle>
              {stage === "signin"
                ? "Sign in to continue"
                : stage === "different"
                  ? "This draft belongs to another account"
                  : "Workspace access has changed"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {stage === "signin"
                ? "Your session expired. Your page, current step, and unsaved edits are still here."
                : stage === "different"
                  ? `You signed in as Taylor Chen. Resume with ${email} to continue this draft.`
                  : "You signed in, but no longer have access to this workspace. Ask your administrator to restore access, then try again."}
            </AlertDialogDescription>
          </div>
          <div className="recovery-body">
            <div className="recovery-context">
              <strong>{email}</strong>
              <span>{context}</span>
            </div>
            {stage === "signin" ? (
              <>
                <SignInFlow name={name} onLogin={authenticated} />
                <label className="recovery-result">
                  Session recovery preview
                  <select
                    value={result}
                    onChange={(e) => setResult(e.target.value)}
                  >
                    <option value="same">Same account, access retained</option>
                    <option value="different">Different account</option>
                    <option value="denied">Workspace access removed</option>
                  </select>
                </label>
              </>
            ) : (
              <div className="recovery-blocked">
                <p>
                  Your draft remains paused. It will not be opened under another
                  account or workspace.
                </p>
                <Button
                  onClick={() => {
                    setResult("same");
                    setStage("signin");
                  }}
                >
                  {stage === "different"
                    ? "Sign in with original account"
                    : "Try sign-in again"}
                </Button>
              </div>
            )}
            <p className="session-caption">
              Simulated authentication. Keep this tab open: drafts are retained
              in memory and are lost on reload.
            </p>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </RecoveryContext.Provider>
  );
}
