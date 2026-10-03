import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ResourcePicker } from "@/components/patterns/resource-picker";
function Example() {
  const [value, setValue] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  return (
    <div style={{ padding: 32 }}>
      <ResourcePicker
        label="Choose a project"
        items={Array.from({ length: 200 }, (_, i) => ({
          id: `project-${i + 1}`,
          name: `Sample project ${i + 1}`,
          description: i === 5 ? "Access unavailable" : "Fictional workspace",
          disabled: i === 5,
        }))}
        value={value}
        recentIds={recent}
        onChange={(id) => {
          setValue(id);
          if (id)
            setRecent((previous) =>
              [id, ...previous.filter((item) => item !== id)].slice(0, 5),
            );
        }}
      />
    </div>
  );
}
const meta = {
  title: "Patterns/Resource picker",
  component: Example,
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const TwoHundredResources: Story = {};
