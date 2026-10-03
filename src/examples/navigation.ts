import {
  Bot,
  FolderOpen,
  Users,
  Activity,
  History,
  Settings2,
  Plug,
  SlidersHorizontal,
  KeyRound,
  UserRound,
  Layers3,
} from "lucide-react";
import type { SidebarGroup } from "@/components/patterns/navigation-sidebar";
export const navigationGroups: SidebarGroup[] = [
  {
    id: "workspace",
    label: "Workspace",
    items: [
      { id: "automation", label: "Automation identities", href: "#pages/automation", icon: Bot },
      {
        id: "access-library",
        label: "People & access",
        href: "#pages/access-library",
        icon: Users,
      },
      {
        id: "access",
        label: "Access assignments",
        href: "#pages/access",
        icon: Users,
      },
      {
        id: "audit",
        label: "Audit trail",
        href: "#pages/audit",
        icon: History,
      },
      {
        id: "projects",
        label: "Projects",
        href: "#pages/resources",
        icon: FolderOpen,
      },
      {
        id: "activity",
        label: "Activity",
        href: "#pages/activity",
        icon: Activity,
      },
      {
        id: "settings",
        label: "Workspace settings",
        href: "#main",
        icon: Settings2,
      },
    ],
  },
  {
    id: "connections",
    label: "Connections",
    items: [
      {
        id: "oauth",
        label: "OAuth device flows",
        href: "#pages/oauth",
        icon: KeyRound,
      },
      {
        id: "connection-detail",
        label: "Connection detail",
        href: "#pages/connection-detail",
        icon: History,
      },
      {
        id: "setup",
        label: "Create connection",
        href: "#pages/connectors",
        icon: Plug,
      },
      {
        id: "editor",
        label: "Connection editor",
        href: "#pages/connection",
        icon: SlidersHorizontal,
      },
      {
        id: "secrets",
        label: "Secret references",
        href: "#pages/secrets",
        icon: KeyRound,
      },
    ],
  },
  {
    id: "personal",
    label: "Personal",
    items: [
      {
        id: "account",
        label: "Account settings",
        href: "#account/profile",
        icon: UserRound,
      },
    ],
  },
  {
    id: "library",
    label: "UI library",
    items: [
      {
        id: "components",
        label: "Components",
        href: "#components",
        icon: Layers3,
      },
    ],
  },
];
export function activeNavigation(hash: string) {
  if (hash === "#pages/automation") return "automation";
  if (hash.startsWith("#pages/user-groups") || hash.startsWith("#pages/access-library") || hash === "#pages/members") return "access-library";
  if (hash.startsWith("#pages/access?") || hash === "#pages/access") return "access";
  if (hash === "#pages/oauth") return "oauth";
  if (hash.startsWith("#account/")) return "account";
  if (
    ["#components", "#resources", "#controls", "#feedback", "#states"].includes(
      hash,
    )
  )
    return "components";
  if (hash === "#pages/connection-detail") return "connection-detail";
  if (hash === "#pages/audit") return "audit";
  if (hash === "#pages/members") return "members";
  if (hash === "#pages/activity") return "activity";
  if (hash.startsWith("#pages/connectors")) return "setup";
  if (hash === "#pages/connection-wizard") return "setup";
  if (hash === "#pages/connection") return "editor";
  if (hash === "#pages/secrets") return "secrets";
  if (hash.startsWith("#pages/")) return "projects";
  return "settings";
}
