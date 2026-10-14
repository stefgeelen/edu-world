import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installStaleChunkReload } from "./lib/reloadOnStaleChunk";

installStaleChunkReload();

createRoot(document.getElementById("root")!).render(<App />);
