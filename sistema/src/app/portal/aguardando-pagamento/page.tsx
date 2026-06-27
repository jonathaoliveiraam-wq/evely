export default function AguardandoPagamentoPage() {
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
          style={{ background: "var(--color-amber-50)" }}
        >
          <span className="text-2xl">💳</span>
        </div>

        <h1
          className="text-lg font-semibold mb-2"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-navy-900)" }}
        >
          Pagamento pendente
        </h1>

        <p className="text-sm mb-6" style={{ color: "var(--color-gray-600)" }}>
          Sua avaliação foi concluída! Realize o pagamento do pacote para liberar
          seu acesso completo e agendar suas sessões.
        </p>

        {/* Placeholder Pix — preenchido na fase 6 com integração real */}
        <div
          className="p-4 text-sm"
          style={{
            background: "var(--color-gray-50)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-gray-200)",
            color: "var(--color-gray-600)",
          }}
        >
          As informações de pagamento serão exibidas aqui após a integração Pix.
        </div>
      </div>
    </main>
  );
}
