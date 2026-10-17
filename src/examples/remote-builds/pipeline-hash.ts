export type PipelinePage =
  | { name: "executions" }
  | { name: "run"; runId: string; attempt?: number; focusSeq?: number }
  | { name: "triggers" }
  | { name: "pools" }
  | { name: "checks" }
  | { name: "settings" };

export function parsePipelineHash(
  hash: string,
  runs: readonly { id: string; number: number }[],
): PipelinePage {
  const value = hash.replace(/^#/, "");
  const run = value.match(
    /^pipeline-run-(\d+)(?:-attempt-(\d+))?(?:-L(\d+))?$/,
  );
  if (run) {
    const found = runs.find((item) => item.number === Number(run[1]));
    if (found)
      return {
        name: "run",
        runId: found.id,
        attempt: run[2] ? Number(run[2]) : undefined,
        focusSeq: run[3] ? Number(run[3]) : undefined,
      };
  }
  const name = value.replace(/^pipeline-?/, "");
  if (
    name === "triggers" ||
    name === "pools" ||
    name === "checks" ||
    name === "settings"
  )
    return { name };
  return { name: "executions" };
}
