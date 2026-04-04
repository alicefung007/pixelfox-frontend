import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export default function AppLayout() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col relative overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
