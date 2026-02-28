import { nodeResolve } from "@rollup/plugin-node-resolve";

/** @type {import("rollup").RollupOptions[]} */
export default [
  // ESM build
  {
    input: "src/PasskeyClient.js",
    external: ["axios"],
    plugins: [nodeResolve()],
    output: {
      file: "dist/index.js",
      format: "esm",
      exports: "named",
    },
  },
  // CJS build
  {
    input: "src/PasskeyClient.js",
    external: ["axios"],
    plugins: [nodeResolve()],
    output: {
      file: "dist/index.cjs",
      format: "cjs",
      exports: "named",
    },
  },
];
