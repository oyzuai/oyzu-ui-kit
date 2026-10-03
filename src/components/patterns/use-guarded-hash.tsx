import { useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
/** Defers app navigation while the caller has an unsaved draft. */
export function useGuardedHash(dirty: boolean, busy: boolean) {
  const [hash, setHash] = useState(() => window.location.hash);
  const [pending, setPending] = useState<null | (() => void)>(null);
  const bypass = useRef(false);
  useEffect(() => {
    function changed() {
      const next = window.location.hash;
      if ((dirty || busy) && !bypass.current) {
        history.replaceState(
          null,
          "",
          location.pathname + location.search + hash,
        );
        if (!busy)
          setPending(() => () => {
            window.location.hash = next;
            setHash(next);
          });
      } else setHash(next);
    }
    function clicked(event: MouseEvent) {
      if (
        bypass.current ||
        (!dirty && !busy) ||
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const target = (event.target as Element).closest<HTMLElement>(
        "a[href],button.nav-item,button.gallery-toggle",
      );
      if (!target) return;
      const href = target.getAttribute("href");
      if (href && href === window.location.hash) return;
      event.preventDefault();
      event.stopPropagation();
      if (!busy) setPending(() => () => target.click());
    }
    function unload(event: BeforeUnloadEvent) {
      if (dirty || busy) {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    window.addEventListener("hashchange", changed);
    document.addEventListener("click", clicked, true);
    window.addEventListener("beforeunload", unload);
    return () => {
      window.removeEventListener("hashchange", changed);
      document.removeEventListener("click", clicked, true);
      window.removeEventListener("beforeunload", unload);
    };
  }, [dirty, busy, hash]);
  const guard = (
    <AlertDialog
      open={!!pending}
      onOpenChange={(open) => {
        if (!open) setPending(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard your changes?</AlertDialogTitle>
          <AlertDialogDescription>
            Your connection has unsaved changes. Keep editing or discard them to
            leave this page.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep editing</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              bypass.current = true;
              pending?.();
              setPending(null);
              setTimeout(() => {
                bypass.current = false;
              }, 0);
            }}
          >
            Discard and leave
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
  return { hash, guard };
}
