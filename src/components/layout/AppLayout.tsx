import { useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import UploadPhotoDialog from "@/components/editor/UploadPhotoDialog";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onUpload={() => setUploadOpen(true)}
        />
        <main className="flex-1 flex flex-col relative overflow-hidden">
          <Outlet />
        </main>
      </div>
      <UploadPhotoDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
}
