import { PasskeyBrowser } from "../../../browser SDK/index.js";

const pb = new PasskeyBrowser({
  backendUrl: "",      // empty = same origin (Vite proxy forwards to localhost:3001)
  rpName:     "Example App",
});

export default pb;
