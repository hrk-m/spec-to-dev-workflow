import { useEffect, useState } from "react";
import { Header } from "@/widgets/header";
import { Sidebar } from "@/widgets/sidebar";

import { HomePage } from "@/pages/home";

import "./styles/index.css";

export function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = isSidebarOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isSidebarOpen]);

  return (
    <div className="app-shell">
      <Header onMenuClick={() => setIsSidebarOpen(true)} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="app-shell__content">
        <HomePage />
      </main>
    </div>
  );
}
