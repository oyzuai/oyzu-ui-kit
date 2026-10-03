import { ChevronDown, FolderOpen, Plug } from "lucide-react";

export type AuthorizationPermission = {
  id: string;
  name: string;
  access: string;
  description: string;
  kind: "resources" | "connections";
};
export function AuthorizationPermissions({
  permissions,
  scope,
}: {
  permissions: AuthorizationPermission[];
  scope: string;
}) {
  return (
    <section
      className="authorization-permissions"
      aria-label="Requested permissions"
    >
      <h2>Requested permissions</h2>
      <div className="permission-list">
        {permissions.map((permission) => {
          const Icon = permission.kind === "resources" ? FolderOpen : Plug;
          return (
            <details className="permission-row" key={permission.id}>
              <summary>
                <Icon size={19} aria-hidden="true" />
                <strong>{permission.name}</strong>
                <span className="permission-access">{permission.access}</span>
                <ChevronDown
                  className="permission-chevron"
                  size={16}
                  aria-hidden="true"
                />
              </summary>
              <p>{permission.description}</p>
            </details>
          );
        })}
      </div>
      <div className="permission-scope">
        <span>Applies to</span>
        <strong>{scope}</strong>
      </div>
    </section>
  );
}
