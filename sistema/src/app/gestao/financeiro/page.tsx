"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Package = {
  id: string;
  price_cents: number;
  payment_status: "paid" | "pending";
  start_date: string;
  end_date: string;
  patients: { full_name: string } | null;
};

const fmt = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR");

export default function FinanceiroPage() {
  const today = new Date().toISOString().split("T")[0];
  const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  const [packages, setPackages] = useState<Package[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending">("all");
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));
  const [dayFilter, setDayFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const months = Array.from({ length: 13 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return d.toISOString().slice(0, 7);
  });

  useEffect(() => { load(); }, [monthFilter, dayFilter]);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    let query = supabase
      .from("packages")
      .select("id, price_cents, payment_status, start_date, end_date, patients(full_name)")
      .order("start_date", { ascending: false });

    if (dayFilter) {
      query = query.eq("start_date", dayFilter);
    } else if (monthFilter) {
      const [year, month] = monthFilter.split("-").map(Number);
      const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const lastDayStr = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
      query = query.gte("start_date", firstDay).lte("start_date", lastDayStr);
    }

    const { data } = await query;
    setPackages((data as unknown as Package[]) ?? []);
    setLoading(false);
  }

  const filtered = packages.filter((p) => {
    const nameMatch = (p.patients?.full_name ?? "").toLowerCase().includes(search.toLowerCase());
    const statusMatch = statusFilter === "all" || p.payment_status === statusFilter;
    return nameMatch && statusMatch;
  });

  const paid = filtered.filter(p => p.payment_status === "paid");
  const pending = filtered.filter(p => p.payment_status === "pending");
  const paidTotal = paid.reduce((s, p) => s + p.price_cents, 0);
  const pendingTotal = pending.reduce((s, p) => s + p.price_cents, 0);
  const renewingSoon = packages.filter(p => p.end_date >= today && p.end_date <= in7Days);
  const renewingTotal = renewingSoon.reduce((s, p) => s + p.price_cents, 0);
  const avgTicket = filtered.length > 0
    ? filtered.reduce((s, p) => s + p.price_cents, 0) / filtered.length : 0;

  return (
    <>
      <div className="g-grid grid-4 mb-16">
        {[
          { label: "Recebido no período", val: fmt(paidTotal), sub: `${paid.length} pacote${paid.length !== 1 ? "s" : ""} pago${paid.length !== 1 ? "s" : ""}` },
          { label: "Em aberto", val: fmt(pendingTotal), sub: `${pending.length} pendente${pending.length !== 1 ? "s" : ""}` },
          { label: "A renovar (7 dias)", val: fmt(renewingTotal), sub: `${renewingSoon.length} vencendo em breve` },
          { label: "Ticket médio", val: fmt(avgTicket), sub: "por pacote no período" },
        ].map(m => (
          <div className="metric-card" key={m.label}>
            <div className="metric-label">{m.label}</div>
            <div className="metric-value" style={{ fontSize: 20 }}>{m.val}</div>
            <div className="text-xs muted">{m.sub}</div>
          </div>
        ))}
      </div>

      <div className="toolbar" style={{ flexWrap: "wrap", gap: 8 }}>
        <div className="search-box">
          <i className="ti ti-search" />
          <input
            type="text"
            placeholder="Buscar paciente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          className="filter-select"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
        >
          <option value="all">Todas as situações</option>
          <option value="paid">Pago</option>
          <option value="pending">Em aberto</option>
        </select>

        <select
          className="filter-select"
          value={monthFilter}
          disabled={!!dayFilter}
          onChange={e => setMonthFilter(e.target.value)}
          style={{ opacity: dayFilter ? 0.5 : 1 }}
        >
          {months.map(m => {
            const [year, month] = m.split("-").map(Number);
            const label = new Date(year, month - 1, 1)
              .toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
            return <option key={m} value={m}>{label}</option>;
          })}
        </select>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="date"
            className="form-input"
            style={{ width: "auto", fontSize: 13, height: 36 }}
            value={dayFilter}
            onChange={e => setDayFilter(e.target.value)}
            title="Filtrar por dia específico"
          />
          {dayFilter && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setDayFilter("")}
              title="Limpar filtro de data"
            >
              <i className="ti ti-x" />
            </button>
          )}
        </div>
      </div>

      <div className="card card-flush">
        <div className="table-scroll-wrap">
          <table className="g-table">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Valor</th>
                <th>Início</th>
                <th>Vencimento</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: 48, color: "var(--gray-400)" }}>
                  Carregando...
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: 48, color: "var(--gray-400)" }}>
                  Nenhum pacote encontrado.
                </td></tr>
              ) : filtered.map(p => {
                const expiring = p.end_date >= today && p.end_date <= in7Days;
                const expired = p.end_date < today;
                return (
                  <tr key={p.id}>
                    <td><strong>{p.patients?.full_name ?? "—"}</strong></td>
                    <td style={{ fontWeight: 600 }}>{fmt(p.price_cents)}</td>
                    <td className="muted text-sm">{fmtDate(p.start_date)}</td>
                    <td className="text-sm" style={{
                      color: expired ? "var(--red-700)" : expiring ? "var(--amber-700)" : "inherit",
                      fontWeight: expiring || expired ? 600 : 400,
                    }}>
                      {fmtDate(p.end_date)}
                      {expiring && " ⚠️"}
                      {expired && " Vencido"}
                    </td>
                    <td>
                      <span className={`badge ${p.payment_status === "paid" ? "badge-success" : "badge-warning"}`}>
                        {p.payment_status === "paid" ? "Pago" : "Em aberto"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
