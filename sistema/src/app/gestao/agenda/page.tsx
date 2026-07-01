"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

// --- Types ---
interface Patient {
  full_name: string
}

interface Package {
  patient_id: string
  patients: Patient | null
}

interface SessionWithPatient {
  id: string
  package_id: string
  session_number: number
  scheduled_date: string
  scheduled_time: string
  status: string
  checked_in_at: string | null
  confirmed_start_at: string | null
  completed_at: string | null
  was_punctual: boolean | null
  did_activities: boolean | null
  location: string | null
  evolution_notes: string | null
  activities_notes: string | null
  recommendation_notes: string | null
  requires_certificate: boolean | null
  packages: Package | null
}

interface BlockedSlot {
  id: string
  slot_time: string
  reason: string
}

interface FinalForm {
  evolution_notes: string
  activities_notes: string
  recommendation_notes: string
  was_punctual: boolean
  did_activities: boolean
  location: string
  requires_certificate: boolean
}

interface ActivePatient {
  id: string
  full_name: string
}

// --- Constants ---
const TIME_SLOTS = [
  "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00",
]

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Agendada",
  checked_in: "Check-in feito",
  in_progress: "Em andamento",
  completed: "Concluída",
  no_show: "Faltou",
  cancelled: "Cancelada",
  rescheduled: "Reagendada",
}

const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

// --- Helpers ---
function getToday(): string {
  return new Date().toISOString().split("T")[0]
}

function getWeekRange(): { monday: string; sunday: string } {
  const now = new Date()
  const day = now.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    monday: monday.toISOString().split("T")[0],
    sunday: sunday.toISOString().split("T")[0],
  }
}

function getWeekDays(): { date: string; label: string; dayName: string }[] {
  const { monday } = getWeekRange()
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    const iso = d.toISOString().split("T")[0]
    const parts = iso.split("-")
    days.push({
      date: iso,
      label: `${parts[2]}/${parts[1]}`,
      dayName: WEEKDAY_SHORT[d.getDay()],
    })
  }
  return days
}

function normalizeTime(t: string): string {
  return t ? t.substring(0, 5) : ""
}

function getPatientName(session: SessionWithPatient): string {
  return session.packages?.patients?.full_name ?? "Paciente"
}

// --- Status Badge ---
function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status

  if (status === "scheduled") {
    return <span className="badge badge-neutral">{label}</span>
  }
  if (status === "checked_in") {
    return (
      <span
        className="badge"
        style={{
          background: "var(--amber-50)",
          color: "var(--amber-700)",
          border: "1px solid var(--amber-400)",
        }}
      >
        {label}
      </span>
    )
  }
  if (status === "in_progress") {
    return (
      <span
        className="badge"
        style={{
          background: "var(--teal-50)",
          color: "var(--teal-700)",
          border: "1px solid var(--teal-600)",
        }}
      >
        {label}
      </span>
    )
  }
  if (status === "completed") {
    return (
      <span
        className="badge"
        style={{
          background: "var(--green-50)",
          color: "var(--green-600)",
          border: "1px solid var(--green-600)",
        }}
      >
        {label}
      </span>
    )
  }
  if (status === "no_show") {
    return (
      <span
        className="badge"
        style={{
          background: "var(--red-50)",
          color: "var(--red-600)",
          border: "1px solid var(--red-600)",
        }}
      >
        {label}
      </span>
    )
  }
  return (
    <span
      className="badge"
      style={{
        background: "var(--gray-50)",
        color: "var(--gray-500)",
        border: "1px solid var(--gray-300)",
      }}
    >
      {label}
    </span>
  )
}

// --- Session Card ---
function SessionCard({
  session,
  onFinalizar,
  onReagendar,
  onCancelar,
  actionLoading,
}: {
  session: SessionWithPatient
  onFinalizar: (s: SessionWithPatient) => void
  onReagendar: (s: SessionWithPatient) => void
  onCancelar: (s: SessionWithPatient) => void
  actionLoading: string | null
}) {
  const isLoading = actionLoading === session.id
  const name = getPatientName(session)

  return (
    <div
      style={{
        background: "var(--teal-50)",
        borderRadius: 10,
        padding: "12px 14px",
        borderLeft: "4px solid var(--teal-600)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 10,
      }}
    >
      {/* Info */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <i className="ti ti-user" style={{ color: "var(--teal-700)", fontSize: 15 }} />
          <span style={{ fontWeight: 700, fontSize: 14, color: "var(--teal-800)" }}>
            {name}
          </span>
        </div>
        <span className="badge badge-neutral" style={{ fontSize: 11 }}>
          Sessão {session.session_number}/10
        </span>
        <StatusBadge status={session.status} />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {session.status === "scheduled" && (
          <span style={{ fontSize: 12, color: "var(--gray-400)" }}>
            <i className="ti ti-clock" style={{ marginRight: 4 }} />
            Aguardando check-in
          </span>
        )}
        {(session.status === "checked_in" || session.status === "in_progress") && (
          <button
            className="btn btn-sm"
            onClick={() => onFinalizar(session)}
            disabled={isLoading}
            style={{
              background: "var(--teal-600)",
              color: "#fff",
              border: "none",
              fontSize: 12,
            }}
          >
            <i className="ti ti-circle-check" style={{ marginRight: 4 }} />
            {isLoading ? "..." : "Finalizar sessão"}
          </button>
        )}
        {session.status === "completed" && (
          <span style={{ color: "var(--green-600)", fontSize: 13 }}>
            <i className="ti ti-check" style={{ marginRight: 4 }} />
            Concluída
          </span>
        )}

        {/* Reagendar / Cancelar — disponível para sessões não finalizadas */}
        {session.status !== "completed" && session.status !== "cancelled" && (
          <div style={{ display: "flex", gap: 4, borderLeft: "1px solid var(--gray-200)", paddingLeft: 8, marginLeft: 4 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onReagendar(session)}
              title="Reagendar"
              style={{ fontSize: 11, padding: "4px 8px", color: "var(--teal-700)" }}
            >
              <i className="ti ti-calendar" style={{ marginRight: 3 }} /> Reagendar
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onCancelar(session)}
              title="Cancelar"
              style={{ fontSize: 11, padding: "4px 8px", color: "var(--red-600)" }}
            >
              <i className="ti ti-x" style={{ marginRight: 3 }} /> Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// --- Main Page ---
export default function AgendaPage() {
  const supabase = createClient()
  const today = getToday()

  const [tab, setTab] = useState<"hoje" | "semana" | "bloqueios">("hoje")

  // Hoje
  const [todaySessions, setTodaySessions] = useState<SessionWithPatient[]>([])
  const [loading, setLoading] = useState(true)

  // Semana
  const [weekSessions, setWeekSessions] = useState<SessionWithPatient[]>([])
  const [weekLoading, setWeekLoading] = useState(false)
  const [weekLoaded, setWeekLoaded] = useState(false)

  // Bloqueios
  const [blockDate, setBlockDate] = useState(today)
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([])
  const [blockLoading, setBlockLoading] = useState(false)
  const [blockingSlot, setBlockingSlot] = useState<string | null>(null)

  // Finalization modal
  const [finalizing, setFinalizing] = useState<SessionWithPatient | null>(null)
  const [finalForm, setFinalForm] = useState<FinalForm>({
    evolution_notes: "",
    activities_notes: "",
    recommendation_notes: "",
    was_punctual: false,
    did_activities: false,
    location: "",
    requires_certificate: false,
  })
  const [finalSaving, setFinalSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Reagendar / Cancelar
  const [reagendando, setReagendando] = useState<SessionWithPatient | null>(null)
  const [reagendandoForm, setReagendandoForm] = useState({ date: today, time: "08:00" })
  const [reagendandoLoading, setReagendandoLoading] = useState(false)

  // Agendar sessão (clique em slot livre)
  const [agendandoSlot, setAgendandoSlot] = useState<{ date: string; time: string } | null>(null)
  const [activePatients, setActivePatients] = useState<ActivePatient[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState("")
  const [agendandoLoading, setAgendandoLoading] = useState(false)

  // ---- Load functions ----

  const loadTodaySessions = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("sessions")
        .select("*, packages(patient_id, patients(full_name))")
        .eq("scheduled_date", today)
        .neq("status", "completed")
        .neq("status", "cancelled")
        .order("scheduled_time")
      if (!error && data) {
        setTodaySessions(data as unknown as SessionWithPatient[])
      }
    } finally {
      setLoading(false)
    }
  }, [today])

  const loadWeekSessions = useCallback(async () => {
    setWeekLoading(true)
    try {
      const { monday, sunday } = getWeekRange()
      const { data, error } = await supabase
        .from("sessions")
        .select("*, packages(patient_id, patients(full_name))")
        .gte("scheduled_date", monday)
        .lte("scheduled_date", sunday)
        .neq("status", "cancelled")
        .order("scheduled_time")
      if (!error && data) {
        setWeekSessions(data as unknown as SessionWithPatient[])
        setWeekLoaded(true)
      }
    } finally {
      setWeekLoading(false)
    }
  }, [])

  const loadBlockedSlots = useCallback(async (date: string) => {
    setBlockLoading(true)
    try {
      const res = await fetch(`/api/agenda/bloqueios?date=${date}`)
      if (res.ok) {
        const json = await res.json()
        setBlockedSlots(json.slots ?? [])
      } else {
        setBlockedSlots([])
      }
    } catch {
      setBlockedSlots([])
    } finally {
      setBlockLoading(false)
    }
  }, [])

  const loadActivePatients = useCallback(async () => {
    const { data } = await supabase
      .from("patients")
      .select("id, full_name")
      .eq("status", "active")
      .order("full_name")
    setActivePatients((data as ActivePatient[]) ?? [])
  }, [supabase])

  // Initial load
  useEffect(() => {
    loadTodaySessions()
    loadActivePatients()
  }, [loadTodaySessions, loadActivePatients])

  // Tab switching
  useEffect(() => {
    if (tab === "semana" && !weekLoaded) {
      loadWeekSessions()
    }
    if (tab === "bloqueios") {
      loadBlockedSlots(blockDate)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  // Bloqueios date change
  useEffect(() => {
    if (tab === "bloqueios") {
      loadBlockedSlots(blockDate)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockDate])

  // ---- Actions ----

  async function handleConfirmarInicio(session: SessionWithPatient) {
    setActionLoading(session.id)
    try {
      await fetch(`/api/sessoes/${session.id}/confirmar`, { method: "POST" })
      await loadTodaySessions()
    } finally {
      setActionLoading(null)
    }
  }

  function openFinalizar(session: SessionWithPatient) {
    setFinalizing(session)
    setFinalForm({
      evolution_notes: session.evolution_notes ?? "",
      activities_notes: session.activities_notes ?? "",
      recommendation_notes: session.recommendation_notes ?? "",
      was_punctual: session.was_punctual ?? false,
      did_activities: session.did_activities ?? false,
      location: session.location ?? "",
      requires_certificate: session.requires_certificate ?? false,
    })
  }

  async function handleFinalizar() {
    if (!finalizing) return
    setFinalSaving(true)
    try {
      await fetch(`/api/sessoes/${finalizing.id}/finalizar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalForm),
      })
      setFinalizing(null)
      await loadTodaySessions()
    } finally {
      setFinalSaving(false)
    }
  }

  function openReagendar(session: SessionWithPatient) {
    setReagendando(session)
    setReagendandoForm({ date: session.scheduled_date ?? today, time: normalizeTime(session.scheduled_time) || "08:00" })
  }

  async function handleReagendar() {
    if (!reagendando) return
    setReagendandoLoading(true)
    try {
      const res = await fetch(`/api/sessoes/${reagendando.id}/reagendar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reagendandoForm),
      })
      const json = await res.json()
      if (!res.ok) { alert(json.error ?? "Erro ao reagendar."); return }
      setReagendando(null)
      await loadTodaySessions()
    } finally {
      setReagendandoLoading(false)
    }
  }

  async function handleCancelar(session: SessionWithPatient) {
    if (!confirm(`Cancelar sessão ${session.session_number}/10 de ${getPatientName(session)}?`)) return
    setActionLoading(session.id)
    try {
      await fetch(`/api/sessoes/${session.id}/cancelar`, { method: "POST" })
      await loadTodaySessions()
    } finally {
      setActionLoading(null)
    }
  }

  function openAgendar(date: string, time: string) {
    setAgendandoSlot({ date, time })
    setSelectedPatientId(activePatients[0]?.id ?? "")
  }

  async function handleAgendar() {
    if (!agendandoSlot || !selectedPatientId) return
    setAgendandoLoading(true)
    try {
      const res = await fetch("/api/sessoes/agendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: selectedPatientId, date: agendandoSlot.date, time: agendandoSlot.time }),
      })
      const json = await res.json()
      if (!res.ok) { alert(json.error ?? "Erro ao agendar."); return }
      setAgendandoSlot(null)
      await loadTodaySessions()
    } finally {
      setAgendandoLoading(false)
    }
  }

  async function handleBloquear(time: string) {
    setBlockingSlot(time)
    try {
      await fetch("/api/agenda/bloqueios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: blockDate, time, reason: "" }),
      })
      await loadBlockedSlots(blockDate)
    } finally {
      setBlockingSlot(null)
    }
  }

  async function handleDesbloquear(id: string) {
    setBlockingSlot(id)
    try {
      await fetch(`/api/agenda/bloqueios?id=${id}`, { method: "DELETE" })
      await loadBlockedSlots(blockDate)
    } finally {
      setBlockingSlot(null)
    }
  }

  // ---- Helpers ----

  function getSessionForSlot(time: string): SessionWithPatient | undefined {
    return todaySessions.find((s) => normalizeTime(s.scheduled_time) === time)
  }

  function getBlockedSlotForTime(time: string): BlockedSlot | undefined {
    return blockedSlots.find((b) => normalizeTime(b.slot_time) === time)
  }

  const weekDays = getWeekDays()

  // ---- Render ----
  return (
    <div style={{ padding: "24px", maxWidth: 1100, margin: "0 auto" }}>

      {/* Page Header */}
      <div
        className="g-flex"
        style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}
      >
        <div>
          <h1 className="section-title" style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
            <i className="ti ti-calendar" />
            Agenda
          </h1>
          <p className="muted text-sm">Gerencie as sessões e horários da clínica</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        <button
          className={`tab-btn${tab === "hoje" ? " active" : ""}`}
          onClick={() => setTab("hoje")}
        >
          <i className="ti ti-clock" style={{ marginRight: 6 }} />
          Hoje
        </button>
        <button
          className={`tab-btn${tab === "semana" ? " active" : ""}`}
          onClick={() => setTab("semana")}
        >
          <i className="ti ti-calendar" style={{ marginRight: 6 }} />
          Semana
        </button>
        <button
          className={`tab-btn${tab === "bloqueios" ? " active" : ""}`}
          onClick={() => setTab("bloqueios")}
        >
          <i className="ti ti-ban" style={{ marginRight: 6 }} />
          Bloqueios
        </button>
      </div>

      {/* ==================== TAB: HOJE ==================== */}
      {tab === "hoje" && (
        <div>
          <div
            className="g-flex gap-12"
            style={{ alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}
          >
            <span className="muted text-sm">
              <i className="ti ti-calendar" style={{ marginRight: 4 }} />
              {new Date(today + "T12:00:00").toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={loadTodaySessions}
              disabled={loading}
            >
              Atualizar
            </button>
          </div>

          {loading ? (
            <div
              className="card"
              style={{ padding: 40, textAlign: "center", color: "var(--gray-400)" }}
            >
              <i
                className="ti ti-clock"
                style={{ fontSize: 28, marginBottom: 10, display: "block" }}
              />
              Carregando sessões do dia...
            </div>
          ) : (
            <div className="card card-flush" style={{ overflow: "hidden" }}>
              {TIME_SLOTS.map((time) => {
                const session = getSessionForSlot(time)
                const blocked = getBlockedSlotForTime(time)

                return (
                  <div
                    key={time}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 16,
                      padding: "14px 20px",
                      borderBottom: "1px solid var(--gray-50)",
                    }}
                  >
                    {/* Time label */}
                    <div
                      style={{
                        minWidth: 56,
                        fontWeight: 700,
                        fontSize: 14,
                        color: "var(--teal-700)",
                        paddingTop: 4,
                        flexShrink: 0,
                      }}
                    >
                      {time}
                    </div>

                    {/* Slot content */}
                    <div style={{ flex: 1 }}>
                      {session ? (
                        <SessionCard
                          session={session}
                          onFinalizar={openFinalizar}
                          onReagendar={openReagendar}
                          onCancelar={handleCancelar}
                          actionLoading={actionLoading}
                        />
                      ) : blocked ? (
                        <div className="g-flex gap-8" style={{ alignItems: "center" }}>
                          <span
                            className="badge"
                            style={{
                              background: "var(--gray-50)",
                              color: "var(--gray-500)",
                              border: "1px solid var(--gray-300)",
                            }}
                          >
                            <i className="ti ti-lock" style={{ marginRight: 4, fontSize: 11 }} />
                            Bloqueado
                          </span>
                          {blocked.reason && (
                            <span className="muted text-sm">{blocked.reason}</span>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => openAgendar(today, time)}
                          style={{
                            background: "transparent", border: "none", cursor: "pointer",
                            display: "flex", alignItems: "center", gap: 8, padding: "4px 0",
                            width: "100%",
                          }}
                        >
                          <span
                            className="badge"
                            style={{
                              background: "var(--green-50)",
                              color: "var(--green-600)",
                              border: "1px solid var(--green-600)",
                            }}
                          >
                            <i className="ti ti-plus" style={{ fontSize: 11, marginRight: 4 }} />
                            Disponível — clique para agendar
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB: SEMANA ==================== */}
      {tab === "semana" && (
        <div>
          <div
            className="g-flex gap-12"
            style={{ alignItems: "center", marginBottom: 16 }}
          >
            <span className="muted text-sm">
              Semana de {weekDays[0]?.label} a {weekDays[6]?.label}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={loadWeekSessions}
              disabled={weekLoading}
            >
              Atualizar
            </button>
          </div>

          {weekLoading ? (
            <div
              className="card"
              style={{ padding: 40, textAlign: "center", color: "var(--gray-400)" }}
            >
              Carregando semana...
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 10,
              }}
            >
              {weekDays.map(({ date, label, dayName }) => {
                const daySessions = weekSessions.filter(
                  (s) => s.scheduled_date === date
                )
                const isToday = date === today

                return (
                  <div
                    key={date}
                    className="card"
                    style={{
                      padding: "12px 10px",
                      border: isToday
                        ? "2px solid var(--teal-600)"
                        : "1px solid var(--gray-50)",
                    }}
                  >
                    {/* Day header */}
                    <div style={{ marginBottom: 10, textAlign: "center" }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: isToday ? "var(--teal-700)" : "var(--gray-500)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {dayName}
                      </div>
                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: 700,
                          color: isToday ? "var(--teal-700)" : "inherit",
                        }}
                      >
                        {label.split("/")[0]}
                      </div>
                    </div>

                    {/* Sessions */}
                    {daySessions.length === 0 ? (
                      <div
                        className="muted text-sm"
                        style={{ textAlign: "center", fontSize: 11 }}
                      >
                        Livre
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                      >
                        {daySessions.map((s) => (
                          <div
                            key={s.id}
                            style={{
                              background: "var(--teal-50)",
                              borderRadius: 6,
                              padding: "6px 8px",
                              borderLeft: "3px solid var(--teal-600)",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: "var(--teal-800)",
                              }}
                            >
                              {normalizeTime(s.scheduled_time)}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "var(--gray-500)",
                                marginTop: 2,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {getPatientName(s)}
                            </div>
                            <div style={{ marginTop: 4 }}>
                              <StatusBadge status={s.status} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB: BLOQUEIOS ==================== */}
      {tab === "bloqueios" && (
        <div>
          {/* Date picker card */}
          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <div
              className="g-flex gap-16"
              style={{ alignItems: "flex-end", flexWrap: "wrap" }}
            >
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: "block", marginBottom: 4 }}>
                  <i className="ti ti-calendar" style={{ marginRight: 4 }} />
                  Selecionar data
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={blockDate}
                  onChange={(e) => setBlockDate(e.target.value)}
                  style={{ width: "auto" }}
                />
              </div>
              <div className="muted text-sm" style={{ paddingBottom: 2 }}>
                {blockedSlots.length === 0
                  ? "Nenhum horário bloqueado nesta data"
                  : `${blockedSlots.length} horário(s) bloqueado(s)`}
              </div>
            </div>
          </div>

          {/* Slots list */}
          <div className="card card-flush" style={{ overflow: "hidden" }}>
            {blockLoading ? (
              <div
                style={{ padding: 40, textAlign: "center", color: "var(--gray-400)" }}
              >
                Carregando bloqueios...
              </div>
            ) : (
              TIME_SLOTS.map((time) => {
                const blocked = blockedSlots.find(
                  (b) => normalizeTime(b.slot_time) === time
                )
                const isActionLoading =
                  blockingSlot === time || blockingSlot === blocked?.id

                return (
                  <div
                    key={time}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 20px",
                      borderBottom: "1px solid var(--gray-50)",
                    }}
                  >
                    {/* Time */}
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 14,
                        color: "var(--teal-700)",
                        minWidth: 60,
                        flexShrink: 0,
                      }}
                    >
                      {time}
                    </div>

                    {/* Status */}
                    <div style={{ flex: 1, paddingLeft: 16 }}>
                      {blocked ? (
                        <div className="g-flex gap-8" style={{ alignItems: "center" }}>
                          <span
                            className="badge"
                            style={{
                              background: "var(--red-50)",
                              color: "var(--red-700)",
                              border: "1px solid var(--red-600)",
                            }}
                          >
                            <i
                              className="ti ti-lock"
                              style={{ marginRight: 4, fontSize: 11 }}
                            />
                            Bloqueado
                          </span>
                          {blocked.reason && (
                            <span className="muted text-sm">{blocked.reason}</span>
                          )}
                        </div>
                      ) : (
                        <span className="badge badge-neutral">Livre</span>
                      )}
                    </div>

                    {/* Action */}
                    <div>
                      {blocked ? (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDesbloquear(blocked.id)}
                          disabled={isActionLoading}
                          style={{ color: "var(--green-600)" }}
                        >
                          <i className="ti ti-lock-open" style={{ marginRight: 4 }} />
                          {isActionLoading ? "..." : "Desbloquear"}
                        </button>
                      ) : (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleBloquear(time)}
                          disabled={isActionLoading}
                          style={{ color: "var(--red-600)" }}
                        >
                          <i className="ti ti-lock" style={{ marginRight: 4 }} />
                          {isActionLoading ? "..." : "Bloquear"}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* ==================== MODAL: REAGENDAR SESSÃO ==================== */}
      {reagendando && (
        <div
          className="modal-overlay active"
          onClick={(e) => { if (e.target === e.currentTarget && !reagendandoLoading) setReagendando(null) }}
        >
          <div className="modal" style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <h3>
                <i className="ti ti-calendar" style={{ marginRight: 8, color: "var(--teal-700)" }} />
                Reagendar sessão
              </h3>
              <button className="modal-close" onClick={() => setReagendando(null)} disabled={reagendandoLoading}>&times;</button>
            </div>

            <div style={{ fontSize: 13, color: "var(--gray-500)", marginBottom: 16 }}>
              Sessão {reagendando.session_number}/10 · {getPatientName(reagendando)}
            </div>

            <div className="g-grid grid-2" style={{ gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Nova data</label>
                <input
                  className="form-input"
                  type="date"
                  value={reagendandoForm.date}
                  onChange={(e) => setReagendandoForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Novo horário</label>
                <select
                  className="form-input"
                  value={reagendandoForm.time}
                  onChange={(e) => setReagendandoForm(f => ({ ...f, time: e.target.value }))}
                >
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setReagendando(null)} disabled={reagendandoLoading}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleReagendar} disabled={reagendandoLoading}>
                {reagendandoLoading ? "Salvando…" : "Confirmar reagendamento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: AGENDAR SESSÃO ==================== */}
      {agendandoSlot && (
        <div
          className="modal-overlay active"
          onClick={(e) => { if (e.target === e.currentTarget && !agendandoLoading) setAgendandoSlot(null) }}
        >
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3>
                <i className="ti ti-calendar" style={{ marginRight: 8, color: "var(--teal-700)" }} />
                Agendar sessão — {agendandoSlot.time}
              </h3>
              <button className="modal-close" onClick={() => setAgendandoSlot(null)} disabled={agendandoLoading}>&times;</button>
            </div>

            <div className="form-group">
              <label className="form-label">Paciente</label>
              {activePatients.length === 0 ? (
                <p className="muted text-sm">Nenhum paciente ativo com sessões disponíveis.</p>
              ) : (
                <select
                  className="form-input"
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                >
                  {activePatients.map((p) => (
                    <option key={p.id} value={p.id}>{p.full_name}</option>
                  ))}
                </select>
              )}
            </div>

            <div style={{ background: "var(--teal-50)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--teal-800)", marginBottom: 16 }}>
              <i className="ti ti-info-circle" style={{ marginRight: 6 }} />
              A próxima sessão disponível do paciente será agendada para <strong>{agendandoSlot.time}</strong> de hoje.
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setAgendandoSlot(null)} disabled={agendandoLoading}>Cancelar</button>
              <button
                className="btn btn-primary"
                onClick={handleAgendar}
                disabled={agendandoLoading || !selectedPatientId}
              >
                {agendandoLoading ? "Agendando…" : "Confirmar agendamento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== FINALIZATION MODAL ==================== */}
      {finalizing && (
        <div
          className="modal-overlay"
          onClick={() => !finalSaving && setFinalizing(null)}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 600, width: "100%", maxHeight: "90vh", overflowY: "auto" }}
          >
            <div className="modal-header">
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
                  Finalizar Sessão
                </h2>
                <p className="muted text-sm">
                  {getPatientName(finalizing)} &mdash; Sessão {finalizing.session_number}/10
                  &nbsp;&nbsp;
                  <span className="badge badge-neutral" style={{ fontSize: 11 }}>
                    {normalizeTime(finalizing.scheduled_time)}
                  </span>
                </p>
              </div>
              <button
                className="modal-close"
                onClick={() => !finalSaving && setFinalizing(null)}
                disabled={finalSaving}
              >
                <i className="ti ti-x" />
              </button>
            </div>

            <div
              style={{
                padding: "20px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {/* Evolution notes */}
              <div className="form-group">
                <label className="form-label">
                  <i className="ti ti-stethoscope" style={{ marginRight: 6 }} />
                  Notas de evolução
                </label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Descreva a evolução da paciente nesta sessão..."
                  value={finalForm.evolution_notes}
                  onChange={(e) =>
                    setFinalForm((f) => ({ ...f, evolution_notes: e.target.value }))
                  }
                />
              </div>

              {/* Activities notes */}
              <div className="form-group">
                <label className="form-label">
                  <i className="ti ti-player-play" style={{ marginRight: 6 }} />
                  Atividades realizadas
                </label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Quais atividades foram realizadas na sessão..."
                  value={finalForm.activities_notes}
                  onChange={(e) =>
                    setFinalForm((f) => ({ ...f, activities_notes: e.target.value }))
                  }
                />
              </div>

              {/* Recommendations */}
              <div className="form-group">
                <label className="form-label">Recomendações</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Recomendações para a paciente até a próxima sessão..."
                  value={finalForm.recommendation_notes}
                  onChange={(e) =>
                    setFinalForm((f) => ({
                      ...f,
                      recommendation_notes: e.target.value,
                    }))
                  }
                />
              </div>

              {/* Location */}
              <div className="form-group">
                <label className="form-label">Local / Sala</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Sala 1, Espaço principal..."
                  value={finalForm.location}
                  onChange={(e) =>
                    setFinalForm((f) => ({ ...f, location: e.target.value }))
                  }
                />
              </div>

              {/* Checkboxes */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 14px",
                    background: "var(--gray-50)",
                    borderRadius: 8,
                    cursor: "pointer",
                    border: finalForm.was_punctual
                      ? "1px solid var(--teal-600)"
                      : "1px solid var(--gray-300)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={finalForm.was_punctual}
                    onChange={(e) =>
                      setFinalForm((f) => ({ ...f, was_punctual: e.target.checked }))
                    }
                    style={{ width: 16, height: 16, accentColor: "var(--teal-600)" }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>
                    <i
                      className="ti ti-circle-check"
                      style={{ marginRight: 4, color: "var(--teal-600)" }}
                    />
                    Foi pontual?
                  </span>
                </label>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 14px",
                    background: "var(--gray-50)",
                    borderRadius: 8,
                    cursor: "pointer",
                    border: finalForm.did_activities
                      ? "1px solid var(--teal-600)"
                      : "1px solid var(--gray-300)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={finalForm.did_activities}
                    onChange={(e) =>
                      setFinalForm((f) => ({
                        ...f,
                        did_activities: e.target.checked,
                      }))
                    }
                    style={{ width: 16, height: 16, accentColor: "var(--teal-600)" }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>
                    <i
                      className="ti ti-player-play"
                      style={{ marginRight: 4, color: "var(--teal-600)" }}
                    />
                    Realizou atividades em casa?
                  </span>
                </label>
              </div>

              {/* Certificate checkbox */}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 14px",
                  background: finalForm.requires_certificate
                    ? "var(--amber-50)"
                    : "var(--gray-50)",
                  borderRadius: 8,
                  cursor: "pointer",
                  border: finalForm.requires_certificate
                    ? "1px solid var(--amber-400)"
                    : "1px solid var(--gray-300)",
                }}
              >
                <input
                  type="checkbox"
                  checked={finalForm.requires_certificate}
                  onChange={(e) =>
                    setFinalForm((f) => ({
                      ...f,
                      requires_certificate: e.target.checked,
                    }))
                  }
                  style={{ width: 16, height: 16, accentColor: "var(--amber-700)" }}
                />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: finalForm.requires_certificate
                      ? "var(--amber-700)"
                      : "inherit",
                  }}
                >
                  Requer atestado médico?
                </span>
              </label>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-ghost"
                onClick={() => !finalSaving && setFinalizing(null)}
                disabled={finalSaving}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleFinalizar}
                disabled={finalSaving}
              >
                {finalSaving ? (
                  "Salvando..."
                ) : (
                  <>
                    <i className="ti ti-check" style={{ marginRight: 6 }} />
                    Finalizar Sessão
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
