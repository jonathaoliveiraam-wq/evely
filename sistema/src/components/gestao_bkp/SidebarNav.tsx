"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/gestao", label: "Dashboard", icon: "⊞" },
  { href: "/gestao/pacientes", label: "Pacientes", icon: "👥" },
  { href: "/gestao/agenda", label: "Agenda", icon: "📅" },
  { href: "/gestao/financeiro", label: "Financeiro", icon: "💰" },
  { href: "/gestao/cs", label: "Atendimento", icon: "💬" },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside
      style={{
        width: 220,
        minHeight: "100vh",
        background: "var(--color-teal-900)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "28px 24px 24px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 18,
            color: "white",
          }}
        >
          Dra. Evely
          <span style={{ color: "var(--color-orange-500)" }}>.</span>
        </span>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 2 }}>
          Espaço Passinho
        </p>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "16px 12px" }}>
        {NAV.map(({ href, label, icon }) => {
          const active =
            href === "/gestao" ? pathname === "/gestao" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: "var(--radius-md)",
                marginBottom: 4,
                fontSize: 14,
                fontWeight: active ? 600 : 400,
                color: active ? "white" : "rgba(255,255,255,0.55)",
                background: active ? "rgba(255,255,255,0.12)" : "transparent",
                textDecoration: "none",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              <span style={{ fontSize: 16 }}>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: "16px 12px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <button
          onClick={handleLogout}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            borderRadius: "var(--radius-md)",
            fontSize: 14,
            color: "rgba(255,255,255,0.45)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          <span>↩</span> Sair
        </button>
      </div>
    </aside>
  );
}
