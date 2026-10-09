import type { Meta, StoryObj } from "@storybook/react-vite";
import { StatusBadge } from "../components/patterns/status-badge";
import "./component-gallery.css";
const meta = {
  title: "Patterns/Status badge",
  component: StatusBadge,
  parameters: { layout: "centered" },
  args: { status: "healthy" },
  argTypes: {
    status: {
      control: "select",
      options: ["healthy", "pending", "paused", "warning", "failed"],
    },
  },
} satisfies Meta<typeof StatusBadge>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Healthy: Story = {};
export const Pending: Story = { args: { status: "pending" } };
export const Paused: Story = { args: { status: "paused" } };
export const Warning: Story = { args: { status: "warning" } };
export const Failed: Story = { args: { status: "failed" } };
