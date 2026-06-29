"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Patient = {
  id: string;
  full_name: string;
  phone: string;
  guardian_name: string | null;
  diagnosis: string | null;
  status: string;
};

const STATUS_LABEL: Record<string, string> = {
  awaiting_evaluation: "Aguardando avaliação",
  awaiting_payment: "Aguardando pagamento",
  active: "Ativo",
  suspended_travel: "Suspenso",
  overdue: "Vencido",
  cancelled: "Cancelado",
};

const STATUS_BADGE: Record<string, string> = {
  awaiting_evaluation: "badge-warning",
  awaiting_payment: "badge-warning",
  active: "badge-info",
  suspended_travel: "badge-neutral",
  overdue: "badge-warning",
  cancelled: "badge-danger",
};

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function PacientesPage() {
  const [tab, setTab] = useState<"lista" | "financeiro" | "cs">("lista");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("patients")
      .select("id, full_name, phone, guardian_name, diagnosis, status")
      .order("full_name")
      .then(({ data }) => setPatients((data as Patient[]) ?? []));
  }, []);

  const filtered = patients.filter((p) =>
    p.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="tabs">
        <button className={`tab-btn${tab === "lista" ? " active" : ""}`} onClick={() => setTab("lista")}>Pacientes</button>
        <button className={`tab-btn${tab === "financeiro" ? " active" : ""}`} onClick={() => setTab("financeiro")}>Financeiro</button>
        <button className={`tab-btn${tab === "cs" ? " active" : ""}`} onClick={() => setTab("cs")}>CS</button>
      </div>

      {tab === "lista" && (
        <>
          <div className="toolbar">
            <div className="search-box">
              <i className="ti ti-search" />
              <input type="text" placeholder="Buscar paciente..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="filter-select">
              <option>Todas as situações</option>
              <option>Ativos</option>
              <option>Pendentes</option>
              <option>Suspensos</option>
            </select>
          </div>
          <div className="card card-flush">
            <div className="table-scroll-wrap">
              <table className="g-table">
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>Diagnóstico</th>
                    <th>Pacote</th>
                    <th>Pagamento</th>
                    <th>Situação</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", color: "var(--gray-400)", padding: "32px" }}>
                        {patients.length === 0 ? "Nenhum paciente cadastrado ainda." : "Nenhum resultado encontrado."}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((p) => (
                      <tr key={p.id} style={{ cursor: "pointer" }}>
                        <td>
                          <div className="person">
                            <div className="avatar" style={{ background: "var(--teal-50)", color: "var(--teal-800)" }}>
                              {initials(p.full_name)}
                            </div>
                            <div>
                              <div className="person-name">
                                {p.full_name}
                                {p.guardian_name && <span className="muted text-xs"> (resp. {p.guardian_name})</span>}
                              </div>
                              <div className="person-sub">{p.phone}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-sm muted">{p.diagnosis ?? "—"}</td>
                        <td className="text-sm muted">—</td>
                        <td><span className="badge badge-neutral">—</span></td>
                        <td>
                          <span className={`badge ${STATUS_BADGE[p.status] ?? "badge-neutral"}`}>
                            {STATUS_LABEL[p.status] ?? p.status}
                          </span>
                        </td>
                        <td><i className="ti ti-chevron-right muted" /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === "financeiro" && (
        <>
          <div className="g-grid grid-3 mb-16">
            {[
              { icon: "ti-circle-check", bg: "var(--teal-50)", c: "var(--teal-800)", label: "Pagos este mês", val: "0", sub: "R$ 0,00 recebidos" },
              { icon: "ti-alert-circle", bg: "var(--red-50)",  c: "var(--red-700)",   label: "Em aberto",      val: "0", sub: "R$ 0,00 a receber" },
              { icon: "ti-clock-exclamation", bg: "var(--amber-50)", c: "var(--amber-700)", label: "Vencendo em 7 dias", val: "0", sub: "R$ 0,00 em jogo" },
            ].map((m) => (
              <div className="metric-card" key={m.label}>
                <div className="metric-icon" style={{ background: m.bg, color: m.c }}><i className={`ti ${m.icon}`} /></div>
                <div className="metric-label">{m.label}</div>
                <div className="metric-value">{m.val}</div>
                <div className="text-xs muted">{m.sub}</div>
              </div>
            ))}
          </div>
          <div className="card card-flush">
            <div className="table-scroll-wrap">
              <table className="g-table">
                <thead><tr><th>Paciente</th><th>Valor do pacote</th><th>Vencimento</th><th>Situação</th><th /></tr></thead>
                <tbody>
                  <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--gray-400)", padding: "32px" }}>Nenhum pacote cadastrado.</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === "cs" && (
        <div className="g-grid grid-2 mb-16">
          <div className="card">
            <div className="section-title">
              <span><i className="ti ti-file-off" style={{ color: "var(--red-700)", marginRight: 6 }} />Sem contrato (pacote vencido)</span>
            </div>
            <div style={{ color: "var(--gray-400)", fontSize: 13 }}>Nenhum pacote vencido.</div>
          </div>
          <div className="card">
            <div className="section-title">
              <span><i className="ti ti-cake" style={{ color: "var(--orange-500)", marginRight: 6 }} />Aniversariantes do mês</span>
            </div>
            <div style={{ color: "var(--gray-400)", fontSize: 13 }}>Nenhum aniversariante este mês.</div>
          </div>
        </div>
      )}
    </>
  );
}
