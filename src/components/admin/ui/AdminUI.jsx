"use client";
export const buttonStyle = {
  border: 0,
  borderRadius: 10,
  padding: "10px 14px",
  background: "#111827",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};
export const inputStyle = {
  width: "100%",
  border: "1px solid #d1d5db",
  borderRadius: 10,
  padding: "10px 12px",
};
export const cardStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 16,
};
export function AdminPage({ title, subtitle, children, right }) {
  return (
    <main style={{ padding: 24, background: "#f8fafc", minHeight: "100vh" }}>
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
      style={{
        overflowX: "auto",
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
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
  background: "#f9fafb",
  borderBottom: "1px solid #e5e7eb",
  whiteSpace: "nowrap",
};
const td = {
  padding: "12px",
  borderBottom: "1px solid #f1f5f9",
  whiteSpace: "nowrap",
};
