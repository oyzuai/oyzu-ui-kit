import type { ActionId } from "./assistant-engine.ts";

export const confirmFirst: Partial<Record<ActionId, string>> = {
  "apply-fix":
    "Open the proposed change as a suggested change on pull request #482? Nothing will be sent until you confirm.",
  "rerun-failed":
    "Rerun payments-core/test for 9c41e2a on Acme on-prem? It creates a new attempt of the same check; the commit and command don't change.",
  rerun: "Rerun the whole check for this commit?",
  "drain-manager":
    "Drain mgr-onprem-02? It stops claiming new jobs; jobs already running finish.",
  "rotate-secret":
    "Generate a new webhook secret for github-acme-legacy? The current one keeps working for 24 hours.",
};

export function actionResult(
  id: ActionId,
  target?: string,
): string | undefined {
  switch (id) {
    case "rerun-failed":
      return "Queued attempt 3 of run 9012 on Acme on-prem. The check on #482 shows queued again.";
    case "rerun":
      return "Queued a new attempt of the same check and commit.";
    case "apply-fix":
      return "Opened the proposed change on pull request #482 for review.";
    case "drain-manager":
      return `${target ?? "mgr-onprem-02"} is draining. It finishes running jobs and claims nothing new.`;
    case "rotate-secret":
      return "New webhook secret generated and shown once to pool admins. The old one works for 24 hours.";
    case "explain":
      return "Explained against today's bindings: still no match, because PR #483 is still a draft.";
    case "replay":
      return "Replayed as a new delivery linked to the original.";
    default:
      return undefined;
  }
}
