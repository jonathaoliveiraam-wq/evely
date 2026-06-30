"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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

type Patient = {
  id: string;
  full_name: string;
};

const PIX_KEY   = "00020126580014BR.GOV.BCB.PIX0136evely.sarmento@passinho.com.br5204000053039865802BR5925DRA EVELY SARMENTO FISIO6009SAO PAULO62070503***63041D3A";
const PIX_VALOR = "R$ 490,00";

const PHOTO_SLOTS: { label: string; angle: string }[] = [
  { label: "Frente",        angle: "front"      },
  { label: "Costas",        angle: "back"       },
  { label: "Lado direito",  angle: "right_side" },
  { label: "Lado esquerdo", angle: "left_side"  },
];

function PixQR() {
  return (
    <div style={{ width: 160, height: 160, margin: "0 auto", background: `repeating-conic-gradient(#101826 0% 25%, white 0% 50%) 0 0/12px 12px, repeating-conic-gradient(#101826 0% 25%, white 0% 50%) 6px 6px/12px 12px`, borderRadius: 8, border: "8px solid white", boxShadow: "0 0 0 1px var(--color-gray-200)", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 36, height: 36, background: "var(--color-teal-800)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <i className="ti ti-currency-real" style={{ color: "white", fontSize: 16 }} />
        </div>
      </div>
    </div>
  );
}

export default function AguardandoPagamentoPage() {
  const [patient, setPatient]       = useState<Patient | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [photos, setPhotos]         = useState<EvaluationPhoto[]>([]);
  const [loading, setLoading]       = useState(true);
  const [pronOpen, setPronOpen]     = useState(false);
  const [copied, setCopied]         = useState(false);
  const [lightbox, setLightbox]     = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: p } = await supabase.from("patients").select("id, full_name").eq("auth_user_id", user.id).single();
      if (!p) { setLoading(false); return; }
      setPatient(p as Patient);

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
      setLoading(false);
    });
  }, []);

  function photoPublicUrl(path: string) {
    const supabase = createClient();
    return supabase.storage.from("avaliacoes").getPublicUrl(path).data.publicUrl;
  }

  async function copiarChave() {
    await navigator.clipboard.writeText(PIX_KEY);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-gray-50)" }}>
        <div style={{ color: "var(--color-gray-400)", fontSize: 14 }}>Carregando...</div>
      </main>
    );
  }

  const firstName      = patient?.full_name?.split(" ")[0] ?? "";
  const avatarInitials = patient?.full_name?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() ?? "?";

  return (
    <main style={{ minHeight: "100vh", background: "var(--color-gray-50)", padding: "32px 16px" }}>
      <div style={{ maxWidth: 400, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "var(--color-teal-800)" }}>
            Dra. Evely<span style={{ color: "var(--color-orange-500)" }}>.</span>
          </span>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--color-teal-50)", color: "var(--color-teal-800)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600 }}>
            {avatarInitials}
          </div>
        </div>

        <div style={{ fontSize: 12, color: "var(--color-gray-400)", marginBottom: 4 }}>Olá, {firstName}</div>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, color: "var(--color-navy-900)", marginBottom: 20 }}>
          Sua avaliação está pronta!
        </h2>

        {/* Botão prontuário colapsável */}
        {evaluation && (
          <div style={{ marginBottom: 12 }}>
            <button
              onClick={() => setPronOpen((v) => !v)}
              style={{ width: "100%", background: "white", border: "1px solid var(--color-gray-200)", borderRadius: pronOpen ? "var(--radius-lg) var(--radius-lg) 0 0" : "var(--radius-lg)", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontFamily: "var(--font-display)", color: "var(--color-navy-900)", fontSize: 15, fontWeight: 600 }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 34, height: 34, borderRadius: 8, background: "var(--color-teal-50)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="ti ti-file-check" style={{ color: "var(--color-teal-700)", fontSize: 17 }} />
                </span>
                Prontuário
              </span>
              <i className={`ti ${pronOpen ? "ti-chevron-up" : "ti-chevron-down"}`} style={{ color: "var(--color-gray-400)" }} />
            </button>

            {pronOpen && (
              <div style={{ background: "white", border: "1px solid var(--color-gray-200)", borderTop: "none", borderRadius: "0 0 var(--radius-lg) var(--radius-lg)", padding: "16px 18px" }}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-gray-400)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Diagnóstico</div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-navy-900)" }}>{evaluation.diagnosis}</p>
                </div>
                {[["Curto prazo", evaluation.short_term_goal], ["Médio prazo", evaluation.medium_term_goal], ["Longo prazo", evaluation.long_term_goal]].map(([label, val]) => (
                  <div key={label} style={{ paddingTop: 10, marginBottom: 10, borderTop: "1px solid var(--color-gray-100)" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-gray-400)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{label}</div>
                    <p style={{ fontSize: 13, color: "var(--color-gray-600)", lineHeight: 1.5 }}>{val}</p>
                  </div>
                ))}

                {/* Fotos */}
                {photos.length > 0 && (
                  <div style={{ paddingTop: 12, borderTop: "1px solid var(--color-gray-100)" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-gray-400)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Fotos da avaliação</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                      {PHOTO_SLOTS.map(({ label, angle }) => {
                        const ph = photos.find((p) => p.angle === angle);
                        return ph ? (
                          <div key={angle} style={{ position: "relative" }}>
                            <img
                              src={photoPublicUrl(ph.storage_path)}
                              alt={label}
                              onClick={() => setLightbox(photoPublicUrl(ph.storage_path))}
                              style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 8, border: "1px solid var(--color-gray-200)", cursor: "zoom-in" }}
                            />
                            <div style={{ position: "absolute", bottom: 3, left: 0, right: 0, textAlign: "center", fontSize: 8, fontWeight: 700, color: "white", textShadow: "0 1px 3px rgba(0,0,0,0.7)", textTransform: "uppercase" }}>{label}</div>
                          </div>
                        ) : (
                          <div key={angle} style={{ aspectRatio: "1", background: "var(--color-gray-50)", borderRadius: 8, border: "1px dashed var(--color-gray-200)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <i className="ti ti-photo-off" style={{ color: "var(--color-gray-300)", fontSize: 14 }} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Card pagamento Pix */}
        <div style={{ background: "white", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-gray-200)", padding: 20, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <i className="ti ti-qrcode" style={{ color: "var(--color-teal-700)", fontSize: 18 }} />
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--color-navy-900)" }}>Pagamento via Pix</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid var(--color-gray-100)" }}>
            <span style={{ fontSize: 13, color: "var(--color-gray-500)" }}>10 sessões · 30 dias</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--color-navy-900)" }}>{PIX_VALOR}</span>
          </div>

          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <PixQR />
            <p style={{ fontSize: 11, color: "var(--color-gray-400)", marginTop: 8 }}>Escaneie pelo app do banco</p>
          </div>

          <div style={{ background: "var(--color-gray-50)", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-gray-400)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Pix copia e cola</div>
            <div style={{ fontSize: 11, color: "var(--color-gray-600)", wordBreak: "break-all", lineHeight: 1.4 }}>{PIX_KEY.slice(0, 60)}…</div>
          </div>

          <button
            onClick={copiarChave}
            style={{ width: "100%", padding: "11px 0", borderRadius: 8, background: copied ? "var(--color-teal-800)" : "var(--color-teal-50)", color: copied ? "white" : "var(--color-teal-800)", border: `1.5px solid ${copied ? "var(--color-teal-800)" : "var(--color-teal-200)"}`, fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.2s" }}
          >
            <i className={`ti ${copied ? "ti-check" : "ti-copy"}`} />
            {copied ? "Chave copiada!" : "Copiar chave Pix"}
          </button>
        </div>

        <div style={{ background: "var(--color-amber-50)", border: "1px solid #F2DCB0", borderRadius: 10, padding: "11px 14px", fontSize: 12, color: "var(--color-amber-700)", display: "flex", gap: 8, alignItems: "flex-start" }}>
          <i className="ti ti-info-circle" style={{ flexShrink: 0, marginTop: 1 }} />
          <span>Após o pagamento, envie o comprovante para a Dra. Evely pelo WhatsApp para confirmar suas sessões.</span>
        </div>

      </div>

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, cursor: "zoom-out" }}>
          <img src={lightbox} alt="Foto" style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 8, boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }} />
        </div>
      )}
    </main>
  );
}
