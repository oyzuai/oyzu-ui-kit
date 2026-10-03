import type { Meta, StoryObj } from "@storybook/react-vite";
import App from "../App";
const meta = {
  title: "Experiences/Connection editor",
  component: App,
  parameters: { layout: "fullscreen" },
  beforeEach: () => {
    const hash = location.hash;
    location.hash = "pages/connection";
    return () => {
      location.hash = hash;
    };
  },
} satisfies Meta<typeof App>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Interactive: Story = {};
