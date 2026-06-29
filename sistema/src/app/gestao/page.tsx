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

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Agendada", checked_in: "Check-in feito", in_progress: "Em andamento",
  completed: "Concluída", no_show: "Faltou", cancelled: "Cancelada", rescheduled: "Reagendada",
};

export default function GestaoPage() {
  const [totalPatients, setTotalPatients] = useState(0);
  const [activePatients, setActivePatients] = useState(0);
  const [todaySessions, setTodaySessions] = useState<Session[]>([]);

  useEffect(() => {
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];

    Promise.all([
      supabase.from("patients").select("*", { count: "exact", head: true }),
      supabase.from("patients").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase
        .from("sessions")
        .select("id, session_number, scheduled_time, status, checked_in_at, packages(patients(full_name))")
        .eq("scheduled_date", today)
        .order("scheduled_time"),
    ]).then(([{ count: total }, { count: active }, { data: sessions }]) => {
      setTotalPatients(total ?? 0);
      setActivePatients(active ?? 0);
      setTodaySessions((sessions as unknown as Session[]) ?? []);
    });
  }, []);

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
          <div className="metric-label">Atendimentos no mês</div>
          <div className="metric-value">—</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon" style={{ background: "var(--teal-50)", color: "var(--teal-800)" }}>
            <i className="ti ti-coin" />
          </div>
          <div className="metric-label">Valor gerado no mês</div>
          <div className="metric-value">—</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon" style={{ background: "var(--amber-50)", color: "var(--amber-700)" }}>
            <i className="ti ti-refresh" />
          </div>
          <div className="metric-label">A renovar (7 dias)</div>
          <div className="metric-value">0</div>
          <div className="text-xs muted">Nenhum pacote vencendo</div>
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
                  ver agenda completa →
                </Link>
              </div>
            </div>
            <div className="alert-box info" style={{ margin: "0 20px 12px" }}>
              <i className="ti ti-info-circle" />
              <span>O paciente faz check-in de chegada. Você confirma o início e, ao final, registra a evolução da sessão.</span>
            </div>

            {todaySessions.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", color: "var(--gray-400)", fontSize: 14 }}>
                Nenhuma sessão agendada para hoje.
              </div>
            ) : (
              todaySessions.map((session) => (
                <div className="list-row" key={session.id}>
                  <div className="list-time">{session.scheduled_time?.slice(0, 5)}</div>
                  <div className="avatar" style={{ background: "var(--teal-50)", color: "var(--teal-800)" }}>
                    {session.packages?.patients?.full_name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() ?? "??"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="list-name">{session.packages?.patients?.full_name ?? "—"}</div>
                    <div className="list-meta">Sessão {session.session_number} de 10</div>
                  </div>
                  {session.checked_in_at ? (
                    <span className="checkin-pill done">
                      <i className="ti ti-check" style={{ fontSize: 13 }} />
                      Check-in feito
                    </span>
                  ) : (
                    <span className="checkin-pill waiting">
                      <i className="ti ti-clock" style={{ fontSize: 13 }} />
                      Aguardando check-in
                    </span>
                  )}
                  <button
                    className={`btn btn-sm ${session.checked_in_at ? "btn-primary" : "btn-outline"}`}
                    disabled={!session.checked_in_at}
                  >
                    Confirmar início
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Coluna direita */}
        <div>
          <div className="card mb-16">
            <div className="section-title">Pacotes vencendo</div>
            <div style={{ color: "var(--gray-400)", fontSize: 13 }}>Nenhum pacote vencendo nos próximos 7 dias.</div>
          </div>

          <div className="card">
            <div className="section-title">Reagendamentos do ciclo</div>
            <div style={{ color: "var(--gray-400)", fontSize: 13 }}>Sem reagendamentos registrados.</div>
          </div>
        </div>
      </div>
    </>
  );
}
