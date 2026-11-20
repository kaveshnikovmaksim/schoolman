import * as XLSX from "xlsx";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

export type ExportRow = {
  studentName: string;
  cells: { date: string; values: string }[]; // values e.g. "5,4" or "Н"
  average: string;
  trimester: string | number | "";
};

export function exportGradesToExcel(opts: {
  className: string;
  subjectName: string;
  quarterName: string;
  dates: string[]; // yyyy-MM-dd
  rows: ExportRow[];
}) {
  const { className, subjectName, quarterName, dates, rows } = opts;

  // Build header row: Ученик | dd MMM | ... | Средняя | Триместр
  const dateHeaders = dates.map((d) => format(parseISO(d), "dd MMM", { locale: ru }));
  const aoa: any[][] = [];
  aoa.push([`${subjectName} — ${className} — ${quarterName}`]);
  aoa.push([]);
  aoa.push(["Ученик", ...dateHeaders, "Средняя", "Триместр"]);

  rows.forEach((r) => {
    const cellsByDate = new Map(r.cells.map((c) => [c.date, c.values]));
    aoa.push([
      r.studentName,
      ...dates.map((d) => cellsByDate.get(d) ?? ""),
      r.average,
      r.trimester,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // Column widths
  ws["!cols"] = [{ wch: 24 }, ...dates.map(() => ({ wch: 7 })), { wch: 9 }, { wch: 9 }];
  // Merge title across all columns
  const totalCols = 1 + dates.length + 2;
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Журнал");

  const safe = (s: string) => s.replace(/[\\/:*?"<>|]/g, "_");
  const filename = `Журнал_${safe(className)}_${safe(subjectName)}_${safe(quarterName)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export type ImportedGrade = {
  studentName: string;
  date: string; // yyyy-MM-dd
  value: number;
};

/** Parses an .xlsx and returns a list of grades to import.
 *  Expects: row 3 = headers (Ученик, dates..., Средняя, Триместр). Date columns in same yyyy-MM-dd order as `dates`. */
export async function parseGradesXlsx(file: File, dates: string[]): Promise<ImportedGrade[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const aoa: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  // Find header row by locating "Ученик"
  const headerIdx = aoa.findIndex((r) => Array.isArray(r) && r.some((c) => String(c).trim().toLowerCase() === "ученик"));
  if (headerIdx === -1) throw new Error("Не найдена строка заголовка с колонкой 'Ученик'");

  const result: ImportedGrade[] = [];
  for (let i = headerIdx + 1; i < aoa.length; i++) {
    const row = aoa[i];
    if (!row || !row[0]) continue;
    const studentName = String(row[0]).trim();
    if (!studentName) continue;
    for (let j = 0; j < dates.length; j++) {
      const cell = row[1 + j];
      if (cell == null || cell === "") continue;
      const raw = String(cell).trim();
      // Skip absences and non-grade tokens
      if (/^Н/i.test(raw)) continue;
      // Split by comma/slash/space
      const tokens = raw.split(/[,\/\s]+/).filter(Boolean);
      tokens.forEach((t) => {
        const n = parseInt(t.replace(/[^0-9]/g, ""), 10);
        if (n >= 2 && n <= 5) {
          result.push({ studentName, date: dates[j], value: n });
        }
      });
    }
  }
  return result;
}
