import { useState } from "react";
import { Button } from "@/components/ui/button";
export function SessionExample({
  signedIn,
  onLogout,
  onLogin,
  name,
}: {
  signedIn: boolean;
  onLogout: () => void;
  onLogin: () => void;
  name: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [fail, setFail] = useState(false);
  async function login() {
    setPending(true);
    setError("");
    await new Promise((resolve) => setTimeout(resolve, 700));
    setPending(false);
    if (fail) {
      setError("We could not sign you in. Try again.");
      return;
    }
    onLogin();
  }
  return (
    <main className="session-page">
      <a
        href={signedIn ? "#account/profile" : "#session/login"}
        aria-label="Oyzu home"
      >
        <img src="/brand/oyzu-full-logo-color.svg" width="160" alt="Oyzu" />
      </a>
      <section className="session-content">
        <span className="eyebrow">YOUR OYZU WORKSPACE</span>
        <h1>{signedIn ? "Ready to log out?" : "Welcome back."}</h1>
        <p>
          {signedIn
            ? `You are signed in as ${name}. You can come back whenever you are ready.`
            : "One place for your projects, connections, and team."}
        </p>
        {signedIn ? (
          <>
            <p className="session-caption">
              Logging out ends this preview session. Unsaved profile edits will
              be discarded.
            </p>
            <div className="session-actions">
              <Button onClick={onLogout}>Log out of this session</Button>
              <Button variant="ghost" asChild>
                <a href="#account/profile">Stay signed in</a>
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="session-demo">
              <strong>Explore with a demo account</strong>
              <p>No password or real account needed. Continue as {name}.</p>
              <Button disabled={pending} onClick={login}>
                {pending ? "Signing in…" : "Continue with demo account"}
              </Button>
              {error && (
                <p role="alert" className="field-error">
                  {error}
                </p>
              )}
            </div>
            <label className="session-caption">
              <input
                type="checkbox"
                checked={fail}
                disabled={pending}
                onChange={(event) => setFail(event.target.checked)}
              />{" "}
              Simulate a sign-in failure
            </label>
          </>
        )}
        <p className="session-caption">
          UI reference only. Authentication is simulated; no credentials are
          collected.
        </p>
      </section>
      <footer>OYZU / A SPACE TO BUILD</footer>
    </main>
  );
}
