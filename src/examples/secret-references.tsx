import { useState } from "react";
import {
  SecretSelector,
  type SecretScope,
} from "../components/patterns/secret-selector";
import { PageLayout } from "../components/patterns/page-layout";
import { scopes, referencesFor } from "./secret-samples";
export function SecretReferenceExample() {
  const [scope, setScope] = useState<SecretScope>("project");
  const [value, setValue] = useState<string | null>(null);
  return (
    <PageLayout
      eyebrow="PATTERNS / SECRET REFERENCES"
      title="Select a secret"
      description="Choose a reference from your current scope or an ancestor. Secret values are never displayed."
    >
      <div className="secret-example">
        <label className="secret-scope-filter">
          Current context
          <select
            value={scope}
            onChange={(event) => {
              setScope(event.target.value as SecretScope);
              setValue(null);
            }}
          >
            {scopes.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <SecretSelector
          references={referencesFor(scope)}
          value={value}
          onChange={setValue}
        />
        <p>
          Example path: Acme account / Engineering / Developer tools / Source
          control.
        </p>
        <p>
          Scope visibility is a provisional demo rule. The platform must supply
          authorized references for the exact context.
        </p>
      </div>
    </PageLayout>
  );
}
