import SidebarNav from "@/components/gestao/SidebarNav";

export default function GestaoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-gray-50, #F8F9FA)" }}>
      <SidebarNav />
      <main style={{ flex: 1, overflow: "auto" }}>{children}</main>
    </div>
  );
}
