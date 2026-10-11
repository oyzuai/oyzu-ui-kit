import { useCallback, useEffect, useRef, useState } from "react";

/** Runs an async submit that can stall: after `slowAfterMs` it reports `slow` so the UI can
 *  offer a way out, and `cancel()` aborts the signal handed to the operation and unlocks. */
export function useAbortableSubmit(slowAfterMs = 10_000) {
  const [pending, setPending] = useState(false);
  const [slow, setSlow] = useState(false);
  const current = useRef<
    { controller: AbortController; timer: number } | undefined
  >(undefined);
  const finish = useCallback(() => {
    if (current.current) window.clearTimeout(current.current.timer);
    current.current = undefined;
    setPending(false);
    setSlow(false);
  }, []);
  const run = useCallback(
    /** Resolves false when the user stopped waiting, so late results are ignored. */
    async (operation: (signal: AbortSignal) => Promise<void>) => {
      const controller = new AbortController();
      const timer = window.setTimeout(() => setSlow(true), slowAfterMs);
      const mine = { controller, timer };
      current.current = mine;
      setPending(true);
      try {
        await operation(controller.signal);
        return !controller.signal.aborted;
      } catch (cause) {
        if (controller.signal.aborted) return false;
        throw cause;
      } finally {
        if (current.current === mine) finish();
      }
    },
    [finish, slowAfterMs],
  );
  const cancel = useCallback(() => {
    current.current?.controller.abort();
    finish();
  }, [finish]);
  useEffect(() => () => current.current?.controller.abort(), []);
  return { pending, slow, run, cancel };
}
