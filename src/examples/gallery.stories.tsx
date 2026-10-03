import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentGallery } from "./component-gallery";
const meta = {
  title: "Experiences/Component library",
  component: ComponentGallery,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ComponentGallery>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Interactive: Story = {};
