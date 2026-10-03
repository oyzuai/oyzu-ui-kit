import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, Building2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

type Outcome = "success" | "unavailable" | "denied" | "expired";
export function SignInFlow({
  onLogin,
  name,
}: {
  onLogin: () => void;
  name: string;
}) {
  const [stage, setStage] = useState<"choose" | "sso" | "handoff" | "denied">(
    "choose",
  );
  const [provider, setProvider] = useState("Google");
  const [email, setEmail] = useState("");
  const [outcome, setOutcome] = useState<Outcome>("success");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [fail, setFail] = useState(false);
  const generation = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  useEffect(() => {
    if (stage !== "choose") heading.current?.focus();
  }, [stage]);
  function reset() {
    generation.current++;
    setPending(false);
    setError("");
    setStage("choose");
  }
  function handoff(next: string) {
    setProvider(next);
    setError("");
    setStage("handoff");
  }
  async function complete(demo = false) {
    const run = ++generation.current;
    setPending(true);
    setError("");
    await new Promise((resolve) => setTimeout(resolve, 700));
    if (run !== generation.current) return;
    setPending(false);
    if (demo ? fail : outcome === "unavailable") {
      setError("We could not sign you in. Try again.");
      return;
    }
    if (!demo && outcome === "expired") {
      setError(
        "This sign-in request expired. Start again to open a new session.",
      );
      return;
    }
    if (!demo && outcome === "denied") {
      setStage("denied");
      return;
    }
    onLogin();
  }
  return (
    <div className="signin-flow">
      {stage === "choose" ? (
        <>
          <div className="signin-social">
            {["Google", "GitHub"].map((label) => (
              <Button
                key={label}
                variant="outline"
                onClick={() => handoff(label)}
              >
                <img src={`/brands/${label.toLowerCase()}.svg`} alt="" />
                Continue with {label}
              </Button>
            ))}
          </div>
          <div className="signin-divider">
            <span>or use your work account</span>
          </div>
          <Button
            className="signin-sso"
            variant="outline"
            onClick={() => {
              setError("");
              setStage("sso");
            }}
          >
            <Building2 />
            Sign in with SSO
            <ArrowUpRight />
          </Button>
          <p className="session-caption">
            Use your organization’s identity provider to access your workspace.
          </p>
        </>
      ) : (
        <section className="signin-step">
          <Button variant="ghost" onClick={reset}>
            <ArrowLeft />
            All sign-in options
          </Button>
          <h2 ref={heading} tabIndex={-1}>
            {stage === "sso"
              ? "Find your workspace"
              : stage === "denied"
                ? "Workspace access required"
                : `Continue with ${provider}`}
          </h2>
          {stage === "sso" ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (
                  email.trim().toLowerCase().split("@")[1] !== "example.com"
                ) {
                  setError(
                    "No SSO workspace found for this domain in the preview. Try alex@example.com.",
                  );
                  return;
                }
                handoff("Acme SSO");
              }}
            >
              <p>
                Enter your work email to find your organization’s single
                sign-on.
              </p>
              <label htmlFor="sso-email">Work email</label>
              <input
                id="sso-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
                aria-describedby="sso-hint"
              />
              <p id="sso-hint" className="session-caption">
                Try alex@example.com. Discovery is simulated locally.
              </p>
              <Button type="submit">
                Continue to SSO
                <ArrowUpRight />
              </Button>
            </form>
          ) : stage === "denied" ? (
            <>
              <p>
                Your identity was verified, but this account hasn’t been granted
                access. Ask your workspace administrator for an invitation.
              </p>
              <Button onClick={reset}>Use another account</Button>
            </>
          ) : (
            <>
              <div className="signin-provider">
                <ShieldCheck />
                <div>
                  <strong>
                    {provider === "Acme SSO"
                      ? "Acme organization"
                      : "Your identity, connected"}
                  </strong>
                  <p>
                    {provider === "Acme SSO"
                      ? email
                      : `Sign in using your ${provider} account.`}
                  </p>
                </div>
              </div>
              <p>
                In a connected application, {provider} would handle sign-in and
                verification. This reference simulates the return to Oyzu.
              </p>
              <div className="session-actions">
                <Button
                  disabled={pending || (outcome === "expired" && !!error)}
                  onClick={() => complete()}
                >
                  {pending ? "Signing in…" : "Complete simulated sign-in"}
                </Button>
                <Button variant="ghost" onClick={reset}>
                  {error && outcome === "expired"
                    ? "Start again"
                    : "Cancel sign-in"}
                </Button>
              </div>
            </>
          )}
        </section>
      )}
      {error && (
        <p className="field-error signin-error" role="alert">
          {error}
        </p>
      )}
      {pending && (
        <span className="session-caption" role="status">
          Verifying your session…
        </span>
      )}
      <div className="signin-preview">
        <span className="eyebrow">INTERACTION PREVIEW</span>
        <label htmlFor="signin-outcome">Provider response</label>
        <select
          id="signin-outcome"
          value={outcome}
          disabled={pending}
          onChange={(event) => {
            setOutcome(event.target.value as Outcome);
            setError("");
          }}
        >
          <option value="success">Success</option>
          <option value="unavailable">Provider unavailable</option>
          <option value="denied">Access denied</option>
          <option value="expired">Expired session</option>
        </select>
      </div>
      {stage === "choose" && (
        <div className="signin-demo">
          <p className="session-caption">Just exploring? Continue as {name}.</p>
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => complete(true)}
          >
            {pending ? "Signing in…" : "Continue with demo account"}
          </Button>
          <label className="session-caption">
            <input
              type="checkbox"
              checked={fail}
              disabled={pending}
              onChange={(event) => setFail(event.target.checked)}
            />{" "}
            Simulate a sign-in failure
          </label>
        </div>
      )}
    </div>
  );
}
