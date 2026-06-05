import XLSX from "xlsx";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.resolve(__dirname, "../../../Doc/Referências/Consórcio CAIS_MESADIGITAL.xlsx");
const wb = XLSX.readFile(file, { cellDates: true });
const sheet = wb.Sheets["BASE_CRM"];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: null, header: 1 });

console.log("=== Primeiras 25 linhas da BASE_CRM (raw) ===");
for (let i = 0; i < Math.min(25, rows.length); i++) {
  const r = rows[i];
  const cells = r.map((c, j) => {
    if (c == null) return "";
    const s = c instanceof Date ? c.toISOString().slice(0, 10) : String(c);
    return `[${j}]${s.slice(0, 40)}`;
  }).filter(Boolean);
  if (cells.length) console.log(`L${i + 1}:`, cells.join(" | "));
}

// Find row that looks like header (contains ID or Nome)
let headerRowIdx = -1;
for (let i = 0; i < rows.length; i++) {
  const joined = rows[i].map((c) => (c == null ? "" : String(c).toLowerCase())).join("|");
  if (joined.includes("id") && (joined.includes("nome") || joined.includes("cliente"))) {
    headerRowIdx = i;
    break;
  }
}
console.log("\nHeader row index (0-based):", headerRowIdx);

if (headerRowIdx >= 0) {
  const headers = rows[headerRowIdx].map((h) => (h == null ? "" : String(h).trim()));
  console.log("\n=== COLUNAS BASE_CRM ===");
  headers.forEach((h, i) => console.log(String(i + 1).padStart(2) + ".", h || "(vazio)"));

  const dataRows = rows.slice(headerRowIdx + 1).filter((r) =>
    r.some((c) => c != null && String(c).trim() !== "")
  );
  console.log("\nLinhas de dados:", dataRows.length);

  for (let i = 0; i < Math.min(3, dataRows.length); i++) {
    const obj = {};
    headers.forEach((h, j) => {
      if (h) {
        const v = dataRows[i][j];
        obj[h] = v instanceof Date ? v.toISOString() : v;
      }
    });
    console.log("\nExemplo", i + 1, JSON.stringify(obj, null, 2));
  }

  const uniq = (idx) => [...new Set(dataRows.map((r) => r[idx]).filter(Boolean).map(String))];
  const col = (name) => headers.findIndex((h) => h.toLowerCase().includes(name));
  console.log("\n=== Valores únicos ===");
  for (const key of ["status", "origem", "respons", "id"]) {
    const idx = col(key);
    if (idx >= 0) {
      const vals = uniq(idx);
      console.log(`${headers[idx]} (${vals.length}):`, vals.slice(0, 20).join(" | "));
    }
  }
}

// Also dump sheet range
const ref = sheet["!ref"];
console.log("\nSheet range:", ref);
