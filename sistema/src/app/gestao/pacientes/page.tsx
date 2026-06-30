"use client";

import { useEffect, useRef, useState } from "react";
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
};

type EvaluationPhoto = {
  angle: string;
  storage_path: string;
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

const PHOTO_SLOTS: { label: string; angle: string }[] = [
  { label: "Frente",        angle: "front"      },
  { label: "Costas",        angle: "back"       },
  { label: "Lado direito",  angle: "right_side" },
  { label: "Lado esquerdo", angle: "left_side"  },
];

function initials(name: string) {
  return name.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function photoPublicUrl(path: string) {
  const supabase = createClient();
  return supabase.storage.from("avaliacoes").getPublicUrl(path).data.publicUrl;
}

const EMPTY_FORM = { diagnosis: "", short_term_goal: "", medium_term_goal: "", long_term_goal: "" };

export default function PacientesPage() {
  const [tab, setTab]               = useState<"lista" | "financeiro" | "cs">("lista");
  const [patients, setPatients]     = useState<Patient[]>([]);
  const [search, setSearch]         = useState("");
  const [selected, setSelected]     = useState<Patient | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [photos, setPhotos]         = useState<EvaluationPhoto[]>([]);
  const [modalTab, setModalTab]     = useState<"resumo" | "historico" | "prontuario">("resumo");
  const [form, setForm]             = useState(EMPTY_FORM);
  const [newPhotos, setNewPhotos]   = useState<(File | null)[]>([null, null, null, null]);
  const [previews, setPreviews]     = useState<(string | null)[]>([null, null, null, null]);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState("");
  const [lightbox, setLightbox]     = useState<string | null>(null);

  const fileRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

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
    setNewPhotos([null, null, null, null]);
    setPreviews([null, null, null, null]);
    setFormError("");
    setEvaluation(null);
    setPhotos([]);

    const supabase = createClient();
    const { data: ev } = await supabase
      .from("evaluations")
      .select("id, diagnosis, short_term_goal, medium_term_goal, long_term_goal")
      .eq("patient_id", p.id)
      .maybeSingle();

    if (ev) {
      setEvaluation(ev as Evaluation);
      const { data: ph } = await supabase
        .from("evaluation_photos")
        .select("angle, storage_path")
        .eq("evaluation_id", ev.id);
      setPhotos((ph as EvaluationPhoto[]) ?? []);
    }
  }

  function closeModal() { setSelected(null); setEvaluation(null); setPhotos([]); }

  function handlePhotoSelect(index: number, file: File | null) {
    if (!file) return;
    const np = [...newPhotos]; const pp = [...previews];
    np[index] = file;
    pp[index] = URL.createObjectURL(file);
    setNewPhotos(np); setPreviews(pp);
  }

  function removePhoto(index: number) {
    const np = [...newPhotos]; const pp = [...previews];
    if (pp[index]) URL.revokeObjectURL(pp[index]!);
    np[index] = null; pp[index] = null;
    setNewPhotos(np); setPreviews(pp);
  }

  async function salvarAvaliacao() {
    if (!selected) return;
    setFormError("");
    if (!form.diagnosis || !form.short_term_goal || !form.medium_term_goal || !form.long_term_goal) {
      setFormError("Preencha todos os campos obrigatórios."); return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("patient_id",       selected.id);
      fd.append("diagnosis",        form.diagnosis);
      fd.append("short_term_goal",  form.short_term_goal);
      fd.append("medium_term_goal", form.medium_term_goal);
      fd.append("long_term_goal",   form.long_term_goal);
      PHOTO_SLOTS.forEach(({ angle }, i) => {
        const file = newPhotos[i];
        if (file) fd.append(`photo_${angle}`, file);
      });

      const res  = await fetch("/api/avaliacoes", { method: "POST", body: fd });
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
                  <tr><th>Paciente</th><th>Diagnóstico</th><th>Pacote</th><th>Pagamento</th><th>Situação</th><th /></tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--gray-400)", padding: "40px" }}>
                      {patients.length === 0 ? "Nenhum paciente cadastrado ainda." : "Nenhum resultado."}
                    </td></tr>
                  ) : filtered.map((p) => (
                    <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => openPatient(p)}>
                      <td>
                        <div className="person">
                          <div className="avatar" style={{ background: p.status === "awaiting_evaluation" ? "var(--orange-50)" : "var(--teal-50)", color: p.status === "awaiting_evaluation" ? "var(--orange-700)" : "var(--teal-800)" }}>
                            {initials(p.full_name)}
                          </div>
                          <div>
                            <div className="person-name">{p.full_name}{p.guardian_name && <span className="muted text-xs"> (resp. {p.guardian_name})</span>}</div>
                            <div className="person-sub">{p.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-sm muted">{p.diagnosis ?? "—"}</td>
                      <td className="text-sm muted">—</td>
                      <td><span className="badge badge-neutral">—</span></td>
                      <td><span className={`badge ${STATUS_BADGE[p.status] ?? "badge-neutral"}`}>{STATUS_LABEL[p.status] ?? p.status}</span></td>
                      <td><i className="ti ti-chevron-right muted" /></td>
                    </tr>
                  ))}
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
              { icon: "ti-alert-circle", bg: "var(--red-50)", c: "var(--red-700)", label: "Em aberto", val: "0", sub: "R$ 0,00 a receber" },
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
                <tbody><tr><td colSpan={5} style={{ textAlign: "center", color: "var(--gray-400)", padding: "32px" }}>Nenhum pacote cadastrado.</td></tr></tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === "cs" && (
        <div className="g-grid grid-2 mb-16">
          <div className="card"><div className="section-title"><span><i className="ti ti-file-off" style={{ color: "var(--red-700)", marginRight: 6 }} />Sem contrato</span></div><div style={{ color: "var(--gray-400)", fontSize: 13 }}>Nenhum pacote vencido.</div></div>
          <div className="card"><div className="section-title"><span><i className="ti ti-cake" style={{ color: "var(--orange-500)", marginRight: 6 }} />Aniversariantes do mês</span></div><div style={{ color: "var(--gray-400)", fontSize: 13 }}>Nenhum aniversariante este mês.</div></div>
        </div>
      )}

      {/* ═══ Modal ═══ */}
      {selected && (
        <div className="modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <h3>{selected.full_name}</h3>
              <button className="modal-close" onClick={closeModal}>&times;</button>
            </div>
            <div className="g-flex gap-8 mb-16">
              <span className={`badge ${STATUS_BADGE[selected.status] ?? "badge-neutral"}`}>{STATUS_LABEL[selected.status]}</span>
            </div>

            {selected.status !== "awaiting_evaluation" && (
              <div className="tabs" style={{ marginBottom: 14 }}>
                <button className={`tab-btn${modalTab === "resumo" ? " active" : ""}`} onClick={() => setModalTab("resumo")}>Resumo</button>
                <button className={`tab-btn${modalTab === "historico" ? " active" : ""}`} onClick={() => setModalTab("historico")}>Histórico</button>
                <button className={`tab-btn${modalTab === "prontuario" ? " active" : ""}`} onClick={() => setModalTab("prontuario")}>Prontuário</button>
              </div>
            )}

            {modalTab === "resumo" && (
              <table style={{ fontSize: 13, width: "100%" }}>
                <tbody>
                  {[["Telefone", selected.phone], ["Responsável", selected.guardian_name ?? "—"], ["Usuário do portal", selected.portal_username], ["Diagnóstico", selected.diagnosis ?? "—"]].map(([label, val]) => (
                    <tr key={label}><td className="muted" style={{ padding: "6px 0", border: "none" }}>{label}</td><td style={{ padding: "6px 0", border: "none", textAlign: "right" }}>{val}</td></tr>
                  ))}
                </tbody>
              </table>
            )}

            {modalTab === "historico" && (
              <div style={{ color: "var(--gray-400)", fontSize: 13 }}>Nenhuma sessão realizada ainda.</div>
            )}

            {modalTab === "prontuario" && (
              <>
                {selected.status === "awaiting_evaluation" ? (
                  /* ── Formulário de nova avaliação ── */
                  <>
                    <div className="alert-box info" style={{ marginBottom: 16 }}>
                      <i className="ti ti-info-circle" />
                      <span>Ao salvar, o paciente verá o prontuário e o Pix para pagamento.</span>
                    </div>
                    {formError && <div className="alert-box danger" style={{ marginBottom: 12 }}><i className="ti ti-alert-triangle" /><span>{formError}</span></div>}

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

                    <div className="form-group">
                      <label className="form-label">Fotos da avaliação</label>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 6 }}>
                        {PHOTO_SLOTS.map(({ label }, i) => (
                          <div key={i}>
                            <input ref={fileRefs[i]} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handlePhotoSelect(i, e.target.files?.[0] ?? null)} />
                            {previews[i] ? (
                              <div style={{ position: "relative" }}>
                                <img src={previews[i]!} alt={label} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 8, border: "1px solid var(--gray-200)" }} />
                                <button onClick={() => removePhoto(i)} style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", background: "rgba(16,24,38,0.7)", color: "white", border: "none", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                              </div>
                            ) : (
                              <button onClick={() => fileRefs[i].current?.click()} style={{ width: "100%", aspectRatio: "1", background: "var(--gray-50)", border: "1.5px dashed var(--gray-200)", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, cursor: "pointer", color: "var(--gray-400)" }}>
                                <i className="ti ti-camera-plus" style={{ fontSize: 20 }} />
                                <span style={{ fontSize: 10, fontWeight: 600 }}>{label}</span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs muted mt-8">Fotos ficam no histórico clínico do paciente.</p>
                    </div>

                    <div className="modal-actions">
                      <button className="btn btn-outline" onClick={closeModal} disabled={saving}>Cancelar</button>
                      <button className="btn btn-primary" onClick={salvarAvaliacao} disabled={saving}>
                        <i className="ti ti-check" />{saving ? "Salvando..." : "Salvar avaliação"}
                      </button>
                    </div>
                  </>
                ) : evaluation ? (
                  /* ── Visualização do prontuário ── */
                  <>
                    <span className="badge badge-success mb-16" style={{ display: "inline-flex" }}>
                      <i className="ti ti-file-check" style={{ fontSize: 11 }} />Avaliação concluída
                    </span>
                    <table style={{ fontSize: 13, width: "100%", marginBottom: 14 }}>
                      <tbody>
                        <tr><td className="muted" style={{ padding: "6px 0", border: "none" }}>Diagnóstico</td><td style={{ padding: "6px 0", border: "none", textAlign: "right", fontWeight: 600 }}>{evaluation.diagnosis}</td></tr>
                      </tbody>
                    </table>
                    {[["Curto prazo", evaluation.short_term_goal], ["Médio prazo", evaluation.medium_term_goal], ["Longo prazo", evaluation.long_term_goal]].map(([label, val]) => (
                      <div key={label} style={{ marginBottom: 12 }}>
                        <div className="text-xs muted fw-600" style={{ textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>{label}</div>
                        <p className="text-sm">{val}</p>
                      </div>
                    ))}

                    {photos.length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <div className="text-xs muted fw-600" style={{ textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>Fotos da avaliação</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                          {PHOTO_SLOTS.map(({ label, angle }) => {
                            const ph = photos.find((p) => p.angle === angle);
                            return ph ? (
                              <div key={angle} style={{ position: "relative" }}>
                                <img
                                  src={photoPublicUrl(ph.storage_path)}
                                  alt={label}
                                  onClick={() => setLightbox(photoPublicUrl(ph.storage_path))}
                                  style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 8, border: "1px solid var(--gray-200)", cursor: "zoom-in" }}
                                />
                                <div style={{ position: "absolute", bottom: 4, left: 0, right: 0, textAlign: "center", fontSize: 9, fontWeight: 700, color: "white", textShadow: "0 1px 3px rgba(0,0,0,0.7)", textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</div>
                              </div>
                            ) : (
                              <div key={angle} style={{ aspectRatio: "1", background: "var(--gray-50)", borderRadius: 8, border: "1px dashed var(--gray-200)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <i className="ti ti-photo-off" style={{ color: "var(--gray-300)", fontSize: 16 }} />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="modal-actions" style={{ marginTop: 20 }}>
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

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, cursor: "zoom-out" }}>
          <img src={lightbox} alt="Foto" style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 8, boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }} />
        </div>
      )}
    </>
  );
}
