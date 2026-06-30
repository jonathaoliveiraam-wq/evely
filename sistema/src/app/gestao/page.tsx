"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Session = {
  id: string;
  session_number: number;
  scheduled_time: string;
  status: string;
  checked_in_at: string | null;
  confirmed_start_at: string | null;
  packages: { patients: { full_name: string } | null } | null;
};

const fmt = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function GestaoPage() {
  const [activePatients, setActivePatients]   = useState(0);
  const [monthRevenue, setMonthRevenue]       = useState(0);
  const [monthSessions, setMonthSessions]     = useState(0);
  const [renewingSoon, setRenewingSoon]       = useState(0);
  const [todaySessions, setTodaySessions]     = useState<Session[]>([]);
  const [actionLoading, setActionLoading]     = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const in7Days = new Date(now.getTime() + 7 * 86400000).toISOString().split("T")[0];

    const [
      { count: active },
      { data: pkgs },
      { count: sessions },
      { count: renewing },
      { data: todaySess },
    ] = await Promise.all([
      supabase.from("patients").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("packages").select("price_cents").gte("created_at", firstOfMonth),
      supabase.from("sessions").select("*", { count: "exact", head: true }).eq("status", "completed").gte("completed_at", firstOfMonth),
      supabase.from("packages")
        .select("*", { count: "exact", head: true })
        .lte("end_date", in7Days)
        .gte("end_date", today),
      supabase.from("sessions")
        .select("id, session_number, scheduled_time, status, checked_in_at, confirmed_start_at, packages(patients(full_name))")
        .eq("scheduled_date", today)
        .not("status", "in", '("completed","cancelled","rescheduled")')
        .order("scheduled_time"),
    ]);

    setActivePatients(active ?? 0);
    setMonthRevenue((pkgs ?? []).reduce((s, p) => s + (p.price_cents ?? 0), 0));
    setMonthSessions(sessions ?? 0);
    setRenewingSoon(renewing ?? 0);
    setTodaySessions((todaySess as unknown as Session[]) ?? []);
  }

  useEffect(() => { load(); }, []);

  async function confirmarInicio(sessionId: string) {
    setActionLoading(sessionId);
    await fetch(`/api/sessoes/${sessionId}/confirmar`, { method: "POST" });
    await load();
    setActionLoading(null);
  }

  async function fazerCheckin(sessionId: string) {
    setActionLoading(sessionId);
    await fetch(`/api/sessoes/${sessionId}/checkin`, { method: "POST" });
    await load();
    setActionLoading(null);
  }

  const STATUS_LABEL: Record<string, string> = {
    scheduled: "Agendada", checked_in: "Check-in feito", in_progress: "Em andamento",
    completed: "Concluída", no_show: "Faltou", cancelled: "Cancelada", rescheduled: "Reagendada",
  };

  return (
    <>
      {/* Metric cards */}
      <div className="g-grid grid-4 mb-16">
        <div className="metric-card">
          <div className="metric-icon" style={{ background: "var(--teal-50)", color: "var(--teal-800)" }}>
            <i className="ti ti-users" />
          </div>
          <div className="metric-label">Pacientes ativos</div>
          <div className="metric-value">{activePatients}</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon" style={{ background: "var(--teal-50)", color: "var(--teal-800)" }}>
            <i className="ti ti-stethoscope" />
          </div>
          <div className="metric-label">Sessões no mês</div>
          <div className="metric-value">{monthSessions}</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon" style={{ background: "var(--teal-50)", color: "var(--teal-800)" }}>
            <i className="ti ti-coin" />
          </div>
          <div className="metric-label">Faturamento no mês</div>
          <div className="metric-value" style={{ fontSize: monthRevenue > 99999 ? 20 : 26 }}>{fmt(monthRevenue)}</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon" style={{ background: "var(--amber-50)", color: "var(--amber-700)" }}>
            <i className="ti ti-refresh" />
          </div>
          <div className="metric-label">A renovar (7 dias)</div>
          <div className="metric-value">{renewingSoon}</div>
          <div className="text-xs muted">{renewingSoon === 0 ? "Nenhum vencendo" : `${renewingSoon} pacote${renewingSoon > 1 ? "s" : ""}`}</div>
        </div>
      </div>

      {/* 2-1 grid */}
      <div className="g-grid grid-2-1">
        {/* Sessões de hoje */}
        <div>
          <div className="card card-flush mb-16">
            <div style={{ padding: "18px 20px 4px" }}>
              <div className="section-title">
                Sessões de hoje{" "}
                <Link href="/gestao/agenda" className="link" style={{ textDecoration: "none" }}>
                  ver agenda →
                </Link>
              </div>
            </div>
            <div className="alert-box info" style={{ margin: "0 20px 12px" }}>
              <i className="ti ti-info-circle" />
              <span>O paciente faz check-in na chegada. Você confirma o início e, ao final, finaliza a sessão.</span>
            </div>

            {todaySessions.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", color: "var(--gray-400)", fontSize: 14 }}>
                Nenhuma sessão agendada para hoje.
              </div>
            ) : (
              todaySessions.map((session) => {
                const name = session.packages?.patients?.full_name ?? "—";
                const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <div className="list-row" key={session.id}>
                    <div className="list-time">{session.scheduled_time?.slice(0, 5)}</div>
                    <div className="avatar" style={{ background: "var(--teal-50)", color: "var(--teal-800)" }}>{initials}</div>
                    <div style={{ flex: 1 }}>
                      <div className="list-name">{name}</div>
                      <div className="list-meta">Sessão {session.session_number}/10 · {STATUS_LABEL[session.status] ?? session.status}</div>
                    </div>
                    {session.status === "scheduled" && (
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => fazerCheckin(session.id)}
                        disabled={actionLoading === session.id}
                        style={{ fontSize: 12 }}
                      >
                        {actionLoading === session.id ? "…" : "Marcar check-in"}
                      </button>
                    )}
                    {session.status === "checked_in" && (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => confirmarInicio(session.id)}
                        disabled={actionLoading === session.id}
                        style={{ fontSize: 12 }}
                      >
                        {actionLoading === session.id ? "…" : "Confirmar início"}
                      </button>
                    )}
                    {session.status === "in_progress" && (
                      <Link href="/gestao/agenda" className="btn btn-sm" style={{ background: "var(--teal-600)", color: "#fff", fontSize: 12 }}>
                        Finalizar →
                      </Link>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Coluna direita */}
        <div>
          <div className="card mb-16">
            <div className="section-title">Pacotes vencendo</div>
            {renewingSoon === 0 ? (
              <div style={{ color: "var(--gray-400)", fontSize: 13 }}>Nenhum pacote vencendo nos próximos 7 dias.</div>
            ) : (
              <div style={{ color: "var(--amber-700)", fontSize: 13 }}>{renewingSoon} pacote{renewingSoon > 1 ? "s" : ""} vencendo em até 7 dias.</div>
            )}
          </div>

          <div className="card">
            <div className="section-title">Acesso rápido</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
              <Link href="/gestao/pacientes" className="btn btn-ghost btn-sm" style={{ justifyContent: "flex-start" }}>
                <i className="ti ti-user-plus" /> Cadastrar paciente
              </Link>
              <Link href="/gestao/agenda" className="btn btn-ghost btn-sm" style={{ justifyContent: "flex-start" }}>
                <i className="ti ti-calendar" /> Ver agenda completa
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
