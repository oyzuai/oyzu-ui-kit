import { useState } from "react";

export function AuthorizationAccount({
  name,
  email,
  picture,
}: {
  name: string;
  email: string;
  picture?: string;
}) {
  const [failedPicture, setFailedPicture] = useState<string>();
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  return (
    <div className="authorization-account">
      <span className="authorization-avatar" aria-hidden="true">
        {picture && failedPicture !== picture ? (
          <img src={picture} alt="" onError={() => setFailedPicture(picture)} />
        ) : (
          initials
        )}
      </span>
      <div>
        <span className="authorization-account-label">Signed in as</span>
        <strong>{name}</strong>
        <span>{email}</span>
      </div>
    </div>
  );
}
