import type { StorybookConfig } from "@storybook/react-vite";
const config: StorybookConfig = {
  staticDirs: ["../public"],
  stories: ["../src/examples/**/*.stories.tsx"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs"],
  framework: "@storybook/react-vite",
};
export default config;
