"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Package = {
  id: string;
  start_date: string;
  end_date: string;
  price_cents: number;
  payment_status: "pending" | "paid";
};

type Session = {
  id: string;
  session_number: number;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  checked_in_at: string | null;
  was_punctual: boolean | null;
  did_activities: boolean | null;
};

type Patient = {
  id: string;
  full_name: string;
  status: string;
};

const fmt = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

export default function PortalAtivoPage() {
  const [patient, setPatient]             = useState<Patient | null>(null);
  const [pkg, setPkg]                     = useState<Package | null>(null);
  const [sessions, setSessions]           = useState<Session[]>([]);
  const [loading, setLoading]             = useState(true);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinDone, setCheckinDone]     = useState(false);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: pat } = await supabase
        .from("patients")
        .select("id, full_name, status")
        .eq("auth_user_id", user.id)
        .single();

      if (!pat) { setLoading(false); return; }
      setPatient(pat);

      const { data: activePkg } = await supabase
        .from("packages")
        .select("id, start_date, end_date, price_cents, payment_status")
        .eq("patient_id", pat.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (activePkg) {
        setPkg(activePkg);
        const { data: sesh } = await supabase
          .from("sessions")
          .select("id, session_number, scheduled_date, scheduled_time, status, checked_in_at, was_punctual, did_activities")
          .eq("package_id", activePkg.id)
          .order("session_number");
        setSessions(sesh ?? []);
      }

      setLoading(false);
    })();
  }, []);

  const completedCount = sessions.filter(s => s.status === "completed").length;
  const todaySession = sessions.find(s => s.scheduled_date === today && s.status !== "completed" && s.status !== "cancelled");
  const nextSession = sessions.find(s => s.status === "scheduled" && s.scheduled_date >= today);

  // Gamificação: 20 pts presença + 10 pontualidade + 10 atividades = 40/sessão, 400 total
  const totalPoints = sessions.reduce((acc, s) => {
    if (s.status !== "completed") return acc;
    return acc + 20 + (s.was_punctual ? 10 : 0) + (s.did_activities ? 10 : 0);
  }, 0);
  const maxPoints = 400;
  const pointsPercent = Math.round((totalPoints / maxPoints) * 100);

  async function doCheckin() {
    if (!todaySession) return;
    setCheckinLoading(true);
    await fetch(`/api/sessoes/${todaySession.id}/checkin`, { method: "POST" });
    setCheckinDone(true);
    setCheckinLoading(false);
    const supabase = createClient();
    if (pkg) {
      const { data: sesh } = await supabase
        .from("sessions")
        .select("id, session_number, scheduled_date, scheduled_time, status, checked_in_at, was_punctual, did_activities")
        .eq("package_id", pkg.id)
        .order("session_number");
      setSessions((sesh as Session[]) ?? []);
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center", color: "#0f766e" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
          <div>Carregando...</div>
        </div>
      </div>
    );
  }

  if (!pkg) {
    return (
      <div style={{ maxWidth: 480, margin: "60px auto", textAlign: "center", padding: "0 24px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>💆</div>
        <h2 style={{ fontFamily: "var(--font-display, serif)", color: "#0f766e", marginBottom: 8 }}>
          Olá, {patient?.full_name?.split(" ")[0]}!
        </h2>
        <p style={{ color: "#64748b", fontSize: 15 }}>
          Aguardando ativação do seu pacote de sessões.<br />
          Em breve a Dra. Evely irá confirmar.
        </p>
      </div>
    );
  }

  const daysLeft = Math.max(0, Math.ceil((new Date(pkg.end_date).getTime() - Date.now()) / 86400000));

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "24px 16px 60px" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 42, marginBottom: 8 }}>🦶</div>
        <h2 style={{ fontFamily: "var(--font-display, serif)", color: "#0f766e", fontSize: 22, margin: "0 0 4px" }}>
          Olá, {patient?.full_name?.split(" ")[0]}!
        </h2>
        <p style={{ color: "#64748b", fontSize: 14 }}>Acompanhe seu progresso aqui.</p>
      </div>

      {/* Gamificação */}
      <div style={{ background: "linear-gradient(135deg, #0f766e 0%, #0d9488 100%)", borderRadius: 20, padding: "22px 24px", marginBottom: 20, color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>Seus pontos</div>
            <div style={{ fontSize: 38, fontWeight: 900, lineHeight: 1 }}>
              {totalPoints}
              <span style={{ fontSize: 16, fontWeight: 400, opacity: 0.7 }}> / {maxPoints}</span>
            </div>
          </div>
          <div style={{ fontSize: 36 }}>
            {totalPoints >= 400 ? "🏆" : totalPoints >= 200 ? "⭐" : totalPoints >= 80 ? "🌟" : "🎯"}
          </div>
        </div>

        {/* Barra de pontos */}
        <div style={{ height: 8, borderRadius: 99, background: "rgba(255,255,255,0.2)", marginBottom: 12, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pointsPercent}%`, background: "#fff", borderRadius: 99, transition: "width 0.6s" }} />
        </div>

        {/* Breakdown */}
        <div style={{ display: "flex", gap: 12, fontSize: 12, opacity: 0.85 }}>
          <span>✅ Presença: 20 pts/sessão</span>
          <span>⏰ Pontualidade: +10</span>
          <span>🏠 Atividades: +10</span>
        </div>
      </div>

      {/* Check-in card */}
      {todaySession && !checkinDone && todaySession.status === "scheduled" && (
        <div style={{ background: "#0f766e", borderRadius: 16, padding: "20px 24px", marginBottom: 20, color: "#fff", textAlign: "center" }}>
          <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 6 }}>Você tem sessão hoje!</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
            Sessão {todaySession.session_number}/10 às {todaySession.scheduled_time?.slice(0, 5)}
          </div>
          <button
            onClick={doCheckin}
            disabled={checkinLoading}
            style={{
              background: "#fff", color: "#0f766e", border: "none", borderRadius: 10,
              padding: "12px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%",
            }}
          >
            {checkinLoading ? "Registrando…" : "✅ Fazer check-in de chegada"}
          </button>
        </div>
      )}
      {(checkinDone || todaySession?.status === "checked_in") && (
        <div style={{ background: "#14b8a6", borderRadius: 16, padding: "16px 24px", marginBottom: 20, color: "#fff", textAlign: "center" }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>✅ Check-in feito!</div>
          <div style={{ fontSize: 13, opacity: 0.9 }}>Aguarde a Dra. Evely confirmar o início da sessão.</div>
        </div>
      )}
      {todaySession?.status === "in_progress" && (
        <div style={{ background: "#0d9488", borderRadius: 16, padding: "16px 24px", marginBottom: 20, color: "#fff", textAlign: "center" }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>🏃 Sessão em andamento!</div>
          <div style={{ fontSize: 13, opacity: 0.9 }}>Aproveite ao máximo!</div>
        </div>
      )}

      {/* Progresso */}
      <div style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", marginBottom: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.08)" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#0f766e", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Progresso
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: "#0f766e", marginBottom: 4 }}>
          {completedCount}<span style={{ fontSize: 16, fontWeight: 400, color: "#94a3b8" }}>/10 sessões</span>
        </div>

        {/* Barra */}
        <div style={{ height: 8, borderRadius: 99, background: "#f1f5f9", marginBottom: 16, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${completedCount * 10}%`, background: "linear-gradient(90deg, #0d9488, #14b8a6)", borderRadius: 99, transition: "width 0.5s" }} />
        </div>

        {/* 10 bolinhas */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(sessions.length > 0 ? sessions : Array.from({ length: 10 }, (_, i) => ({ id: String(i), session_number: i + 1, status: "scheduled", scheduled_date: "", scheduled_time: "", checked_in_at: null }))).map((s) => {
            const done = s.status === "completed";
            const active = s.status === "in_progress" || s.status === "checked_in";
            return (
              <div
                key={s.id}
                title={`Sessão ${s.session_number}`}
                style={{
                  width: 36, height: 36, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 13,
                  background: done ? "#0f766e" : active ? "#14b8a6" : "#f1f5f9",
                  color: done || active ? "#fff" : "#94a3b8",
                  border: active ? "2px solid #0f766e" : done ? "none" : "2px solid #e2e8f0",
                }}
              >
                {done ? "✓" : s.session_number}
              </div>
            );
          })}
        </div>
      </div>

      {/* Info do pacote */}
      <div style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", marginBottom: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.08)" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#0f766e", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Seu pacote
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>Início</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#1e293b" }}>{fmtDate(pkg.start_date)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>Vencimento</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: daysLeft <= 7 ? "#dc2626" : "#1e293b" }}>
              {fmtDate(pkg.end_date)}{daysLeft <= 7 && <span style={{ fontSize: 12 }}> ({daysLeft}d)</span>}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>Valor</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#1e293b" }}>{fmt(pkg.price_cents)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>Pagamento</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: pkg.payment_status === "paid" ? "#16a34a" : "#d97706" }}>
              {pkg.payment_status === "paid" ? "✅ Pago" : "⏳ Pendente"}
            </div>
          </div>
        </div>
      </div>

      {/* Próxima sessão */}
      {nextSession && (
        <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 16, padding: "16px 24px", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#16a34a", marginBottom: 4 }}>Próxima sessão</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>
            Sessão {nextSession.session_number} · {fmtDate(nextSession.scheduled_date)}
            {nextSession.scheduled_time && ` às ${nextSession.scheduled_time.slice(0, 5)}`}
          </div>
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 24 }}>
        <p style={{ fontSize: 13, color: "#94a3b8" }}>
          Dúvidas? Fale com a{" "}
          <a href="https://wa.me/5592981234567" style={{ color: "#0f766e", fontWeight: 600 }}>
            Dra. Evely 💬
          </a>
        </p>
      </div>
    </div>
  );
}
