/** @type {import("rollup").RollupOptions[]} */
export default [
  // ESM bundle (for bundlers / modern browsers via <script type="module">)
  {
    input: "src/PasskeyBrowser.js",
    output: {
      file: "dist/index.js",
      format: "esm",
      exports: "named",
    },
  },
  // UMD bundle (for direct <script> tag usage, exposes window.PasskeyBrowser)
  {
    input: "src/PasskeyBrowser.js",
    output: {
      file: "dist/index.umd.js",
      format: "umd",
      name: "PasskeySDK",
      exports: "named",
    },
  },
];
