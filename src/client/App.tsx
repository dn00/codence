import { Routes, Route } from "react-router-dom";
import { Home } from "./pages/Home";
import { Progress } from "./pages/Progress";
import { Library } from "./pages/Library";
import { Settings } from "./pages/Settings";
import { Practice } from "./pages/Practice";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/progress" element={<Progress />} />
      <Route path="/library" element={<Library />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/practice/:sessionId" element={<Practice />} />
    </Routes>
  );
}
