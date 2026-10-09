import { useState } from "react";
import { WorkspaceArrival } from "./workspace-arrival";
import { rememberedContext } from "./workspace-data";
import type { NavigationContext } from "../components/patterns/active-context";
import { SignInFlow } from "./sign-in-flow";
import { Button } from "../components/ui/button";
export function SessionExample({
  signedIn,
  onLogout,
  onLogin,
  name,
}: {
  signedIn: boolean;
  onLogout: () => void;
  onLogin: (context: NavigationContext) => void;
  name: string;
}) {
  const [arrival, setArrival] = useState(false);
  const [scenario, setScenario] = useState("returning");
  return (
    <main className="session-page">
      <a
        href={signedIn ? "#account/profile" : "#session/login"}
        aria-label="Oyzu home"
      >
        <img src="/brand/oyzu-full-logo-color.svg" width="160" alt="Oyzu" />
      </a>
      <section className="session-content">
        {!arrival && (
          <>
            <span className="eyebrow">YOUR OYZU WORKSPACE</span>
            <h1>{signedIn ? "Ready to log out?" : "Welcome back."}</h1>
            <p>
              {signedIn
                ? `You are signed in as ${name}. You can come back whenever you are ready.`
                : "One place for your projects, connections, and team."}
            </p>
          </>
        )}
        {arrival ? (
          <WorkspaceArrival
            invitation={scenario === "invitation"}
            onEnter={onLogin}
            onBack={() => setArrival(false)}
          />
        ) : signedIn ? (
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
            <SignInFlow
              onLogin={() => {
                const last = rememberedContext();
                if (scenario === "returning" && last) onLogin(last);
                else setArrival(true);
              }}
              name={name}
            />
            <div className="signin-preview">
              <label htmlFor="arrival-scenario">After sign-in</label>
              <select
                id="arrival-scenario"
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
              >
                <option value="returning">Return to last workspace</option>
                <option value="picker">Choose a workspace</option>
                <option value="invitation">Review an invitation</option>
              </select>
            </div>
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
