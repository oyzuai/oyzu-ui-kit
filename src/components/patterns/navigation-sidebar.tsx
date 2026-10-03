import { type ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
export type SidebarGroup = {
  id: string;
  label: string;
  items: readonly {
    id: string;
    label: string;
    href: string;
    icon: LucideIcon;
  }[];
};
export function NavigationSidebar({
  contextWidget,
  accountWidget,
  groups,
  activeId,
  location,
  workspaceName,
  collapsed,
  closedGroups,
  onCollapsedChange,
  onGroupsChange,
}: {
  contextWidget?: (compact: boolean) => ReactNode;
  accountWidget?: (compact: boolean) => ReactNode;
  groups: readonly SidebarGroup[];
  activeId: string;
  location: string;
  workspaceName: string;
  collapsed: boolean;
  closedGroups: readonly string[];
  onCollapsedChange: (value: boolean) => void;
  onGroupsChange: (value: string[]) => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const previousLocation = useRef(location);
  const focusContent = useRef(false);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (previousLocation.current !== location) {
      previousLocation.current = location;
      focusContent.current = true;
      setMobileOpen(false);
      const group = groups.find((group) =>
        group.items.some((item) => item.id === activeId),
      );
      if (group && closedGroups.includes(group.id))
        onGroupsChange(closedGroups.filter((id) => id !== group.id));
    }
  }, [location, activeId, groups, closedGroups, onGroupsChange]);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 761px)");
    const resize = () => {
      if (media.matches) {
        focusContent.current = false;
        setMobileOpen(false);
      }
    };
    media.addEventListener("change", resize);
    return () => media.removeEventListener("change", resize);
  }, []);
  function links(mobile: boolean) {
    const rail = !mobile && collapsed;
    return (
      <TooltipProvider delayDuration={200}>
        <nav
          aria-label={
            mobile ? "Mobile primary navigation" : "Primary navigation"
          }
          className={"navigation-groups" + (rail ? " navigation-rail" : "")}
        >
          {groups.map((group) => {
            const open = rail || !closedGroups.includes(group.id);
            const active = group.items.some((item) => item.id === activeId);
            return (
              <section key={group.id} className="navigation-group">
                <button
                  type="button"
                  className="navigation-group-toggle"
                  aria-expanded={open}
                  aria-controls={(mobile ? "mobile-" : "desktop-") + group.id}
                  onClick={() => {
                    if (rail) {
                      onCollapsedChange(false);
                      onGroupsChange(
                        closedGroups.filter((id) => id !== group.id),
                      );
                    } else
                      onGroupsChange(
                        open
                          ? [...closedGroups, group.id]
                          : closedGroups.filter((id) => id !== group.id),
                      );
                  }}
                >
                  <span>{group.label}</span>
                  {!open && active && (
                    <span
                      className="navigation-active-dot"
                      aria-label="Contains current page"
                    />
                  )}
                  <ChevronDown size={13} aria-hidden="true" />
                </button>
                <div
                  id={(mobile ? "mobile-" : "desktop-") + group.id}
                  hidden={!open}
                >
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const link = (
                      <a
                        className="navigation-link"
                        href={item.href}
                        aria-label={item.label}
                        aria-current={item.id === activeId ? "page" : undefined}
                        onClick={() => {
                          if (mobile && item.href === location) {
                            focusContent.current = true;
                            setMobileOpen(false);
                          }
                        }}
                      >
                        <Icon size={18} aria-hidden="true" />
                        <span>{item.label}</span>
                      </a>
                    );
                    return rail ? (
                      <Tooltip key={item.id}>
                        <TooltipTrigger asChild>{link}</TooltipTrigger>
                        <TooltipContent side="right">
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <div key={item.id}>{link}</div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </nav>
      </TooltipProvider>
    );
  }
  const brand = (small: boolean) => (
    <a className="navigation-brand" href="#main" aria-label="Oyzu home">
      <img
        src={
          small
            ? "/brand/oyzu-mark-color.svg"
            : "/brand/oyzu-full-logo-color.svg"
        }
        alt="Oyzu"
        width={small ? 32 : 160}
      />
    </a>
  );
  return (
    <>
      <aside
        className={"navigation-desktop" + (collapsed ? " is-collapsed" : "")}
        aria-label="Workspace sidebar"
      >
        <div className="navigation-brand-row">{brand(collapsed)}</div>
        {contextWidget?.(collapsed)}
        {links(false)}
        <footer className="navigation-footer">
          {accountWidget?.(collapsed)}
          <button
            ref={toggle}
            type="button"
            className="navigation-collapse"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            onClick={() => onCollapsedChange(!collapsed)}
          >
            {collapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
            <span>{collapsed ? "Expand" : "Collapse sidebar"}</span>
          </button>
          {!collapsed && <small>OYZU / UI EXPLORATION</small>}
        </footer>
      </aside>
      <div className="navigation-mobile-bar">
        {brand(false)}
        <Dialog
          open={mobileOpen}
          onOpenChange={(open) => {
            focusContent.current = false;
            setMobileOpen(open);
          }}
        >
          <DialogTrigger asChild>
            <button
              type="button"
              className="navigation-menu-button"
              aria-label="Open navigation"
            >
              <Menu size={21} />
              <span>Menu</span>
            </button>
          </DialogTrigger>
          <DialogContent
            className="navigation-mobile-drawer"
            onCloseAutoFocus={(event) => {
              if (window.matchMedia("(min-width: 761px)").matches) {
                event.preventDefault();
                toggle.current?.focus();
              } else if (focusContent.current) {
                event.preventDefault();
                document.getElementById("main")?.focus();
              }
            }}
          >
            <DialogTitle>Navigation</DialogTitle>
            <DialogDescription>
              {workspaceName} · Demo workspace
            </DialogDescription>
            {contextWidget?.(false)}
            {links(true)}
            <div
              onClick={(event) => {
                const link = (event.target as Element).closest("a[href]");
                if (link?.getAttribute("href") === location) {
                  focusContent.current = true;
                  setMobileOpen(false);
                }
              }}
            >
              {accountWidget?.(false)}
            </div>
            <p className="navigation-mobile-note">Reusable Oyzu UI patterns</p>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
