import {
  FolderOpen,
  Users,
  Activity,
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
      {
        id: "projects",
        label: "Projects",
        href: "#pages/resources",
        icon: FolderOpen,
      },
      {
        id: "members",
        label: "Members & access",
        href: "#pages/members",
        icon: Users,
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
        id: "setup",
        label: "Create connection",
        href: "#pages/connection-wizard",
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
  if (hash.startsWith("#account/")) return "account";
  if (
    ["#components", "#resources", "#controls", "#feedback", "#states"].includes(
      hash,
    )
  )
    return "components";
  if (hash === "#pages/members") return "members";
  if (hash === "#pages/activity") return "activity";
  if (hash === "#pages/connection-wizard") return "setup";
  if (hash === "#pages/connection") return "editor";
  if (hash === "#pages/secrets") return "secrets";
  if (hash.startsWith("#pages/")) return "projects";
  return "settings";
}
