"use client";
export const buttonStyle = {
  border: "1px solid rgba(255,255,255,0.32)",
  borderRadius: 10,
  padding: "10px 14px",
  background: "linear-gradient(135deg, #027196, #0B8CB7)",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};
export const inputStyle = {
  width: "100%",
  border: "1px solid rgba(255,255,255,0.82)",
  borderRadius: 10,
  padding: "10px 12px",
  background: "rgba(255,255,255,0.62)",
  backdropFilter: "blur(16px)",
};
export const cardStyle = {
  background: "rgba(255,255,255,0.62)",
  border: "1px solid rgba(255,255,255,0.86)",
  borderRadius: 14,
  padding: 16,
  backdropFilter: "blur(20px) saturate(1.5)",
  boxShadow: "0 18px 50px rgba(15,23,42,0.09), inset 0 1px rgba(255,255,255,0.9)",
};
export function AdminPage({ title, subtitle, children, right }) {
  return (
    <main className="admin-glass-page" style={{ padding: 24, minHeight: "100vh" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>{title}</h1>
          {subtitle ? <p style={{ color: "#6b7280" }}>{subtitle}</p> : null}
        </div>
        {right}
      </header>
      {children}
    </main>
  );
}
export function AdminTable({ columns, rows, actions }) {
  return (
    <div
      className="admin-glass-table"
      style={{
        overflowX: "auto",
        background: "rgba(255,255,255,0.62)",
        border: "1px solid rgba(255,255,255,0.86)",
        borderRadius: 12,
        backdropFilter: "blur(20px) saturate(1.5)",
        boxShadow: "0 18px 50px rgba(15,23,42,0.09), inset 0 1px rgba(255,255,255,0.9)",
      }}
    >
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}
      >
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={th}>
                {c.label}
              </th>
            ))}
            {actions ? <th style={th}>Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((r) => (
              <tr key={r.id || r.task_number || r.tracking_number}>
                {columns.map((c) => (
                  <td key={c.key} style={td}>
                    {c.render ? c.render(r) : (r[c.key] ?? "-")}
                  </td>
                ))}
                {actions ? <td style={td}>{actions(r)}</td> : null}
              </tr>
            ))
          ) : (
            <tr>
              <td style={td} colSpan={columns.length + (actions ? 1 : 0)}>
                No data found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
const th = {
  textAlign: "left",
  padding: "12px",
  background: "rgba(240,248,251,0.72)",
  borderBottom: "1px solid rgba(2,113,150,0.1)",
  whiteSpace: "nowrap",
};
const td = {
  padding: "12px",
  borderBottom: "1px solid rgba(2,113,150,0.07)",
  whiteSpace: "nowrap",
};
