/**
 * Hand-written RFC 4180 CSV parse and stringify.
 * Quoted fields, embedded commas, "" escapes, CRLF and LF, embedded newlines.
 * A leading UTF-8 BOM is stripped on parse. stringify uses CRLF and a trailing newline.
 */

function needsQuotes(value: string): boolean {
  return /[",\r\n]/.test(value);
}

function escapeField(value: string): string {
  if (!needsQuotes(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}

/** Parse CSV text into a matrix of fields. Does not trim cells. */
export function parseCsv(input: string): string[][] {
  let text = input;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  if (text.length === 0) return [];

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      // A quote starts a quoted field only at the beginning of the field.
      if (field.length === 0) {
        inQuotes = true;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }

    if (char === "\r" || char === "\n") {
      if (char === "\r" && text[i + 1] === "\n") i += 2;
      else i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
    i += 1;
  }

  // A trailing record separator already closed the last row. Anything left is a final row
  // that was not terminated by a newline.
  if (inQuotes || field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/** Serialize rows as RFC 4180 CSV (CRLF, trailing newline, quotes only when required). */
export function stringifyCsv(rows: string[][]): string {
  const body = rows.map((row) => row.map((cell) => escapeField(cell ?? "")).join(",")).join("\r\n");
  return rows.length === 0 ? "" : `${body}\r\n`;
}
