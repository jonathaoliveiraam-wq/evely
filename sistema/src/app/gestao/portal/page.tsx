"use client";

import { useState } from "react";

const STAR_PATH = "M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.86L12 17.77l-6.18 3.23L7 14.14 2 9.27l7.1-1.01z";

const SESSION_HISTORY = [
  { realizada: true, pontual: true, atividades: true },
  { realizada: true, pontual: true, atividades: true },
  { realizada: true, pontual: false, atividades: true },
  { realizada: true, pontual: true, atividades: true },
  { realizada: true, pontual: true, atividades: true },
];

const PONTOS_MAX = 10 * (20 + 10 + 10); // 400

function calcPontos(hist: typeof SESSION_HISTORY) {
  return hist.reduce((t, s) => {
    if (!s.realizada) return t;
    return t + 20 + (s.pontual ? 10 : 0) + (s.atividades ? 10 : 0);
  }, 0);
}

type Exemplo = "maria" | "rafael" | "sofia";

export default function PortalPage() {
  const [exemplo, setExemplo] = useState<Exemplo>("maria");
  const [checkedIn, setCheckedIn] = useState(false);
  const [sessionHistory, setSessionHistory] = useState(SESSION_HISTORY);
  const pontos = calcPontos(sessionHistory);
  const completo = sessionHistory.length >= 10;

  return (
    <>
      <div className="tabs">
        <button className={`tab-btn${exemplo === "maria" ? " active" : ""}`} onClick={() => setExemplo("maria")}>Exemplo: pacote em dia</button>
        <button className={`tab-btn${exemplo === "rafael" ? " active" : ""}`} onClick={() => setExemplo("rafael")}>Exemplo: pacote vencido</button>
        <button className={`tab-btn${exemplo === "sofia" ? " active" : ""}`} onClick={() => setExemplo("sofia")}>Exemplo: aguardando avaliação</button>
      </div>

      <div className="portal-wrap">
        <div className="portal">

          {/* ---- MARIA (pacote em dia) ---- */}
          {exemplo === "maria" && (
            <>
              <div className="flex-between mb-16">
                <div className="brand" style={{ fontSize: 16 }}>Dra. Evely<span className="dot">.</span></div>
                <div className="avatar">MC</div>
              </div>
              <div className="text-xs muted mb-8">Olá, Maria Clara</div>
              <h3 style={{ fontSize: 18, marginBottom: 14, fontFamily: "var(--font-display)" }}>Seu pacote está ativo</h3>

              <div className="gami-card mb-12">
                <div className="flex-between">
                  <div>
                    <div className="text-xs" style={{ opacity: 0.85 }}>Pontuação neste pacote</div>
                    <div className="gami-points">{pontos} de {PONTOS_MAX} pts</div>
                  </div>
                  <i className="ti ti-trophy" style={{ fontSize: 28, color: "#FFD166" }} />
                </div>
                <div className="gami-track">
                  <div className="gami-fill" style={{ width: `${Math.round((pontos / PONTOS_MAX) * 100)}%` }} />
                </div>
                <div className="text-xs" style={{ opacity: 0.85 }}>20 pts por sessão + 10 pts pontualidade + 10 pts atividades do dia</div>
                <div className="streak-row">
                  {Array.from({ length: 10 }, (_, i) => {
                    const done = i < sessionHistory.length;
                    return (
                      <div key={i} className={`star-dot ${done ? "hit" : "future"}`}>
                        <svg viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d={STAR_PATH} />
                        </svg>
                        <span>{i + 1}</span>
                      </div>
                    );
                  })}
                </div>
                {completo ? (
                  <div className="prize-badge">
                    <i className="ti ti-gift" />
                    <div>
                      <div className="text-sm fw-600" style={{ color: "var(--orange-700)" }}>Você ganhou! Fale com a Dra.</div>
                      <div className="text-xs" style={{ color: "var(--orange-700)" }}>10 de 10 sessões completas neste pacote</div>
                    </div>
                  </div>
                ) : (
                  <div className="prize-badge locked">
                    <i className="ti ti-lock" />
                    <div>
                      <div className="text-sm fw-600" style={{ color: "rgba(255,255,255,0.85)" }}>Prêmio bloqueado</div>
                      <div className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Complete as 10 sessões para desbloquear</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="card mb-12">
                <div className="flex-between mb-8"><span className="text-sm muted">Situação</span><span className="badge badge-success">Pago</span></div>
                <div className="flex-between mb-8"><span className="text-sm muted">Início do pacote</span><span className="text-sm">02 jun 2026</span></div>
                <div className="flex-between mb-8"><span className="text-sm muted">Vencimento</span><span className="text-sm">02 jul 2026</span></div>
                <div className="flex-between"><span className="text-sm muted">Dias restantes</span><span className="text-sm fw-600" style={{ color: "var(--teal-800)" }}>3 dias</span></div>
              </div>

              <div className="section-title" style={{ fontSize: 14 }}>Próxima sessão</div>
              <div className="card mb-12">
                <div className="flex-between mb-12">
                  <div>
                    <div className="text-sm fw-600">Hoje</div>
                    <div className="text-xs muted">08:00 · sessão 6 de 10</div>
                  </div>
                  <span className="badge badge-info">Agendada</span>
                </div>
                <div className="mb-12">
                  {checkedIn ? (
                    <span className="checkin-pill done"><i className="ti ti-check" style={{ fontSize: 13 }} />Check-in feito</span>
                  ) : (
                    <button className="btn btn-primary btn-sm" onClick={() => setCheckedIn(true)}>
                      <i className="ti ti-map-pin" />Fazer check-in de chegada
                    </button>
                  )}
                </div>
              </div>

              {!completo && (
                <button
                  className="btn btn-outline btn-block mt-8"
                  style={{ borderStyle: "dashed" }}
                  onClick={() => {
                    const extras = [];
                    for (let i = sessionHistory.length; i < 10; i++) {
                      extras.push({ realizada: true, pontual: true, atividades: true });
                    }
                    setSessionHistory([...sessionHistory, ...extras]);
                  }}
                >
                  <i className="ti ti-flask" />Demonstração: simular sessões restantes
                </button>
              )}
            </>
          )}

          {/* ---- RAFAEL (pacote vencido) ---- */}
          {exemplo === "rafael" && (
            <>
              <div className="flex-between mb-16">
                <div className="brand" style={{ fontSize: 16 }}>Dra. Evely<span className="dot">.</span></div>
                <div className="avatar" style={{ background: "var(--orange-50)", color: "var(--orange-700)" }}>RT</div>
              </div>
              <div className="text-xs muted mb-8">Olá, Rafael</div>
              <h3 style={{ fontSize: 18, marginBottom: 14, fontFamily: "var(--font-display)" }}>Seu pacote venceu</h3>
              <div className="alert-box danger mb-12">
                <i className="ti ti-alert-triangle" />
                <span>Novos agendamentos ficam bloqueados até a confirmação de um novo pagamento.</span>
              </div>
              <div className="card mb-12">
                <div className="flex-between mb-8"><span className="text-sm muted">Situação</span><span className="badge badge-danger">Pendente</span></div>
                <div className="flex-between mb-8"><span className="text-sm muted">Pacote anterior</span><span className="text-sm">22 mai — 22 jun 2026</span></div>
                <div className="flex-between"><span className="text-sm muted">Valor da renovação</span><span className="text-sm fw-600">R$ 490,00</span></div>
              </div>
              <div className="card" style={{ textAlign: "center" }}>
                <div className="text-sm fw-600 mb-12">Pagar com Pix para renovar</div>
                <div className="pix-qr" style={{ width: 140, height: 140, margin: "0 auto 12px" }} />
                <div className="pix-code">
                  <span>00020126...fake-code-evely-passinho</span>
                  <button><i className="ti ti-copy" /></button>
                </div>
              </div>
            </>
          )}

          {/* ---- SOFIA (aguardando avaliação) ---- */}
          {exemplo === "sofia" && (
            <>
              <div className="flex-between mb-16">
                <div className="brand" style={{ fontSize: 16 }}>Dra. Evely<span className="dot">.</span></div>
                <div className="avatar" style={{ background: "var(--orange-50)", color: "var(--orange-700)" }}>SF</div>
              </div>
              <div className="text-xs muted mb-8">Olá, Camila (responsável por Sofia)</div>
              <h3 style={{ fontSize: 18, marginBottom: 14, fontFamily: "var(--font-display)" }}>Aguardando avaliação</h3>
              <div className="card" style={{ textAlign: "center", padding: "32px 20px" }}>
                <i className="ti ti-stethoscope" style={{ fontSize: 36, color: "var(--teal-300)" }} />
                <p className="text-sm fw-600 mt-12">Sua avaliação ainda não foi registrada</p>
                <p className="text-xs muted mt-8">
                  Após a avaliação inicial com a Dra. Evely, você poderá ver o prontuário da Sofia aqui e liberar o pagamento do pacote.
                </p>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}
