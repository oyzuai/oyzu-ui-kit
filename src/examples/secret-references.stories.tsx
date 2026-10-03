import type { Meta, StoryObj } from "@storybook/react-vite";
import { SecretReferenceExample } from "./secret-references";
const meta = {
  title: "Patterns/Scoped secret selector",
  component: SecretReferenceExample,
} satisfies Meta<typeof SecretReferenceExample>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Interactive: Story = {};
