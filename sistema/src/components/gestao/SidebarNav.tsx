"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type NavItem = { href: string; label: string; icon: string; exact?: boolean; badge?: string };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Painel",
    items: [
      { href: "/gestao", label: "Gestão", icon: "ti-layout-dashboard", exact: true },
      { href: "/gestao/agenda", label: "Agenda", icon: "ti-calendar" },
    ],
  },
  {
    label: "Clientes",
    items: [
      { href: "/gestao/pacientes", label: "Pacientes", icon: "ti-users" },
      { href: "/gestao/financeiro", label: "Financeiro", icon: "ti-receipt" },
      { href: "/gestao/cs", label: "CS", icon: "ti-heart-handshake" },
    ],
  },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <>
      <div className={`sidebar-backdrop${open ? " open" : ""}`} onClick={() => setOpen(false)} />
      <aside className={`sidebar${open ? " open" : ""}`}>
        <div className="flex-between" style={{ marginBottom: 4 }}>
          <div className="brand">Dra. Evely<span className="dot">.</span></div>
          <button className="sidebar-close-btn" onClick={() => setOpen(false)} aria-label="Fechar menu">
            <i className="ti ti-x" />
          </button>
        </div>
        <div className="brand-sub">Espaço Passinho</div>

        {NAV_GROUPS.map((group) => (
          <div className="nav-group" key={group.label}>
            <div className="nav-label">{group.label}</div>
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item${isActive(item.href, item.exact) ? " active" : ""}`}
                onClick={() => setOpen(false)}
              >
                <i className={`ti ${item.icon}`} />
                {item.label}
              </Link>
            ))}
          </div>
        ))}

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="avatar">EV</div>
            <div>
              <div className="sidebar-user-name">Evely</div>
              <div className="sidebar-user-role">Fisioterapeuta · Admin</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="nav-item"
            style={{ marginTop: 8, color: "var(--gray-400)", fontSize: 13 }}
          >
            <i className="ti ti-logout" />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
