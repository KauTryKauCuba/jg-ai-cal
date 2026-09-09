import { useState } from "react";
import "./App.css";
import { GradientBackground } from "./components/ui/favorites";
import ChatPage from "./pages/ChatPage";
import ResumePage from "./pages/ResumePage";

const TABS = [
  {
    id: "resume",
    label: "Resume",
    heading: "Resume Parser (Provider Comparison)",
    subtitle:
      "Upload a resume PDF to compare OCR/extraction accuracy, speed, and cost across providers.",
  },
  {
    id: "chat",
    label: "Chat",
    heading: "Calculator Chat",
    subtitle: "Ask a calculation and compare the answer, speed, and cost across assistants.",
  },
] as const;

type TabId = (typeof TABS)[number]["id"];

function App() {
  const [activeTab, setActiveTab] = useState<TabId>("resume");
  const active = TABS.find((tab) => tab.id === activeTab)!;

  return (
    <div>
      {/* Full-page background, back to how it was before the DESIGN.md pass. */}
      <div className="page-bg">
        <GradientBackground className="h-full w-full" />
      </div>

      <div className="hero-band-content">
        <nav className="tab-bar">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? "tab active" : "tab"}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <h1>{active.heading}</h1>
        <p className="subtitle">{active.subtitle}</p>
      </div>

      {activeTab === "resume" && <ResumePage />}
      {activeTab === "chat" && (
        <div className="shadcn-scope">
          <ChatPage />
        </div>
      )}
    </div>
  );
}

export default App;
