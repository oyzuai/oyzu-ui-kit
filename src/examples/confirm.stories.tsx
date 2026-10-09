import type { Meta, StoryObj } from "@storybook/react-vite";
import { ConfirmAction } from "../components/patterns/confirm-action";
import { Button } from "../components/ui/button";
import "./component-gallery.css";
const meta = {
  title: "Patterns/Confirm action",
  component: ConfirmAction,
  parameters: { layout: "centered" },
  args: {
    title: "Remove this resource?",
    description: "This example does not affect real data.",
    actionLabel: "Remove resource",
    confirmText: "remove",
    trigger: <Button variant="destructive">Remove resource</Button>,
    onConfirm: async () => {
      await new Promise((resolve) => setTimeout(resolve, 700));
    },
  },
} satisfies Meta<typeof ConfirmAction>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Confirm: Story = {};
export const Failure: Story = {
  args: {
    onConfirm: async () => {
      throw new Error("Could not remove this resource. Please try again.");
    },
  },
};
