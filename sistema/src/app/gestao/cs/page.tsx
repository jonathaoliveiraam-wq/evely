export default function CSPage() {
  return (
    <>
      <div className="g-grid grid-2 mb-16">
        <div className="card">
          <div className="section-title">
            <span>
              <i className="ti ti-file-off" style={{ color: "var(--red-700)", marginRight: 6 }} />
              Sem contrato (pacote vencido)
            </span>
          </div>
          <div style={{ color: "var(--gray-400)", fontSize: 13 }}>Nenhum pacote vencido sem renovação.</div>
        </div>

        <div className="card">
          <div className="section-title">
            <span>
              <i className="ti ti-cake" style={{ color: "var(--orange-500)", marginRight: 6 }} />
              Aniversariantes do mês
            </span>
          </div>
          <div style={{ color: "var(--gray-400)", fontSize: 13 }}>Nenhum aniversariante cadastrado este mês.</div>
        </div>
      </div>

      <div className="card">
        <div className="section-title">Pacientes suspensos (viagem)</div>
        <div className="table-scroll-wrap">
          <table className="g-table">
            <thead>
              <tr><th>Paciente</th><th>Motivo</th><th>Retorno previsto</th><th /></tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4} style={{ textAlign: "center", color: "var(--gray-400)", padding: "32px" }}>
                  Nenhuma suspensão ativa.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
