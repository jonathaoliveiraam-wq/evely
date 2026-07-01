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
  completed_at: string | null;
  was_punctual: boolean | null;
  did_activities: boolean | null;
  evolution_notes: string | null;
  activities_notes: string | null;
  recommendation_notes: string | null;
  photos: string[] | null;
};

type Patient = { id: string; full_name: string; status: string };

const fmt = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

const isPlaceholder = (d: string) => !d || d >= "2099-01-01";

function Star({ filled, active }: { filled: boolean; active?: boolean }) {
  return (
    <span style={{
      fontSize: 28,
      lineHeight: 1,
      color: filled ? "#f59e0b" : active ? "#14b8a6" : "#e2e8f0",
      filter: filled ? "drop-shadow(0 1px 3px rgba(245,158,11,0.4))" : "none",
      transition: "all 0.2s",
    }}>
      {filled ? "★" : active ? "✦" : "☆"}
    </span>
  );
}

export default function PortalAtivoPage() {
  const [patient, setPatient]           = useState<Patient | null>(null);
  const [pkg, setPkg]                   = useState<Package | null>(null);
  const [sessions, setSessions]         = useState<Session[]>([]);
  const [loading, setLoading]           = useState(true);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinDone, setCheckinDone]   = useState(false);
  const [histDetail, setHistDetail]     = useState<Session | null>(null);

  const today = new Date().toISOString().split("T")[0];

  async function loadSessions(packageId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from("sessions")
      .select("id, session_number, scheduled_date, scheduled_time, status, checked_in_at, completed_at, was_punctual, did_activities, evolution_notes, activities_notes, recommendation_notes, photos")
      .eq("package_id", packageId)
      .order("session_number");
    setSessions((data as Session[]) ?? []);
  }

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: pat } = await supabase
        .from("patients").select("id, full_name, status")
        .eq("auth_user_id", user.id).single();
      if (!pat) { setLoading(false); return; }
      setPatient(pat);

      const { data: activePkg } = await supabase
        .from("packages").select("id, start_date, end_date, price_cents, payment_status")
        .eq("patient_id", pat.id).order("created_at", { ascending: false }).limit(1).single();

      if (activePkg) {
        setPkg(activePkg);
        await loadSessions(activePkg.id);
      }
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime: atualiza sessões automaticamente quando status muda
  useEffect(() => {
    if (!pkg) return;
    const supabase = createClient();
    const channel = supabase
      .channel("portal-sessions-rt-" + pkg.id)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "sessions",
        filter: `package_id=eq.${pkg.id}`,
      }, () => { loadSessions(pkg.id); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pkg?.id]);

  const completedSessions = sessions.filter(s => s.status === "completed");
  const completedCount = completedSessions.length;
  const todaySession = sessions.find(s => s.scheduled_date === today && s.status !== "completed" && s.status !== "cancelled");
  const nextSession = sessions.find(s => s.status === "scheduled" && !isPlaceholder(s.scheduled_date));

  const totalPoints = sessions.reduce((acc, s) => {
    if (s.status !== "completed") return acc;
    return acc + 20 + (s.was_punctual ? 10 : 0) + (s.did_activities ? 10 : 0);
  }, 0);
  const maxPoints = 400;
  const pointsPercent = Math.round((totalPoints / maxPoints) * 100);

  const trophy = totalPoints >= 400 ? "🏆" : totalPoints >= 280 ? "🥇" : totalPoints >= 160 ? "🥈" : totalPoints >= 80 ? "🥉" : "🎯";

  async function doCheckin() {
    if (!todaySession) return;
    setCheckinLoading(true);
    await fetch(`/api/sessoes/${todaySession.id}/checkin`, { method: "POST" });
    setCheckinDone(true);
    setCheckinLoading(false);
    if (pkg) await loadSessions(pkg.id);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center", color: "#0f766e" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
          <div style={{ fontSize: 14, color: "#64748b" }}>Carregando...</div>
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
          Aguardando ativação do seu pacote.<br />Em breve a Dra. Evely irá confirmar.
        </p>
      </div>
    );
  }

  const daysLeft = Math.max(0, Math.ceil((new Date(pkg.end_date).getTime() - Date.now()) / 86400000));

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "24px 16px 60px" }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 40, marginBottom: 6 }}>🦶</div>
        <h2 style={{ fontFamily: "var(--font-display, serif)", color: "#0f766e", fontSize: 21, margin: "0 0 4px" }}>
          Olá, {patient?.full_name?.split(" ")[0]}!
        </h2>
        <p style={{ color: "#94a3b8", fontSize: 13 }}>Acompanhe seu progresso aqui.</p>
      </div>

      {/* ── Gamificação ── */}
      <div style={{
        background: "#fff",
        borderRadius: 18,
        padding: "18px 20px",
        marginBottom: 16,
        boxShadow: "0 1px 8px rgba(15,118,110,0.1)",
        border: "1px solid #ccfbf1",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
              Seus pontos
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontSize: 34, fontWeight: 900, color: "#0f766e", lineHeight: 1 }}>{totalPoints}</span>
              <span style={{ fontSize: 14, color: "#94a3b8", fontWeight: 400 }}>/ {maxPoints} pts</span>
            </div>
          </div>
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            background: "linear-gradient(135deg, #ccfbf1, #99f6e4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26,
          }}>
            {trophy}
          </div>
        </div>

        {/* Barra */}
        <div style={{ height: 6, borderRadius: 99, background: "#f1f5f9", marginBottom: 10, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${pointsPercent}%`,
            background: "linear-gradient(90deg, #0d9488, #34d399)",
            borderRadius: 99, transition: "width 0.7s ease",
          }} />
        </div>

        {/* Legenda */}
        <div style={{ display: "flex", gap: 14, fontSize: 11, color: "#94a3b8", flexWrap: "wrap" }}>
          <span>★ Presença: 20 pts</span>
          <span>⏰ Pontualidade: +10</span>
          <span>🏠 Atividades: +10</span>
        </div>
      </div>

      {/* ── Check-in ── */}
      {todaySession && !checkinDone && todaySession.status === "scheduled" && (
        <div style={{ background: "#0f766e", borderRadius: 16, padding: "20px 24px", marginBottom: 16, color: "#fff", textAlign: "center" }}>
          <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>Você tem sessão hoje!</div>
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 14 }}>
            Sessão {todaySession.session_number}/10 às {todaySession.scheduled_time?.slice(0, 5)}
          </div>
          <button onClick={doCheckin} disabled={checkinLoading} style={{
            background: "#fff", color: "#0f766e", border: "none", borderRadius: 10,
            padding: "11px 24px", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%",
          }}>
            {checkinLoading ? "Registrando…" : "✅ Fazer check-in de chegada"}
          </button>
        </div>
      )}
      {(checkinDone || todaySession?.status === "checked_in") && (
        <div style={{ background: "#14b8a6", borderRadius: 16, padding: "14px 24px", marginBottom: 16, color: "#fff", textAlign: "center" }}>
          <div style={{ fontSize: 18, marginBottom: 2 }}>✅ Check-in feito!</div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>Aguarde a Dra. Evely confirmar o início.</div>
        </div>
      )}
      {todaySession?.status === "in_progress" && (
        <div style={{ background: "#0d9488", borderRadius: 16, padding: "14px 24px", marginBottom: 16, color: "#fff", textAlign: "center" }}>
          <div style={{ fontSize: 18, marginBottom: 2 }}>🏃 Sessão em andamento!</div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>Aproveite ao máximo!</div>
        </div>
      )}

      {/* ── Progresso — estrelas ── */}
      <div style={{ background: "#fff", borderRadius: 18, padding: "18px 20px", marginBottom: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.07)" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Progresso</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#0f766e" }}>{completedCount}</span>
          <span style={{ fontSize: 13, color: "#94a3b8" }}>/ 10 sessões</span>
        </div>

        <div style={{ height: 5, borderRadius: 99, background: "#f1f5f9", marginBottom: 14, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${completedCount * 10}%`,
            background: "linear-gradient(90deg, #0d9488, #34d399)",
            borderRadius: 99, transition: "width 0.5s",
          }} />
        </div>

        {/* Estrelas */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(sessions.length > 0
            ? sessions
            : Array.from({ length: 10 }, (_, i) => ({
                id: String(i), session_number: i + 1, status: "scheduled",
                scheduled_date: "2099-12-31", scheduled_time: "", checked_in_at: null,
                completed_at: null, was_punctual: null, did_activities: null,
                evolution_notes: null, activities_notes: null, recommendation_notes: null,
              }))
          ).map((s) => (
            <div key={s.id} title={`Sessão ${s.session_number}`}>
              <Star
                filled={s.status === "completed"}
                active={s.status === "in_progress" || s.status === "checked_in"}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Seu pacote ── */}
      <div style={{ background: "#fff", borderRadius: 18, padding: "18px 20px", marginBottom: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.07)" }}>
        <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Seu pacote</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>Início</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{fmtDate(pkg.start_date)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>Vencimento</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: daysLeft <= 7 ? "#dc2626" : "#1e293b" }}>
              {fmtDate(pkg.end_date)}{daysLeft <= 7 && <span style={{ fontSize: 11 }}> ({daysLeft}d)</span>}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>Valor</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{fmt(pkg.price_cents)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>Pagamento</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: pkg.payment_status === "paid" ? "#16a34a" : "#d97706" }}>
              {pkg.payment_status === "paid" ? "✅ Pago" : "⏳ Pendente"}
            </div>
          </div>
        </div>
      </div>

      {/* ── Próxima sessão ── */}
      {nextSession ? (
        <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 16, padding: "14px 20px", marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#16a34a", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Próxima sessão</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>
            Sessão {nextSession.session_number} · {fmtDate(nextSession.scheduled_date)}
            {nextSession.scheduled_time && ` às ${nextSession.scheduled_time.slice(0, 5)}`}
          </div>
        </div>
      ) : (
        <div style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 16, padding: "14px 20px", marginBottom: 16, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#94a3b8" }}>Nenhuma sessão agendada ainda.</div>
          <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 2 }}>A Dra. Evely irá agendar em breve.</div>
        </div>
      )}

      {/* ── Histórico ── */}
      {completedSessions.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 18, padding: "18px 20px", marginBottom: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.07)" }}>
          <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
            Histórico de sessões
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[...completedSessions].reverse().map((s) => (
              <button
                key={s.id}
                onClick={() => setHistDetail(s)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12,
                  padding: "10px 14px", cursor: "pointer", textAlign: "left", width: "100%",
                  transition: "background 0.15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18, color: "#f59e0b" }}>★</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>Sessão {s.session_number}/10</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>
                      {s.completed_at
                        ? new Date(s.completed_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
                        : fmtDate(s.scheduled_date)}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {s.was_punctual && <span title="Pontual" style={{ fontSize: 14 }}>⏰</span>}
                  {s.did_activities && <span title="Atividades feitas" style={{ fontSize: 14 }}>🏠</span>}
                  <span style={{ fontSize: 16, color: "#cbd5e1" }}>›</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 20 }}>
        <p style={{ fontSize: 12, color: "#cbd5e1" }}>
          Dúvidas?{" "}
          <a href="https://wa.me/5592981234567" style={{ color: "#0f766e", fontWeight: 600 }}>
            Fale com a Dra. Evely 💬
          </a>
        </p>
      </div>

      {/* ── Modal: detalhe da sessão ── */}
      {histDetail && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setHistDetail(null); }}
          style={{
            position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
            zIndex: 9999, padding: "0 0 0 0",
          }}
        >
          <div style={{
            background: "#fff", borderRadius: "20px 20px 0 0", padding: "24px 24px 40px",
            width: "100%", maxWidth: 520, maxHeight: "85vh", overflowY: "auto",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0f766e" }}>Sessão {histDetail.session_number}/10</div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>
                  {histDetail.completed_at
                    ? new Date(histDetail.completed_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
                    : fmtDate(histDetail.scheduled_date)}
                </div>
              </div>
              <button onClick={() => setHistDetail(null)} style={{ fontSize: 22, background: "none", border: "none", cursor: "pointer", color: "#94a3b8", lineHeight: 1 }}>×</button>
            </div>

            {/* Flags */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <span style={{
                padding: "5px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600,
                background: histDetail.was_punctual ? "#f0fdf4" : "#fff7ed",
                color: histDetail.was_punctual ? "#16a34a" : "#ea580c",
                border: `1px solid ${histDetail.was_punctual ? "#86efac" : "#fed7aa"}`,
              }}>
                ⏰ {histDetail.was_punctual ? "Pontual" : "Com atraso"}
              </span>
              <span style={{
                padding: "5px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600,
                background: histDetail.did_activities ? "#f0fdf4" : "#fff7ed",
                color: histDetail.did_activities ? "#16a34a" : "#ea580c",
                border: `1px solid ${histDetail.did_activities ? "#86efac" : "#fed7aa"}`,
              }}>
                🏠 {histDetail.did_activities ? "Fez atividades" : "Sem atividades"}
              </span>
            </div>

            {/* Pontos da sessão */}
            <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 24 }}>★</span>
              <div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Pontos nesta sessão</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0f766e" }}>
                  {20 + (histDetail.was_punctual ? 10 : 0) + (histDetail.did_activities ? 10 : 0)} pts
                </div>
              </div>
            </div>

            {/* Notas */}
            {histDetail.evolution_notes && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Evolução</div>
                <p style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.6, margin: 0 }}>{histDetail.evolution_notes}</p>
              </div>
            )}
            {histDetail.activities_notes && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Atividades</div>
                <p style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.6, margin: 0 }}>{histDetail.activities_notes}</p>
              </div>
            )}
            {histDetail.recommendation_notes && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Recomendações</div>
                <p style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.6, margin: 0 }}>{histDetail.recommendation_notes}</p>
              </div>
            )}
            {!histDetail.evolution_notes && !histDetail.activities_notes && !histDetail.recommendation_notes && (
              <p style={{ fontSize: 14, color: "#94a3b8", textAlign: "center", margin: "20px 0" }}>Nenhuma anotação registrada para esta sessão.</p>
            )}

            {/* Fotos */}
            {histDetail.photos && histDetail.photos.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Fotos</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {histDetail.photos.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer" style={{ display: "block", borderRadius: 10, overflow: "hidden", aspectRatio: "4/3" }}>
                      <img src={url} alt={`Foto ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
