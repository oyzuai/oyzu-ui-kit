import "./connection-diagnostics.css";
import { Check, LoaderCircle, Circle, X } from "lucide-react";
export function ConnectionDiagnostics({
  status,
  stage,
  endpoint,
}: {
  status: string;
  stage: number;
  endpoint: string;
}) {
  const checks = [
    [
      "Reach service",
      "Resolve the endpoint and establish a secure connection.",
    ],
    ["Authenticate", "Validate the selected authentication method."],
    ["Check access", "Verify access needed by this connection."],
  ];
  const failure =
    status === "unreachable"
      ? 0
      : status === "credentials"
        ? 1
        : status === "permissions"
          ? 2
          : -1;
  return (
    <section
      className="connection-diagnostics"
      data-result={status === "success" ? "success" : failure >= 0 ? "failure" : "pending"}
      aria-label="Connection diagnostics"
    >
      <header>
        <div>
          <span className="eyebrow">CONNECTION CHECK</span>
          <h3 aria-live="polite">
            {status === "idle"
              ? "Ready to verify"
              : status === "running"
                ? "Checking your connection"
                : status === "success"
                  ? "Connection verified"
                  : "Attention needed"}
          </h3>
        </div>
        <span className="diagnostic-demo">SIMULATED</span>
      </header>
      <p className="diagnostic-endpoint">{endpoint}</p>
      <ol>
        {checks.map(([title, description], i) => {
          const state =
            status === "idle"
              ? "waiting"
              : status === "running"
                ? i < stage
                  ? "passed"
                  : i === stage
                    ? "running"
                    : "waiting"
                : failure === i
                  ? "failed"
                  : failure >= 0 && i > failure
                    ? "skipped"
                    : "passed";
          const Icon =
            state === "passed"
              ? Check
              : state === "failed"
                ? X
                : state === "running"
                  ? LoaderCircle
                  : Circle;
          return (
            <li key={title} data-state={state}>
              <Icon size={17} aria-hidden="true" />
              <div>
                <strong>{title}</strong>
                <p>
                  {state === "failed"
                    ? i === 0
                      ? "Service unreachable. Check the endpoint and network access."
                      : i === 1
                        ? "Credentials were rejected. Review your selected secret or sign-in method."
                        : "Authentication succeeded, but access is insufficient. Review the credential permissions."
                    : description}
                </p>
              </div>
              <span>
                {state === "running"
                  ? "Checking…"
                  : state === "passed"
                    ? "Passed"
                    : state === "failed"
                      ? "Failed"
                      : state === "skipped"
                        ? "Skipped"
                        : "Waiting"}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="diagnostic-note" role="status">
        {status === "running"
          ? `Running check ${stage + 1} of 3`
          : status === "success"
            ? "All 3 checks passed. Ready to create."
            : failure >= 0
              ? "Resolve the failed check and test again."
              : "No requests have been sent. This preview simulates each check."}
      </p>
    </section>
  );
}
