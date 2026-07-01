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
  packages: { patients: { full_name: string } | null } | null;
};

type FinalForm = {
  evolution_notes: string;
  activities_notes: string;
  recommendation_notes: string;
  was_punctual: boolean;
  did_activities: boolean;
  location: string;
  requires_certificate: boolean;
};

const EMPTY_FINAL: FinalForm = {
  evolution_notes: "", activities_notes: "", recommendation_notes: "",
  was_punctual: false, did_activities: false, location: "", requires_certificate: false,
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

  // Modal de finalização
  const [finalizing, setFinalizing]   = useState<Session | null>(null);
  const [finalForm, setFinalForm]     = useState<FinalForm>(EMPTY_FINAL);
  const [finalSaving, setFinalSaving] = useState(false);

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
      supabase.from("packages").select("*", { count: "exact", head: true }).lte("end_date", in7Days).gte("end_date", today),
      supabase.from("sessions")
        .select("id, session_number, scheduled_time, status, checked_in_at, packages(patients(full_name))")
        .eq("scheduled_date", today)
        .not("status", "in", "(completed,cancelled,no_show,rescheduled)")
        .order("scheduled_time"),
    ]);

    setActivePatients(active ?? 0);
    setMonthRevenue((pkgs ?? []).reduce((s, p) => s + (p.price_cents ?? 0), 0));
    setMonthSessions(sessions ?? 0);
    setRenewingSoon(renewing ?? 0);
    setTodaySessions((todaySess as unknown as Session[]) ?? []);
  }

  useEffect(() => { load(); }, []);

  // Realtime: atualiza dashboard automaticamente
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("dashboard-sessions-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, () => {
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function confirmarCheckin(sessionId: string) {
    setActionLoading(sessionId);
    await fetch(`/api/sessoes/${sessionId}/confirmar`, { method: "POST" });
    await load();
    setActionLoading(null);
  }

  function openFinalizar(session: Session) {
    setFinalizing(session);
    setFinalForm(EMPTY_FINAL);
  }

  async function handleFinalizar() {
    if (!finalizing) return;
    setFinalSaving(true);
    try {
      await fetch(`/api/sessoes/${finalizing.id}/finalizar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalForm),
      });
      setFinalizing(null);
      await load();
    } finally {
      setFinalSaving(false);
    }
  }

  const getInitials = (name: string) =>
    name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const STATUS_LABEL: Record<string, string> = {
    scheduled: "Agendada", checked_in: "Check-in feito", in_progress: "Em andamento",
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
        <div>
          <div className="card card-flush mb-16">
            <div style={{ padding: "18px 20px 4px" }}>
              <div className="section-title">
                Sessões de hoje{" "}
                <Link href="/gestao/agenda" className="link" style={{ textDecoration: "none", fontSize: 12 }}>
                  ver agenda →
                </Link>
              </div>
            </div>
            <div className="alert-box info" style={{ margin: "0 20px 12px" }}>
              <i className="ti ti-info-circle" />
              <span>O paciente faz check-in na chegada. Finalize a sessão ao término para registrar evolução.</span>
            </div>

            {todaySessions.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", color: "var(--gray-400)", fontSize: 14 }}>
                Nenhuma sessão agendada para hoje.
              </div>
            ) : (
              todaySessions.map((session) => {
                const name = session.packages?.patients?.full_name ?? "—";
                const initials = getInitials(name);
                const isLoading = actionLoading === session.id;
                return (
                  <div className="list-row" key={session.id} style={{ flexWrap: "wrap", gap: 8 }}>
                    <div className="list-time">{session.scheduled_time?.slice(0, 5)}</div>
                    <div className="avatar" style={{ background: "var(--teal-50)", color: "var(--teal-800)" }}>{initials}</div>
                    <div style={{ flex: 1, minWidth: 100 }}>
                      <div className="list-name">{name}</div>
                      <div className="list-meta">Sessão {session.session_number}/10 · {STATUS_LABEL[session.status] ?? session.status}</div>
                    </div>
                    <div>
                      {session.status === "in_progress" ? (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => openFinalizar(session)}
                          disabled={isLoading}
                          style={{ fontSize: 11, minWidth: 150 }}
                        >
                          <i className="ti ti-circle-check" /> Finalizar sessão
                        </button>
                      ) : (
                        <button
                          className="btn btn-sm"
                          onClick={session.status === "checked_in" ? () => confirmarCheckin(session.id) : undefined}
                          disabled={session.status !== "checked_in" || isLoading}
                          style={{
                            fontSize: 11, minWidth: 150,
                            ...(session.status === "checked_in"
                              ? { background: "var(--teal-600)", color: "#fff", border: "none" }
                              : { color: "var(--gray-400)", borderColor: "var(--gray-200)", background: "transparent", border: "1px solid" })
                          }}
                        >
                          <i className={`ti ${session.status === "checked_in" ? "ti-user-check" : "ti-clock"}`} />
                          {" "}{isLoading ? "..." : "Confirmar check-in"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div>
          <div className="card mb-16">
            <div className="section-title">Pacotes vencendo</div>
            {renewingSoon === 0 ? (
              <div style={{ color: "var(--gray-400)", fontSize: 13 }}>Nenhum vencendo nos próximos 7 dias.</div>
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

      {/* ── Modal: Finalizar Sessão ── */}
      {finalizing && (
        <div
          className="modal-overlay active"
          onClick={(e) => { if (e.target === e.currentTarget && !finalSaving) setFinalizing(null); }}
        >
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3>
                <i className="ti ti-circle-check" style={{ marginRight: 8, color: "var(--teal-700)" }} />
                Finalizar — {finalizing.packages?.patients?.full_name} · Sessão {finalizing.session_number}/10
              </h3>
              <button className="modal-close" onClick={() => setFinalizing(null)} disabled={finalSaving}>&times;</button>
            </div>

            <div className="form-group">
              <label className="form-label">Notas de evolução</label>
              <textarea className="form-textarea" rows={3} placeholder="O que foi observado nesta sessão…"
                value={finalForm.evolution_notes}
                onChange={e => setFinalForm(f => ({ ...f, evolution_notes: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Atividades realizadas</label>
              <textarea className="form-textarea" rows={2} placeholder="Exercícios e atividades feitos…"
                value={finalForm.activities_notes}
                onChange={e => setFinalForm(f => ({ ...f, activities_notes: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Recomendações para casa</label>
              <textarea className="form-textarea" rows={2} placeholder="Orientações para o paciente…"
                value={finalForm.recommendation_notes}
                onChange={e => setFinalForm(f => ({ ...f, recommendation_notes: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Local da sessão</label>
              <input className="form-input" placeholder="Ex: Sala 1" value={finalForm.location}
                onChange={e => setFinalForm(f => ({ ...f, location: e.target.value }))} />
            </div>

            {/* Flags de pontuação */}
            <div className="form-group">
              <label className="form-label">Pontuação da sessão</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
                {[
                  { key: "was_punctual" as const, label: "⏰ Paciente foi pontual (+10 pts)" },
                  { key: "did_activities" as const, label: "🏠 Realizou atividades em casa (+10 pts)" },
                  { key: "requires_certificate" as const, label: "📄 Requer atestado" },
                ].map(({ key, label }) => (
                  <label key={key} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                    padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 500,
                    background: finalForm[key] ? "var(--teal-50)" : "var(--gray-50)",
                    border: `1px solid ${finalForm[key] ? "var(--teal-200,#99f6e4)" : "var(--gray-200)"}`,
                    color: finalForm[key] ? "var(--teal-800)" : "var(--gray-600)",
                    transition: "all 0.15s",
                  }}>
                    <input type="checkbox" checked={finalForm[key]}
                      onChange={e => setFinalForm(f => ({ ...f, [key]: e.target.checked }))}
                      style={{ width: 16, height: 16, accentColor: "var(--teal-700)" }} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setFinalizing(null)} disabled={finalSaving}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleFinalizar} disabled={finalSaving}>
                {finalSaving ? "Salvando…" : "Finalizar sessão"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
