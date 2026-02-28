import { PasskeyBrowser } from "../../../browser SDK/index.js";

const pb = new PasskeyBrowser({
  backendUrl: window.location.origin,   // same origin (Vite proxy forwards to backend)
  rpName:     "Example App",
});

export default pb;
