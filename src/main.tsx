import { createRoot } from "react-dom/client";
import { LazyMotion, MotionConfig, domAnimation } from "framer-motion";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <MotionConfig reducedMotion="user">
    <LazyMotion strict features={domAnimation}>
      <App />
    </LazyMotion>
  </MotionConfig>,
);
