import { createClient } from "@/lib/supabase/server";

async function fetchMetrics() {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const [{ count: totalPatients }, { count: activeSessions }, { data: todaySessions }] =
    await Promise.all([
      supabase.from("patients").select("*", { count: "exact", head: true }),
      supabase
        .from("patients")
        .select("*", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("sessions")
        .select("id, session_number, scheduled_time, status, packages(patients(full_name, phone))")
        .eq("scheduled_date", today)
        .order("scheduled_time"),
    ]);

  return { totalPatients: totalPatients ?? 0, activeSessions: activeSessions ?? 0, todaySessions: todaySessions ?? [] };
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Agendada",
  checked_in: "Check-in feito",
  in_progress: "Em andamento",
  completed: "Concluída",
  no_show: "Faltou",
  cancelled: "Cancelada",
  rescheduled: "Reagendada",
};

const STATUS_COLOR: Record<string, string> = {
  scheduled: "var(--color-gray-500, #6B7280)",
  checked_in: "var(--color-teal-600, #0D7A5F)",
  in_progress: "var(--color-teal-700, #0A6B52)",
  completed: "var(--color-teal-800, #04342C)",
  no_show: "var(--color-red-500, #EF4444)",
  cancelled: "var(--color-red-500, #EF4444)",
  rescheduled: "var(--color-amber-600, #D97706)",
};

export default async function GestaoPage() {
  const { totalPatients, activeSessions, todaySessions } = await fetchMetrics();

  const cards = [
    { label: "Pacientes cadastrados", value: totalPatients, icon: "👥" },
    { label: "Pacientes ativos", value: activeSessions, icon: "✅" },
    { label: "Sessões hoje", value: todaySessions.length, icon: "📅" },
  ];

  return (
    <div style={{ padding: "36px 40px", maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 24,
            color: "var(--color-navy-900, #101826)",
          }}
        >
          Dashboard
        </h1>
        <p style={{ color: "var(--color-gray-500, #6B7280)", fontSize: 14, marginTop: 4 }}>
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 40 }}>
        {cards.map(({ label, value, icon }) => (
          <div
            key={label}
            style={{
              background: "white",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-gray-200, #E5E7EB)",
              padding: "24px 28px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 22 }}>{icon}</span>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 32,
                color: "var(--color-teal-800, #04342C)",
                lineHeight: 1,
              }}
            >
              {value}
            </span>
            <span style={{ fontSize: 13, color: "var(--color-gray-500, #6B7280)" }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Sessões de hoje */}
      <div
        style={{
          background: "white",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-gray-200, #E5E7EB)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px 28px",
            borderBottom: "1px solid var(--color-gray-100, #F3F4F6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: 16,
              color: "var(--color-navy-900, #101826)",
            }}
          >
            Sessões de hoje
          </h2>
          <span
            style={{
              background: "var(--color-teal-50, #E1F5EE)",
              color: "var(--color-teal-800, #04342C)",
              fontSize: 12,
              fontWeight: 600,
              padding: "2px 10px",
              borderRadius: "var(--radius-pill)",
            }}
          >
            {todaySessions.length} sessão{todaySessions.length !== 1 ? "ões" : ""}
          </span>
        </div>

        {todaySessions.length === 0 ? (
          <div
            style={{
              padding: "48px",
              textAlign: "center",
              color: "var(--color-gray-400, #9CA3AF)",
              fontSize: 14,
            }}
          >
            Nenhuma sessão agendada para hoje.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--color-gray-50, #F9FAFB)" }}>
                {["Horário", "Paciente", "Sessão #", "Status"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 28px",
                      textAlign: "left",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--color-gray-500, #6B7280)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {todaySessions.map((session: any, i: number) => {
                const patient = (session.packages as any)?.patients;
                return (
                  <tr
                    key={session.id}
                    style={{
                      borderTop: i > 0 ? "1px solid var(--color-gray-100, #F3F4F6)" : "none",
                    }}
                  >
                    <td style={{ padding: "14px 28px", fontSize: 14, fontWeight: 600, color: "var(--color-navy-900, #101826)" }}>
                      {session.scheduled_time?.slice(0, 5)}
                    </td>
                    <td style={{ padding: "14px 28px", fontSize: 14, color: "var(--color-navy-900, #101826)" }}>
                      {patient?.full_name ?? "—"}
                    </td>
                    <td style={{ padding: "14px 28px", fontSize: 14, color: "var(--color-gray-600, #4B5563)" }}>
                      #{session.session_number}
                    </td>
                    <td style={{ padding: "14px 28px" }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: STATUS_COLOR[session.status] ?? "gray",
                        }}
                      >
                        {STATUS_LABEL[session.status] ?? session.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
