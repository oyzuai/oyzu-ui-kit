import type { Meta, StoryObj } from "@storybook/react-vite";
import { EmptyState } from "../components/patterns/empty-state";
import "./component-gallery.css";
const meta = {
  title: "Patterns/Empty state",
  component: EmptyState,
  parameters: { layout: "centered" },
  args: {
    title: "A fresh start",
    description: "Your resources will appear here.",
  },
} satisfies Meta<typeof EmptyState>;
export default meta;
type Story = StoryObj<typeof meta>;
export const FirstUse: Story = {};
export const NoResults: Story = {
  args: {
    filtered: true,
    title: "No matching resources",
    description: "Try a different name or status.",
  },
};
