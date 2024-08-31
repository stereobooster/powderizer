import { defineConfig } from "vite";
import monacoEditorPlugin from "vite-plugin-monaco-editor";

export default defineConfig({
  plugins: [
    // @ts-expect-error xxx
    monacoEditorPlugin.default({}),
  ],
  build: {
    target: "ES2022",
  },
});
