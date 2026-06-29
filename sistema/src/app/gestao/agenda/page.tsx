"use client";

import { useState } from "react";

const HOJE = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

const SLOTS_DIA = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00"];

export default function AgendaPage() {
  const [tab, setTab] = useState<"hoje" | "semana">("hoje");

  return (
    <>
      <div className="tabs">
        <button className={`tab-btn${tab === "hoje" ? " active" : ""}`} onClick={() => setTab("hoje")}>Hoje</button>
        <button className={`tab-btn${tab === "semana" ? " active" : ""}`} onClick={() => setTab("semana")}>Semana</button>
      </div>

      {tab === "hoje" && (
        <div className="card card-flush">
          <div style={{ padding: "18px 20px 4px" }}>
            <div className="section-title" style={{ textTransform: "capitalize" }}>{HOJE}</div>
          </div>
          {SLOTS_DIA.map((hora) => (
            <div className="list-row" key={hora}>
              <div className="list-time">{hora}</div>
              <div style={{ flex: 1 }}>
                <span className="text-sm muted">Horário livre</span>
              </div>
              <span className="badge badge-neutral">Disponível</span>
            </div>
          ))}
        </div>
      )}

      {tab === "semana" && (
        <div className="card">
          <div className="section-title">
            {new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}
          </div>
          <div className="table-scroll-wrap">
            <table className="g-table">
              <thead>
                <tr>
                  <th>Horário</th>
                  <th>Segunda</th>
                  <th>Terça</th>
                  <th>Quarta</th>
                  <th>Quinta</th>
                  <th>Sexta</th>
                </tr>
              </thead>
              <tbody>
                {["08:00", "09:00", "10:00", "14:00", "15:00"].map((hora) => (
                  <tr key={hora}>
                    <td className="text-sm fw-600">{hora}</td>
                    {["Seg", "Ter", "Qua", "Qui", "Sex"].map((d) => (
                      <td key={d}><span className="badge badge-neutral">Livre</span></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
