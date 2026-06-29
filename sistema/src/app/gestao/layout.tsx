import "./gestao.css";
import SidebarNav from "@/components/gestao/SidebarNav";
import Topbar from "@/components/gestao/Topbar";

export default function GestaoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="g-app">
      <SidebarNav />
      <div className="g-main">
        <Topbar />
        <div className="g-content">{children}</div>
      </div>
    </div>
  );
}
