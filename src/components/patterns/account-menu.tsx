import {
  ChevronsUpDown,
  LogOut,
  UserRound,
  ShieldCheck,
  KeyRound,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
export function AccountMenu({
  name,
  email,
  compact = false,
}: {
  name: string;
  email: string;
  compact?: boolean;
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={"sidebar-account " + (compact ? "compact" : "")}
          aria-label={`Account menu for ${name}`}
        >
          <span className="user-monogram" aria-hidden="true">
            {initials}
          </span>
          {!compact && (
            <>
              <span className="sidebar-account-copy">
                <strong>{name}</strong>
                <small>{email}</small>
              </span>
              <ChevronsUpDown size={15} />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="account-popover">
        <DropdownMenuLabel>
          <strong>{name}</strong>
          <small>{email}</small>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="#account/profile">
            <UserRound />
            Your profile
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="#account/security">
            <ShieldCheck />
            Security & sessions
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="#account/api-keys">
            <KeyRound />
            API keys
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="#session/logout">
            <LogOut />
            Log out
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
