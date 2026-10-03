import type { Meta, StoryObj } from "@storybook/react-vite";
import { FeedbackBanner } from "@/components/patterns/feedback-banner";
import "./component-gallery.css";
const meta = {
  title: "Patterns/Feedback banner",
  component: FeedbackBanner,
  parameters: { layout: "centered" },
  args: {
    title: "Your changes are saved.",
    children: "You can continue working.",
    tone: "success",
  },
} satisfies Meta<typeof FeedbackBanner>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Success: Story = {};
export const Information: Story = {
  args: {
    tone: "info",
    title: "A little context",
    children: "This setting applies to new sessions.",
  },
};
export const Warning: Story = {
  args: {
    tone: "warning",
    title: "Review before continuing",
    children: "A connection needs attention.",
  },
};
export const Error: Story = {
  args: {
    tone: "error",
    title: "We couldn’t save your changes",
    children: "Your draft is safe. Please try again.",
  },
};
