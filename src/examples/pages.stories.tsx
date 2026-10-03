import type { Meta, StoryObj } from "@storybook/react-vite";
import App from "../App";
const meta = {
  title: "Experiences/Full pages",
  component: App,
  parameters: { layout: "fullscreen" },
  beforeEach: () => {
    const hash = window.location.hash;
    window.location.hash = "pages/resources";
    return () => {
      window.location.hash = hash;
    };
  },
} satisfies Meta<typeof App>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Interactive: Story = {};
