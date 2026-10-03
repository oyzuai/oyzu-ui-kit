import type { Preview } from "@storybook/react-vite";
import "../src/index.css";
import "../src/App.css";
import "../src/design.css";
const preview: Preview = {
  parameters: { layout: "fullscreen", a11y: { test: "error" } },
};
export default preview;
