import { useState } from "react";
import { Header } from "@/widgets/header";
import { Sidebar } from "@/widgets/sidebar";
import { RemoveScrollBar } from "react-remove-scroll-bar";
import { RouterProvider } from "react-router";

import { router } from "./router";

import "./styles/index.css";

export function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      {isSidebarOpen && <RemoveScrollBar />}
      <Header onMenuClick={() => setIsSidebarOpen(true)} />
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onNavigate={(path) => router.navigate(path)}
      />
      <main className="app-shell__content">
        <RouterProvider router={router} />
      </main>
    </div>
  );
}
