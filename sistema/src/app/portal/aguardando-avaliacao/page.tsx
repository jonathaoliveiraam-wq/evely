export default function AguardandoAvaliacaoPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--color-gray-50)] px-4">
      <div
        className="w-full max-w-sm p-8 text-center"
        style={{
          background: "white",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-gray-200)",
        }}
      >
        <span
          className="text-2xl font-bold block mb-6"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-teal-800)" }}
        >
          Dra. Evely<span style={{ color: "var(--color-orange-500)" }}>.</span>
        </span>

        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: "var(--color-teal-50)" }}
        >
          <span className="text-2xl">📋</span>
        </div>

        <h1
          className="text-lg font-semibold mb-2"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-navy-900)" }}
        >
          Aguardando avaliação
        </h1>

        <p className="text-sm" style={{ color: "var(--color-gray-600)" }}>
          Sua ficha foi criada! Em breve a Dra. Evely fará sua avaliação inicial
          e liberará o acesso completo ao seu portal.
        </p>

        <div
          className="mt-6 p-3 text-xs"
          style={{
            background: "var(--color-teal-50)",
            borderRadius: "var(--radius-sm)",
            color: "var(--color-teal-800)",
          }}
        >
          Dúvidas? Entre em contato diretamente com a clínica.
        </div>
      </div>
    </main>
  );
}
