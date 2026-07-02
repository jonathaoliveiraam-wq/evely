"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const TITLES: Record<string, [string, string]> = {
  "/gestao":            ["Visão geral", `Resumo da clínica hoje, ${new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}`],
  "/gestao/agenda":     ["Agenda", "Visualize e organize os atendimentos da semana"],
  "/gestao/pacientes":  ["Pacientes", "Cadastro, financeiro e relacionamento em um só lugar"],
  "/gestao/financeiro": ["Financeiro", "Pagamentos do mês e pacotes a renovar"],
  "/gestao/cs":         ["Suporte", "Contratos vencidos, aniversariantes e suspensões"],
};

const EMPTY = { full_name: "", phone: "", guardian_name: "", birth_date: "", diagnosis: "", notes: "", portal_username: "", password: "" };

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, sub] = TITLES[pathname] ?? ["Gestão", ""];

  function set(field: keyof typeof EMPTY, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function gerarSenha() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = "";
    for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
    set("password", s);
  }

  function fechar() {
    setShowModal(false);
    setForm(EMPTY);
    setError("");
  }

  async function salvar() {
    setError("");
    if (!form.full_name || !form.phone || !form.portal_username || !form.password) {
      setError("Nome, telefone, usuário e senha são obrigatórios.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/pacientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Erro ao cadastrar."); return; }
      fechar();
      router.push("/gestao/pacientes");
      router.refresh();
    } catch {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="topbar">
        <div className="g-flex" style={{ alignItems: "center", gap: 12 }}>
          <div>
            <h1>{title}</h1>
            <div className="topbar-sub">{sub}</div>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <i className="ti ti-plus" />
          <span>Novo paciente</span>
        </button>
      </div>

      {/* Modal Novo Paciente */}
      <div className={`modal-overlay${showModal ? " active" : ""}`} onClick={(e) => { if (e.target === e.currentTarget) fechar(); }}>
        <div className="modal">
          <div className="modal-header">
            <h3>Novo paciente</h3>
            <button className="modal-close" onClick={fechar}>&times;</button>
          </div>

          {error && (
            <div className="alert-box danger" style={{ marginBottom: 14 }}>
              <i className="ti ti-alert-triangle" /><span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Nome completo *</label>
            <input className="form-input" type="text" placeholder="Ex: Maria Clara Souza" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Telefone *</label>
            <input className="form-input" type="text" placeholder="(92) 99999-0000" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div className="g-grid grid-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Aniversário</label>
              <input className="form-input" type="date" value={form.birth_date} onChange={(e) => set("birth_date", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Responsável (se houver)</label>
              <input className="form-input" type="text" placeholder="Nome do responsável" value={form.guardian_name} onChange={(e) => set("guardian_name", e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Diagnóstico</label>
            <input className="form-input" type="text" placeholder="Ex: Lombalgia" value={form.diagnosis} onChange={(e) => set("diagnosis", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Observações</label>
            <textarea className="form-textarea" placeholder="Observações clínicas, restrições..." value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>

          <div className="divider" />

          <div className="section-title" style={{ marginBottom: 10 }}>Acesso ao portal do paciente</div>
          <div className="form-group">
            <label className="form-label">Usuário *</label>
            <input className="form-input" type="text" placeholder="Ex: maria.souza" value={form.portal_username} onChange={(e) => set("portal_username", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Senha *</label>
            <div className="g-flex gap-8">
              <input className="form-input" type="text" placeholder="Senha de acesso" value={form.password} onChange={(e) => set("password", e.target.value)} style={{ flex: 1 }} />
              <button className="btn btn-outline btn-sm" type="button" onClick={gerarSenha}>
                <i className="ti ti-refresh" />Gerar
              </button>
            </div>
            <div className="text-xs muted mt-8">Entregue esse usuário e senha ao paciente para o primeiro acesso.</div>
          </div>

          <div className="alert-box info">
            <i className="ti ti-info-circle" />
            <span>Login do paciente: usuário <strong>{form.portal_username || "..."}</strong> · senha acima.</span>
          </div>

          <div className="modal-actions">
            <button className="btn btn-outline" onClick={fechar} disabled={loading}>Cancelar</button>
            <button className="btn btn-primary" onClick={salvar} disabled={loading}>
              <i className="ti ti-check" />{loading ? "Salvando..." : "Cadastrar paciente"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
