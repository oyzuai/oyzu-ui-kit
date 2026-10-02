import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { IdentityFields } from "@/components/patterns/identity-fields";
import {
  identifierError,
  type IdentityDraft,
} from "@/components/patterns/identity";

function IdentityExample({
  saved = false,
  custom = false,
}: {
  saved?: boolean;
  custom?: boolean;
}) {
  const [value, setValue] = useState<IdentityDraft>({
    name: "Production API",
    identifier: "production-api",
    identifierSource: custom ? "custom" : "automatic",
  });
  return (
    <div style={{ width: "min(460px, calc(100vw - 40px))", padding: 20 }}>
      {saved ? (
        <IdentityFields
          mode="saved"
          value={value}
          onNameChange={(name) => setValue({ ...value, name })}
        />
      ) : (
        <IdentityFields
          mode="create"
          value={value}
          onChange={setValue}
          identifierError={identifierError(value.identifier)}
        />
      )}
    </div>
  );
}
const meta = {
  title: "Patterns/Name and identifier",
  component: IdentityExample,
  parameters: { layout: "centered" },
} satisfies Meta<typeof IdentityExample>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Generated: Story = {};
export const Custom: Story = { args: { custom: true } };
export const Saved: Story = { args: { saved: true } };
