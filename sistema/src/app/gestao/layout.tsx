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
        <footer className="g-footer">
          © {new Date().getFullYear()} Todos os direitos reservados — Dra. Evely Sarmento &nbsp;·&nbsp; powered by <strong>Alavanca Aceleradora</strong>
        </footer>
      </div>
    </div>
  );
}
