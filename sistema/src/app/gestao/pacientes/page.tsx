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
  birth_date: string | null;
  portal_username: string;
};

type Evaluation = {
  id: string;
  diagnosis: string;
  short_term_goal: string;
  medium_term_goal: string;
  long_term_goal: string;
  evaluated_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  awaiting_evaluation: "Aguardando avaliação",
  awaiting_payment:    "Aguardando pagamento",
  active:              "Ativo",
  suspended_travel:    "Suspenso",
  overdue:             "Vencido",
  cancelled:           "Cancelado",
};

const STATUS_BADGE: Record<string, string> = {
  awaiting_evaluation: "badge-warning",
  awaiting_payment:    "badge-info",
  active:              "badge-success",
  suspended_travel:    "badge-neutral",
  overdue:             "badge-danger",
  cancelled:           "badge-neutral",
};

const STATUS_ICON: Record<string, string> = {
  awaiting_evaluation: "ti-stethoscope",
  awaiting_payment:    "ti-credit-card",
  active:              "",
  suspended_travel:    "",
};

function initials(name: string) {
  return name.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

const EMPTY_FORM = { diagnosis: "", short_term_goal: "", medium_term_goal: "", long_term_goal: "" };

export default function PacientesPage() {
  const [tab, setTab]               = useState<"lista" | "financeiro" | "cs">("lista");
  const [patients, setPatients]     = useState<Patient[]>([]);
  const [search, setSearch]         = useState("");
  const [selected, setSelected]     = useState<Patient | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [modalTab, setModalTab]     = useState<"resumo" | "historico" | "prontuario">("resumo");
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState("");

  function loadPatients() {
    const supabase = createClient();
    supabase
      .from("patients")
      .select("id, full_name, phone, guardian_name, diagnosis, status, birth_date, portal_username")
      .order("full_name")
      .then(({ data }) => setPatients((data as Patient[]) ?? []));
  }

  useEffect(() => { loadPatients(); }, []);

  async function openPatient(p: Patient) {
    setSelected(p);
    setModalTab(p.status === "awaiting_evaluation" ? "prontuario" : "resumo");
    setForm(EMPTY_FORM);
    setFormError("");
    setEvaluation(null);

    const supabase = createClient();
    const { data } = await supabase
      .from("evaluations")
      .select("*")
      .eq("patient_id", p.id)
      .maybeSingle();
    if (data) setEvaluation(data as Evaluation);
  }

  function closeModal() {
    setSelected(null);
    setEvaluation(null);
  }

  async function salvarAvaliacao() {
    if (!selected) return;
    setFormError("");
    if (!form.diagnosis || !form.short_term_goal || !form.medium_term_goal || !form.long_term_goal) {
      setFormError("Preencha todos os campos obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/avaliacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: selected.id, ...form }),
      });
      const json = await res.json();
      if (!res.ok) { setFormError(json.error ?? "Erro ao salvar."); return; }
      closeModal();
      loadPatients();
    } catch {
      setFormError("Erro de rede. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

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
                      <td colSpan={6} style={{ textAlign: "center", color: "var(--gray-400)", padding: "40px" }}>
                        {patients.length === 0 ? "Nenhum paciente cadastrado ainda." : "Nenhum resultado."}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((p) => (
                      <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => openPatient(p)}>
                        <td>
                          <div className="person">
                            <div className="avatar" style={{ background: p.status === "awaiting_evaluation" ? "var(--orange-50)" : "var(--teal-50)", color: p.status === "awaiting_evaluation" ? "var(--orange-700)" : "var(--teal-800)" }}>
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
                            {STATUS_ICON[p.status] && <i className={`ti ${STATUS_ICON[p.status]}`} style={{ fontSize: 11 }} />}
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
              { icon: "ti-circle-check", bg: "var(--teal-50)", c: "var(--teal-800)", label: "Pagos este mês",      val: "0", sub: "R$ 0,00 recebidos" },
              { icon: "ti-alert-circle", bg: "var(--red-50)",  c: "var(--red-700)",  label: "Em aberto",           val: "0", sub: "R$ 0,00 a receber" },
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
            <div className="section-title"><span><i className="ti ti-file-off" style={{ color: "var(--red-700)", marginRight: 6 }} />Sem contrato</span></div>
            <div style={{ color: "var(--gray-400)", fontSize: 13 }}>Nenhum pacote vencido.</div>
          </div>
          <div className="card">
            <div className="section-title"><span><i className="ti ti-cake" style={{ color: "var(--orange-500)", marginRight: 6 }} />Aniversariantes do mês</span></div>
            <div style={{ color: "var(--gray-400)", fontSize: 13 }}>Nenhum aniversariante este mês.</div>
          </div>
        </div>
      )}

      {/* ═══ Modal do paciente ═══ */}
      {selected && (
        <div className="modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3>{selected.full_name}</h3>
              <button className="modal-close" onClick={closeModal}>&times;</button>
            </div>

            <div className="g-flex gap-8 mb-16">
              <span className={`badge ${STATUS_BADGE[selected.status] ?? "badge-neutral"}`}>
                {STATUS_LABEL[selected.status]}
              </span>
            </div>

            {/* Tabs do modal */}
            {selected.status !== "awaiting_evaluation" && (
              <div className="tabs" style={{ marginBottom: 14 }}>
                <button className={`tab-btn${modalTab === "resumo" ? " active" : ""}`} onClick={() => setModalTab("resumo")}>Resumo</button>
                <button className={`tab-btn${modalTab === "historico" ? " active" : ""}`} onClick={() => setModalTab("historico")}>Histórico</button>
                <button className={`tab-btn${modalTab === "prontuario" ? " active" : ""}`} onClick={() => setModalTab("prontuario")}>Prontuário</button>
              </div>
            )}

            {/* ── Resumo ── */}
            {modalTab === "resumo" && (
              <table style={{ fontSize: 13, width: "100%" }}>
                <tbody>
                  {[
                    ["Telefone", selected.phone],
                    ["Responsável", selected.guardian_name ?? "—"],
                    ["Usuário do portal", selected.portal_username],
                    ["Diagnóstico", selected.diagnosis ?? "—"],
                  ].map(([label, val]) => (
                    <tr key={label}>
                      <td className="muted" style={{ padding: "6px 0", border: "none" }}>{label}</td>
                      <td style={{ padding: "6px 0", border: "none", textAlign: "right" }}>{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* ── Histórico ── */}
            {modalTab === "historico" && (
              <div style={{ color: "var(--gray-400)", fontSize: 13 }}>Nenhuma sessão realizada ainda.</div>
            )}

            {/* ── Prontuário ── */}
            {modalTab === "prontuario" && (
              <>
                {selected.status === "awaiting_evaluation" ? (
                  /* Formulário de avaliação */
                  <>
                    <div className="alert-box info" style={{ marginBottom: 16 }}>
                      <i className="ti ti-info-circle" />
                      <span>Ao salvar, o paciente poderá ver o prontuário e confirmar o pacote de 10 sessões no portal.</span>
                    </div>

                    {formError && (
                      <div className="alert-box danger" style={{ marginBottom: 12 }}>
                        <i className="ti ti-alert-triangle" /><span>{formError}</span>
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label">Diagnóstico *</label>
                      <input className="form-input" type="text" placeholder="Ex: Lombalgia mecânica" value={form.diagnosis} onChange={(e) => setForm((f) => ({ ...f, diagnosis: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Objetivo de curto prazo *</label>
                      <textarea className="form-textarea" placeholder="O que queremos alcançar nas primeiras semanas..." value={form.short_term_goal} onChange={(e) => setForm((f) => ({ ...f, short_term_goal: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Objetivo de médio prazo *</label>
                      <textarea className="form-textarea" placeholder="Evolução esperada no pacote..." value={form.medium_term_goal} onChange={(e) => setForm((f) => ({ ...f, medium_term_goal: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Objetivo de longo prazo *</label>
                      <textarea className="form-textarea" placeholder="Meta final do tratamento..." value={form.long_term_goal} onChange={(e) => setForm((f) => ({ ...f, long_term_goal: e.target.value }))} />
                    </div>

                    <div className="modal-actions">
                      <button className="btn btn-outline" onClick={closeModal} disabled={saving}>Cancelar</button>
                      <button className="btn btn-primary" onClick={salvarAvaliacao} disabled={saving}>
                        <i className="ti ti-check" />{saving ? "Salvando..." : "Salvar avaliação"}
                      </button>
                    </div>
                  </>
                ) : evaluation ? (
                  /* Prontuário já preenchido */
                  <>
                    <span className="badge badge-success mb-16" style={{ display: "inline-flex" }}>
                      <i className="ti ti-file-check" style={{ fontSize: 11 }} />Avaliação concluída
                    </span>
                    <table style={{ fontSize: 13, width: "100%", marginBottom: 16 }}>
                      <tbody>
                        <tr>
                          <td className="muted" style={{ padding: "6px 0", border: "none" }}>Diagnóstico</td>
                          <td style={{ padding: "6px 0", border: "none", textAlign: "right" }}>{evaluation.diagnosis}</td>
                        </tr>
                      </tbody>
                    </table>
                    {[
                      ["Objetivo de curto prazo", evaluation.short_term_goal],
                      ["Objetivo de médio prazo", evaluation.medium_term_goal],
                      ["Objetivo de longo prazo", evaluation.long_term_goal],
                    ].map(([label, val]) => (
                      <div key={label} style={{ marginBottom: 14 }}>
                        <div className="text-xs muted fw-600" style={{ textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>{label}</div>
                        <p className="text-sm">{val}</p>
                      </div>
                    ))}
                    <div className="modal-actions">
                      <button className="btn btn-outline btn-block" onClick={closeModal}>Fechar</button>
                    </div>
                  </>
                ) : (
                  <div style={{ color: "var(--gray-400)", fontSize: 13 }}>Nenhuma avaliação registrada.</div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
