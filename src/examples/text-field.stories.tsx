import { useArgs } from "storybook/preview-api";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { TextField } from "@/components/patterns/text-field";
const meta = {
  title: "Patterns/Text field",
  component: TextField,
  render: function Example(args) {
    const [, updateArgs] = useArgs();
    return <TextField {...args} onChange={(value) => updateArgs({ value })} />;
  },
  parameters: { layout: "centered" },
  args: {
    label: "Workspace name",
    value: "Acme Studio",
    onChange: () => {},
    hint: "A familiar name for your team.",
  },
} satisfies Meta<typeof TextField>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Invalid: Story = {
  args: { value: "", error: "Use at least 2 characters." },
};
export const Disabled: Story = { args: { disabled: true } };
