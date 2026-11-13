/**
 * Unified CSV Export, Template Download, and CSV Parser Helper
 * Compatible with modern browser environments and Microsoft Excel (UTF-8 BOM).
 */

/**
 * Escape a cell value for CSV output according to RFC 4180
 */
export function escapeCsvCell(value) {
  if (value === null || value === undefined) {
    return '""';
  }
  if (typeof value === "object") {
    if (value instanceof Date) {
      return `"${value.toISOString()}"`;
    }
    // If it has a name or label property, use it
    if (value.name) return `"${String(value.name).replaceAll('"', '""')}"`;
    if (value.title) return `"${String(value.title).replaceAll('"', '""')}"`;
    if (value.label) return `"${String(value.label).replaceAll('"', '""')}"`;
    return `"${JSON.stringify(value).replaceAll('"', '""')}"`;
  }
  const str = String(value);
  return `"${str.replaceAll('"', '""')}"`;
}

/**
 * Export data array to a CSV file and trigger download
 * @param {Object} options
 * @param {string} options.filename - e.g. "customers-2026-11-13.csv"
 * @param {Array<{label: string, key?: string, dataIndex?: string, render?: (v, r) => any}>} options.columns
 * @param {Array<Object>} options.data - Array of row items
 */
export function exportToCsv({ filename = "export.csv", columns = [], data = [] }) {
  if (!columns || columns.length === 0) {
    throw new Error("Columns must be specified for CSV export");
  }

  const safeFilename = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  const headerLine = columns.map((col) => escapeCsvCell(col.label || col.title || col.key)).join(",");

  const rowLines = data.map((record) => {
    return columns
      .map((col) => {
        let val;
        if (typeof col.render === "function") {
          try {
            val = col.render(record[col.dataIndex || col.key], record);
            // If React node/element, try to fallback to raw data
            if (val && typeof val === "object" && !val.name && !val.label && val.$$typeof) {
              val = record[col.dataIndex || col.key];
            }
          } catch {
            val = record[col.dataIndex || col.key];
          }
        } else {
          val = record[col.dataIndex || col.key];
        }
        return escapeCsvCell(val);
      })
      .join(",");
  });

  // Prepend UTF-8 BOM (\uFEFF) so Excel respects UTF-8 encoding
  const csvContent = "\uFEFF" + [headerLine, ...rowLines].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", safeFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate and download a sample CSV template with instructions & sample data
 */
export function downloadCsvTemplate({ filename = "template.csv", columns = [], sampleRows = [] }) {
  const safeFilename = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  const headerLine = columns.map((col) => escapeCsvCell(col.label || col.title || col.key)).join(",");

  const sampleLines = (sampleRows.length > 0 ? sampleRows : [{}]).map((row) => {
    return columns
      .map((col) => {
        const val = row[col.key || col.dataIndex] ?? (col.sampleValue ?? "");
        return escapeCsvCell(val);
      })
      .join(",");
  });

  const csvContent = "\uFEFF" + [headerLine, ...sampleLines].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", safeFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Robust CSV string parser handling quotes, line breaks, commas
 * @param {string} text
 * @returns {{ headers: string[], rows: Object[] }}
 */
export function parseCsv(text) {
  if (!text || typeof text !== "string") {
    return { headers: [], rows: [] };
  }

  // Remove potential UTF-8 BOM
  let cleanText = text.replace(/^\uFEFF/, "").trim();
  if (!cleanText) return { headers: [], rows: [] };

  const lines = [];
  let currentRow = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i++;
        } else {
          // Closing quote
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (char === "\r") {
        if (nextChar === "\n") i++;
        currentRow.push(currentField.trim());
        lines.push(currentRow);
        currentRow = [];
        currentField = "";
      } else if (char === "\n") {
        currentRow.push(currentField.trim());
        lines.push(currentRow);
        currentRow = [];
        currentField = "";
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    lines.push(currentRow);
  }

  if (lines.length === 0) return { headers: [], rows: [] };

  const rawHeaders = lines[0];
  const headers = rawHeaders.map((h) => h.trim());

  const rows = [];
  for (let r = 1; r < lines.length; r++) {
    const rowData = lines[r];
    // Skip empty lines
    if (rowData.length === 1 && !rowData[0]) continue;
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = rowData[index] !== undefined ? rowData[index] : "";
    });
    rows.push(obj);
  }

  return { headers, rows };
}

/**
 * Validate parsed rows against schema
 * @param {Array<Object>} rows
 * @param {Array<{key: string, label: string, required?: boolean, validate?: (v) => boolean|string}>} columns
 */
export function validateImportRows(rows, columns) {
  const validRows = [];
  const invalidRows = [];

  rows.forEach((row, index) => {
    const rowNum = index + 2; // +1 for 1-based, +1 for header
    const errors = [];
    const normalized = {};

    columns.forEach((col) => {
      // Find matching key in row (case-insensitive & trimmed)
      const colLabel = (col.label || col.title || col.key || "").toLowerCase().trim();
      const colKey = (col.key || col.dataIndex || "").toLowerCase().trim();

      const matchedKey = Object.keys(row).find((k) => {
        const kClean = k.toLowerCase().trim();
        return kClean === colLabel || kClean === colKey;
      });

      const value = matchedKey !== undefined ? row[matchedKey] : "";
      normalized[col.key || col.dataIndex] = value;

      if (col.required && (!value || String(value).trim() === "")) {
        errors.push(`Field "${col.label || col.key}" is required`);
      } else if (value && typeof col.validate === "function") {
        const validationResult = col.validate(value);
        if (validationResult !== true && typeof validationResult === "string") {
          errors.push(validationResult);
        } else if (validationResult === false) {
          errors.push(`Invalid format for "${col.label || col.key}"`);
        }
      }
    });

    if (errors.length > 0) {
      invalidRows.push({ rowNum, row: normalized, errors });
    } else {
      validRows.push({ rowNum, row: normalized });
    }
  });

  return { validRows, invalidRows };
}
