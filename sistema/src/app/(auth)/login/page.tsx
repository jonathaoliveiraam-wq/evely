"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "admin" | "patient";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("patient");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let email = identifier;

      if (mode === "patient") {
        // Username → email construído internamente
        email = `${identifier.toLowerCase().trim()}@portal.evelypassinho`;
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError("Usuário ou senha incorretos.");
        return;
      }

      // O middleware redireciona para a rota correta conforme role
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--color-gray-50)] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <span
            className="text-3xl font-bold"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-teal-800)" }}
          >
            Dra. Evely<span style={{ color: "var(--color-orange-500)" }}>.</span>
          </span>
          <p className="text-sm mt-1" style={{ color: "var(--color-gray-600)" }}>
            Espaço Passinho · Fisioterapia
          </p>
        </div>

        {/* Seletor de módulo */}
        <div
          className="flex p-1 mb-6 gap-1"
          style={{
            background: "var(--color-gray-100)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          {(["patient", "admin"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(""); }}
              className="flex-1 py-2 text-sm font-semibold transition-all"
              style={{
                borderRadius: "7px",
                border: "none",
                cursor: "pointer",
                background: mode === m ? "white" : "transparent",
                color: mode === m ? "var(--color-teal-800)" : "var(--color-gray-600)",
                boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {m === "patient" ? "Sou paciente" : "Área restrita"}
            </button>
          ))}
        </div>

        {/* Card do formulário */}
        <div
          className="p-6"
          style={{
            background: "white",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--color-gray-200)",
            boxShadow: "0 4px 12px rgba(8,80,65,0.08)",
          }}
        >
          <h1
            className="text-lg font-semibold mb-5"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-navy-900)" }}
          >
            {mode === "patient" ? "Acesse seu portal" : "Login administrativo"}
          </h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{ color: "var(--color-navy-700)" }}
              >
                {mode === "patient" ? "Nome de usuário" : "E-mail"}
              </label>
              <input
                type={mode === "admin" ? "email" : "text"}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={mode === "patient" ? "seu.usuario" : "evely@email.com"}
                required
                className="w-full px-3 py-2.5 text-sm outline-none transition-colors"
                style={{
                  border: "1px solid var(--color-gray-200)",
                  borderRadius: "var(--radius-sm)",
                  fontFamily: "var(--font-body)",
                  color: "var(--color-navy-900)",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--color-teal-500)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--color-gray-200)")}
              />
            </div>

            <div>
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{ color: "var(--color-navy-700)" }}
              >
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3 py-2.5 text-sm outline-none transition-colors"
                style={{
                  border: "1px solid var(--color-gray-200)",
                  borderRadius: "var(--radius-sm)",
                  fontFamily: "var(--font-body)",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--color-teal-500)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--color-gray-200)")}
              />
            </div>

            {error && (
              <p
                className="text-xs px-3 py-2.5"
                style={{
                  background: "var(--color-red-50)",
                  color: "var(--color-red-700)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-sm font-semibold text-white mt-1 transition-opacity"
              style={{
                background: "var(--color-teal-800)",
                borderRadius: "var(--radius-sm)",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                fontFamily: "var(--font-body)",
              }}
            >
              {loading ? "Entrando…" : "Entrar"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "var(--color-gray-400)" }}>
          Problemas para acessar? Fale com a Dra. Evely.
        </p>
      </div>
    </main>
  );
}
