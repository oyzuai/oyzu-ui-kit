import { useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import "./oauth-device.css";

export function DeviceAuthorization({
  connected = false,
  onChange = () => {},
}: {
  connected?: boolean;
  onChange?: (value: boolean) => void;
}) {
  const [status, setStatus] = useState(connected ? "approved" : "idle");
  const [code, setCode] = useState("");
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState("");
  useEffect(() => {
    if (status !== "waiting") return;
    const timer = setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (time >= deadline) {
        setStatus("expired");
        setOpen(false);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [status, deadline]);
  function start() {
    const alphabet = "BCDFGHJKLMNPQRSTVWXYZ";
    const value = Array.from(
      crypto.getRandomValues(new Uint8Array(8)),
      (b) => alphabet[b % alphabet.length],
    ).join("");
    setCode(value.slice(0, 4) + "-" + value.slice(4));
    setDeadline(Date.now() + 300000);
    setNow(Date.now());
    setStatus("waiting");
    setCopied("");
    onChange(false);
  }
  function finish(approved: boolean) {
    if (Date.now() >= deadline) {
      setStatus("expired");
      setOpen(false);
      return;
    }
    setStatus(approved ? "approved" : "denied");
    setOpen(false);
    onChange(approved);
  }
  const seconds = Math.max(0, Math.ceil((deadline - now) / 1000));
  return (
    <section className="device-panel">
      <div className="device-heading">
        <span className="eyebrow">DEVICE AUTHORIZATION · PREVIEW</span>
        <h2>
          {status === "approved" ? "Account connected" : "Connect your account"}
        </h2>
      </div>
      {status === "waiting" ? (
        <>
          <p>
            Open the authorization page and enter this code. Keep this window
            open; it updates when you approve.
          </p>
          <div className="device-code">
            <code>{code}</code>
            <Button
              variant="ghost"
              aria-label="Copy device code"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(code);
                  setCopied("Code copied");
                } catch {
                  setCopied(
                    "Could not copy. Select and copy the code manually.",
                  );
                }
              }}
            >
              <Copy />
            </Button>
          </div>
          <p className="session-caption" role="status">
            {copied || "Waiting for authorization…"}
          </p>
          <p>
            Verification address <code>https://identity.example/device</code>
          </p>
          <div className="session-actions">
            <Button onClick={() => setOpen(true)}>
              Open authorization page
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setStatus("cancelled");
                setOpen(false);
              }}
            >
              Cancel request
            </Button>
          </div>
          <p className="session-caption">
            Code expires in {Math.floor(seconds / 60)}:
            {String(seconds % 60).padStart(2, "0")}. Local provider simulation;
            no external page is opened.
          </p>
          <details>
            <summary>Preview controls</summary>
            <Button
              variant="outline"
              onClick={() => {
                setStatus("expired");
                setOpen(false);
              }}
            >
              Expire code now
            </Button>
          </details>
        </>
      ) : status === "approved" ? (
        <>
          <p>
            <strong>Alex Morgan</strong> · alex@example.com
          </p>
          <p>Granted: read repositories and connection metadata.</p>
          <Button variant="outline" onClick={start}>
            Change authorized account
          </Button>
        </>
      ) : (
        <>
          <p role="status">
            {status === "idle"
              ? "Authorize access without entering a password here."
              : status === "expired"
                ? "This code has expired. Generate a new code to continue."
                : status === "denied"
                  ? "Authorization was denied. No access was granted."
                  : "Request cancelled. No access was granted."}
          </p>
          <Button onClick={start}>
            {status === "idle" ? "Generate device code" : "Generate new code"}
          </Button>
        </>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="device-approval-modal">
          <DialogTitle>Authorize connector access</DialogTitle>
          <DialogDescription>
            Simulated provider approval. Compare this code with the one in your
            connector.
          </DialogDescription>
          <div className="device-code">
            <code>{code}</code>
          </div>
          <p>Signed in as alex@example.com</p>
          <ul>
            <li>Read repositories</li>
            <li>Read connection metadata</li>
          </ul>
          <p>Only approve if you started this request.</p>
          <div className="session-actions">
            <Button onClick={() => finish(true)}>Authorize connector</Button>
            <Button variant="outline" onClick={() => finish(false)}>
              Deny
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
export function OAuthDevicePage() {
  const [connected, setConnected] = useState(false);
  return (
    <div className="oauth-study">
      <header>
        <span className="eyebrow">AUTHORIZATION / INTERACTION STUDY</span>
        <h1>A secure handoff.</h1>
        <p>
          The connector stays here while authorization happens on a dedicated
          page.
        </p>
      </header>
      <div className="session-actions oauth-tabs">
        <Button variant="outline" asChild>
          <a href="/authorize/device" target="_blank" rel="noopener noreferrer">
            Open Oyzu device authorization
          </a>
        </Button>
      </div>
      <DeviceAuthorization connected={connected} onChange={setConnected} />
    </div>
  );
}
