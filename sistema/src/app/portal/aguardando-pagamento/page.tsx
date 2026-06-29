"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Evaluation = {
  diagnosis: string;
  short_term_goal: string;
  medium_term_goal: string;
  long_term_goal: string;
};

type Patient = {
  id: string;
  full_name: string;
};

export default function AguardandoPagamentoPage() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;

      const { data: p } = await supabase
        .from("patients")
        .select("id, full_name")
        .eq("auth_user_id", user.id)
        .single();

      if (!p) { setLoading(false); return; }
      setPatient(p as Patient);

      const { data: ev } = await supabase
        .from("evaluations")
        .select("diagnosis, short_term_goal, medium_term_goal, long_term_goal")
        .eq("patient_id", p.id)
        .maybeSingle();

      setEvaluation(ev as Evaluation | null);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-gray-50)" }}>
        <div style={{ color: "var(--color-gray-400)", fontSize: 14 }}>Carregando...</div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--color-gray-50)", padding: "32px 16px" }}>
      <div style={{ maxWidth: 420, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "var(--color-teal-800)" }}>
            Dra. Evely<span style={{ color: "var(--color-orange-500)" }}>.</span>
          </span>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--color-teal-50)", color: "var(--color-teal-800)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600 }}>
            {patient?.full_name?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() ?? "?"}
          </div>
        </div>

        <div style={{ fontSize: 12, color: "var(--color-gray-400)", marginBottom: 6 }}>
          Olá, {patient?.full_name?.split(" ")[0] ?? ""}
        </div>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, color: "var(--color-navy-900)", marginBottom: 20 }}>
          Sua avaliação está pronta!
        </h2>

        {/* Prontuário */}
        {evaluation && (
          <div style={{ background: "white", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-gray-200)", padding: 20, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <i className="ti ti-file-check" style={{ color: "var(--color-teal-700)", fontSize: 18 }} />
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--color-navy-900)" }}>Seu prontuário</span>
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-gray-400)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Diagnóstico</div>
              <p style={{ fontSize: 14, color: "var(--color-navy-900)", fontWeight: 600 }}>{evaluation.diagnosis}</p>
            </div>

            {[
              ["Objetivo de curto prazo", evaluation.short_term_goal],
              ["Objetivo de médio prazo", evaluation.medium_term_goal],
              ["Objetivo de longo prazo", evaluation.long_term_goal],
            ].map(([label, val]) => (
              <div key={label} style={{ marginBottom: 10, paddingTop: 10, borderTop: "1px solid var(--color-gray-100)" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-gray-400)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
                <p style={{ fontSize: 13, color: "var(--color-gray-600)", lineHeight: 1.5 }}>{val}</p>
              </div>
            ))}
          </div>
        )}

        {/* Pacote */}
        <div style={{ background: "white", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-gray-200)", padding: 20, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <i className="ti ti-calendar-stats" style={{ color: "var(--color-teal-700)", fontSize: 18 }} />
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--color-navy-900)" }}>Pacote de tratamento</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "var(--color-gray-600)" }}>Sessões incluídas</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>10 sessões</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "var(--color-gray-600)" }}>Duração</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>30 dias</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: "var(--color-gray-600)" }}>Reagendamento gratuito</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>1 por ciclo</span>
          </div>

          <div style={{ background: "var(--color-amber-50)", border: "1px solid #F2DCB0", borderRadius: "var(--radius-sm)", padding: "10px 12px", fontSize: 13, color: "var(--color-amber-700)", display: "flex", gap: 8, alignItems: "flex-start" }}>
            <i className="ti ti-info-circle" style={{ flexShrink: 0, marginTop: 1 }} />
            <span>O pagamento e agendamento das sessões serão combinados diretamente com a Dra. Evely. Entre em contato para confirmar.</span>
          </div>
        </div>

        {/* Contato */}
        <a
          href="https://wa.me/5592999999999"
          target="_blank"
          rel="noreferrer"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            background: "var(--color-teal-800)", color: "white", borderRadius: "var(--radius-sm)",
            padding: "12px 20px", fontSize: 14, fontWeight: 600, textDecoration: "none",
            fontFamily: "var(--font-body)",
          }}
        >
          <i className="ti ti-brand-whatsapp" style={{ fontSize: 18 }} />
          Confirmar com a Dra. Evely
        </a>

      </div>
    </main>
  );
}
