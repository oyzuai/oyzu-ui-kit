import { AuthorizationPermissions } from "../components/patterns/authorization-permissions";
import { AuthorizationAccount } from "../components/patterns/authorization-account";
import { DeviceCodeInput } from "../components/patterns/device-code-input";
import { useEffect, useState } from "react";
import { Terminal } from "lucide-react";
import { Button } from "../components/ui/button";
import { SignInFlow } from "./sign-in-flow";
import "./session-example.css";
import "./oauth-device.css";

export function DeviceAuthorizationPage() {
  return (
    <main className="authorization-page">
      <header className="authorization-brand">
        <img src="/brand/oyzu-full-logo-color.svg" width="160" alt="Oyzu" />
        <span>Device authorization</span>
      </header>
      <div className="authorization-layout">
        <aside className="authorization-story">
          <span className="eyebrow">YOUR TERMINAL. YOUR WORKSPACE.</span>
          <h2>
            Small code.
            <br />
            Big possibilities.
          </h2>
          <p>Connect your tools to the place your team builds.</p>
          <div className="authorization-orbit" aria-hidden="true">
            <span />
            <span />
            <div>
              <Terminal size={36} />
            </div>
          </div>
          <span className="authorization-story-caption">
            01 / CONNECT WITH CONFIDENCE
          </span>
        </aside>
        <div className="authorization-content">
          <OyzuDeviceApproval context="Engineering / Checkout service" />
        </div>
      </div>
      <footer>OYZU / IDENTITY & ACCESS</footer>
    </main>
  );
}
// Requested context belongs to the fictional authorization request, not portal navigation.
function OyzuDeviceApproval({ context }: { context: string }) {
  const [stage, setStage] = useState("code");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [deadline, setDeadline] = useState(() => Date.now() + 300000);
  useEffect(() => {
    if (!["code", "signin", "review"].includes(stage)) return;
    const timer = setInterval(() => {
      if (Date.now() >= deadline) setStage("expired");
    }, 1000);
    return () => clearInterval(timer);
  }, [stage, deadline]);
  return (
    <section className="device-panel">
      <div className="device-heading">
        <Terminal />
        <span className="eyebrow">OYZU CLI</span>
        <h1>
          {stage === "approved"
            ? "Device authorized"
            : stage === "denied"
              ? "Request denied"
              : stage === "expired"
                ? "Request expired"
                : "Authorize your device"}
        </h1>
      </div>
      {stage === "code" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (code.replace(/[^A-Z]/g, "") !== "WDJBMJHT") {
              setError(
                "Code not found. Check the code shown in your terminal.",
              );
              return;
            }
            if (Date.now() >= deadline) {
              setStage("expired");
              return;
            }
            setError("");
            setStage("signin");
          }}
        >
          <p className="authorization-intro">Let's connect your terminal.</p>
          <DeviceCodeInput
            value={code}
            onChange={(value) => {
              setCode(value);
              setError("");
            }}
            error={error}
          />
          <p className="session-caption">Preview code: WDJB-MJHT</p>
          <Button type="submit">Continue</Button>
        </form>
      ) : stage === "signin" ? (
        <>
          <p>
            Sign in to review this device’s request. Signing in does not grant
            access.
          </p>
          <SignInFlow
            name="Alex Morgan"
            onLogin={() =>
              setStage(Date.now() >= deadline ? "expired" : "review")
            }
          />
        </>
      ) : stage === "review" ? (
        <>
          <AuthorizationAccount
            name="Alex Morgan"
            email="alex@example.com"
            picture="/brand/demo-avatar.svg"
          />
          <div className="device-code">
            <code>WDJB-MJHT</code>
          </div>
          <p>Confirm this matches the code in your terminal.</p>
          <div className="authorization-requester">
            <Terminal size={22} aria-hidden="true" />
            <div>
              <strong>Oyzu CLI is requesting access</strong>
              <span>Published by Oyzu / Preview application</span>
            </div>
          </div>
          <AuthorizationPermissions
            scope={context}
            permissions={[
              {
                id: "resources",
                name: "Projects and resources",
                access: "Read-only",
                kind: "resources",
                description:
                  "View project names, resource details, and status in this project. Cannot create, edit, or delete resources.",
              },
              {
                id: "connections",
                name: "Connection metadata",
                access: "Read-only",
                kind: "connections",
                description:
                  "View connection names, identifiers, and status. Cannot read credentials or modify connections.",
              },
            ]}
          />
          <label className="device-confirm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            I started this request and the code matches.
          </label>
          <div className="session-actions">
            <Button
              disabled={!confirmed}
              onClick={() =>
                setStage(Date.now() >= deadline ? "expired" : "approved")
              }
            >
              Authorize device
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                setStage(Date.now() >= deadline ? "expired" : "denied")
              }
            >
              Deny
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setConfirmed(false);
                setStage("signin");
              }}
            >
              Use another account
            </Button>
          </div>
          <details>
            <summary>Preview controls</summary>
            <Button variant="outline" onClick={() => setStage("expired")}>
              Expire request now
            </Button>
          </details>
        </>
      ) : (
        <>
          <p role="status">
            {stage === "approved"
              ? "You can return to your terminal. The CLI can now continue."
              : stage === "denied"
                ? "No access was granted. Return to your terminal to start another request."
                : "This request is no longer valid. Start a new request in your terminal."}
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setStage("code");
              setCode("");
              setError("");
              setConfirmed(false);
              setDeadline(Date.now() + 300000);
            }}
          >
            Start another preview
          </Button>
        </>
      )}
      <p className="session-caption">
        UI reference only. No tokens are issued and no real device is connected.
      </p>
    </section>
  );
}
