const FORMULA_INJECTION_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

/**
 * Escapa y sanitiza una celda CSV según RFC 4180, previniendo CSV Formula Injection.
 */
export function escapeCsvCell(value: unknown): string {
  const raw = value === null || value === undefined ? "" : String(value);
  const trimmedStart = raw.trimStart();
  const safe =
    trimmedStart.length > 0 && FORMULA_INJECTION_PREFIXES.includes(trimmedStart[0])
      ? `'${raw}`
      : raw;

  return `"${safe.replace(/"/g, '""')}"`;
}

/**
 * Construye una fila CSV delimitada por punto y coma.
 */
export function toCsvRow(values: unknown[], delimiter: string = ";"): string {
  return values.map(escapeCsvCell).join(delimiter);
}

/**
 * Detecta el delimitador más probable (';' o ',') analizando la línea de encabezados real.
 */
function detectCsvDelimiter(text: string): string {
  const sampleLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, 6);

  for (const line of sampleLines) {
    const normalized = line
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (
      normalized.includes("nombre") ||
      normalized.includes("first") ||
      normalized.includes("correo") ||
      normalized.includes("email")
    ) {
      const semiCount = (line.match(/;/g) || []).length;
      const commaCount = (line.match(/,/g) || []).length;
      return semiCount >= commaCount && semiCount > 0 ? ";" : ",";
    }
  }

  const firstLine = sampleLines[0] || "";
  return (firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length &&
    firstLine.includes(";")
    ? ";"
    : ",";
}

/**
 * Parsea un texto CSV respetando RFC 4180 (comillas dobles escapadas "", delimitadores y saltos de línea dentro de comillas, y BOM UTF-8).
 */
export function parseCsvRFC4180(rawText: string, explicitDelimiter?: string): string[][] {
  const text = rawText.replace(/^\uFEFF/, "");
  if (!text.trim()) return [];

  const delimiter = explicitDelimiter || detectCsvDelimiter(text);
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentCell += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentCell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      currentRow.push(currentCell.trim());
      currentCell = "";
    } else if (char === "\r" && nextChar === "\n") {
      currentRow.push(currentCell.trim());
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      i++;
    } else if (char === "\n" || char === "\r") {
      currentRow.push(currentCell.trim());
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }

  return rows;
}
