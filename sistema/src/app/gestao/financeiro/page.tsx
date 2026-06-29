"use client";

import { useState } from "react";

export default function FinanceiroPage() {
  const [search, setSearch] = useState("");

  const metrics = [
    { icon: "ti-cash",             bg: "var(--teal-50)",  c: "var(--teal-800)",  label: "Recebido no mês",    val: "R$ 0,00",  sub: "0 pacotes pagos" },
    { icon: "ti-alert-circle",     bg: "var(--red-50)",   c: "var(--red-700)",   label: "Em aberto",          val: "R$ 0,00",  sub: "0 pacotes pendentes" },
    { icon: "ti-refresh",          bg: "var(--amber-50)", c: "var(--amber-700)", label: "A renovar (7 dias)", val: "R$ 0,00",  sub: "0 pacotes vencendo" },
    { icon: "ti-receipt-2",        bg: "var(--teal-50)",  c: "var(--teal-800)",  label: "Ticket médio",       val: "R$ 0,00",  sub: "por pacote mensal" },
  ];

  return (
    <>
      <div className="g-grid grid-4 mb-16">
        {metrics.map((m) => (
          <div className="metric-card" key={m.label}>
            <div className="metric-icon" style={{ background: m.bg, color: m.c }}><i className={`ti ${m.icon}`} /></div>
            <div className="metric-label">{m.label}</div>
            <div className="metric-value">{m.val}</div>
            <div className="text-xs muted">{m.sub}</div>
          </div>
        ))}
      </div>

      <div className="toolbar">
        <div className="search-box">
          <i className="ti ti-search" />
          <input type="text" placeholder="Buscar paciente..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="filter-select"><option>Todas as situações</option><option>Pago</option><option>Em aberto</option></select>
        <select className="filter-select">
          <option>{new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</option>
        </select>
      </div>

      <div className="card card-flush">
        <div className="table-scroll-wrap">
          <table className="g-table">
            <thead>
              <tr><th>Paciente</th><th>Valor do pacote</th><th>Vencimento</th><th>Situação</th><th /></tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "var(--gray-400)", padding: "48px" }}>
                  Nenhum pacote cadastrado ainda.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
