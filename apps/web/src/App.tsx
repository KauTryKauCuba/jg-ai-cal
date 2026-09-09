import { useState } from "react";
import "./App.css";
import ChatPage from "./pages/ChatPage";
import ResumePage from "./pages/ResumePage";

const TABS = [
  { id: "resume", label: "Resume" },
  { id: "chat", label: "Chat" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function App() {
  const [activeTab, setActiveTab] = useState<TabId>("resume");

  return (
    <div>
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
