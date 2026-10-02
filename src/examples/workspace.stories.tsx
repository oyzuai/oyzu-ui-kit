import type { Meta, StoryObj } from "@storybook/react-vite";
import App from "../App";
const meta = {
  title: "Experiences/Workspace settings",
  component: App,
  parameters: { layout: "fullscreen" },
  argTypes: {
    initialMode: { control: "select", options: ["normal", "slow", "fail"] },
  },
} satisfies Meta<typeof App>;
export default meta;
type Story = StoryObj<typeof meta>;
export const SuccessfulSave: Story = { args: { initialMode: "normal" } };
export const SlowSave: Story = { args: { initialMode: "slow" } };
export const FailedSave: Story = { args: { initialMode: "fail" } };
