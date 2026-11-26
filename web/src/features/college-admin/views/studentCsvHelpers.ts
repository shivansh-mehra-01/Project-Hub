import type { DepartmentDto, CourseProgramDto } from "../../../lib/api/types";
import {
  DISALLOWED_SECURITY_CSV_HEADERS,
  escapeCsvField,
  MAX_ROSTER_ROWS,
  parseRfc4180Csv,
  validateInstitutionalEmail,
} from "./rosterCsvHelpers.ts";

// Normalizes a program string the same way the backend does: trim, uppercase, strip dots/dashes,
// collapse whitespace.  This ensures "B.Tech", "Btech", "B TECH", "B-TECH" all resolve uniformly.
function normalizeProgram(raw: string): string {
  if (!raw) return "";
  let s = raw.trim().toUpperCase();
  s = s.replace(/\./g, ""); // strip dots
  s = s.replace(/-/g, ""); // strip dashes/hyphens
  s = s.split(/\s+/).join(""); // collapse all whitespace
  return s;
}

export const STUDENT_CSV_HEADERS = [
  "StudentName",
  "Email",
  "StudentNumber",
  "DepartmentCode",
  "Program",
  "AdmissionYear",
  "CurrentSemester",
] as const;

export interface ParsedStudentRow {
  rowNumber: number;
  studentName: string;
  email: string;
  studentNumber: string;
  departmentCode: string;
  program?: string;
  admissionYear?: string;
  currentSemester?: number;
  status: "new" | "invalid";
  isValid: boolean;
  validationError?: string;
}

export interface ParsedStudentCsvResult {
  headers: string[];
  headerError: string | null;
  rows: ParsedStudentRow[];
}

export function generateStudentCsvTemplate(departments: DepartmentDto[] = []): string {
  const firstDept = departments[0]?.code || "CSE";
  const secondDept = departments[1]?.code || firstDept;
  const rows: string[][] = [
    [...STUDENT_CSV_HEADERS],
    ["Aarav Sharma", "aarav.sharma@gmail.com", "0176CS231001", firstDept, "BTECH", "2023", "5"],
    ["Diya Verma", "diya.verma@gmail.com", "0176EC231002", secondDept, "BTECH", "2023", "5"],
  ];
  return "\uFEFF" + rows.map((row) => row.map(escapeCsvField).join(",")).join("\r\n") + "\r\n";
}

export function parseStudentCsv(
  rawText: string,
  departments: DepartmentDto[],
  programs: CourseProgramDto[] = []
): ParsedStudentCsvResult {
  const { records, error } = parseRfc4180Csv(rawText);
  if (error) {
    return { headers: [], headerError: error, rows: [] };
  }
  if (records.length === 0) {
    return { headers: [], headerError: "CSV header row is required.", rows: [] };
  }

  const headers = records[0].map((h) => h.trim());
  const lower = headers.map((h) => h.toLowerCase());
  const forbidden = headers.filter((h) => DISALLOWED_SECURITY_CSV_HEADERS.has(h.toLowerCase()));
  if (forbidden.length > 0) {
    return {
      headers,
      headerError: `Security-sensitive column(s) (${forbidden.join(", ")}) are not permitted in Students.csv.`,
      rows: [],
    };
  }

  const seenHeader = new Set<string>();
  for (const h of headers) {
    const k = h.toLowerCase();
    if (seenHeader.has(k)) {
      return { headers, headerError: `Duplicate CSV header '${h}' detected.`, rows: [] };
    }
    seenHeader.add(k);
  }

  const required = ["studentname", "email", "studentnumber", "departmentcode"];
  const allowed = new Set([...required, "program", "admissionyear", "currentsemester"]);
  const missing = required.filter((r) => !seenHeader.has(r));
  const unexpected = lower.filter((h) => !allowed.has(h));
  if (missing.length > 0 || unexpected.length > 0) {
    return {
      headers,
      headerError:
        "Invalid CSV headers. Required: StudentName, Email, StudentNumber, DepartmentCode. Optional: Program, AdmissionYear, CurrentSemester.",
      rows: [],
    };
  }

  if (records.length < 2) {
    return { headers, headerError: "CSV must contain at least one student data row.", rows: [] };
  }
  if (records.length - 1 > MAX_ROSTER_ROWS) {
    return {
      headers,
      headerError: `Student roster import is limited to ${MAX_ROSTER_ROWS} rows per upload.`,
      rows: [],
    };
  }

  const idx = new Map<string, number>();
  headers.forEach((h, i) => idx.set(h.toLowerCase(), i));
  const nameIdx = idx.get("studentname")!;
  const emailIdx = idx.get("email")!;
  const numIdx = idx.get("studentnumber")!;
  const deptIdx = idx.get("departmentcode")!;
  const progIdx = idx.get("program");
  const yearIdx = idx.get("admissionyear");
  const semIdx = idx.get("currentsemester");

  const deptByCode = new Map(
    departments.map((d) => [d.code.trim().toUpperCase(), d])
  );
  const validPrograms = new Set(
    programs.flatMap((p) => [normalizeProgram(p.code), normalizeProgram(p.name)])
  );

  const seenEmails = new Set<string>();
  const seenNumbers = new Set<string>();
  const projectedAddsByDept = new Map<string, number>();
  const rows: ParsedStudentRow[] = [];

  for (let r = 1; r < records.length; r++) {
    const cols = records[r];
    if (cols.length !== headers.length) {
      rows.push({
        rowNumber: r,
        studentName: cols[nameIdx]?.trim() || "",
        email: cols[emailIdx]?.trim() || "",
        studentNumber: cols[numIdx]?.trim().toUpperCase() || "",
        departmentCode: cols[deptIdx]?.trim().toUpperCase() || "",
        status: "invalid",
        isValid: false,
        validationError: `Expected ${headers.length} columns, found ${cols.length}.`,
      });
      continue;
    }

    const studentName = cols[nameIdx].trim();
    const rawEmail = cols[emailIdx].trim();
    const normalizedEmail = rawEmail.toLowerCase();
    const studentNumber = cols[numIdx].trim().toUpperCase();
    const departmentCode = cols[deptIdx].trim().toUpperCase();
    const program = progIdx !== undefined ? cols[progIdx].trim() : "";
    const admissionYear = yearIdx !== undefined ? cols[yearIdx].trim() : "";
    const rawSem = semIdx !== undefined ? cols[semIdx].trim() : "";
    const currentSemester = rawSem ? Number.parseInt(rawSem, 10) : undefined;

    let validationError: string | undefined;
    const emailCheck = validateInstitutionalEmail(rawEmail);

    if (!studentName) {
      validationError = "StudentName is required.";
    } else if (!emailCheck.valid) {
      validationError = emailCheck.error || "Valid email is required.";
    } else if (seenEmails.has(normalizedEmail)) {
      validationError = `Duplicate Email '${normalizedEmail}' in file.`;
    } else if (!studentNumber) {
      validationError = "StudentNumber is required.";
    } else if (seenNumbers.has(studentNumber)) {
      validationError = `Duplicate StudentNumber '${studentNumber}' in file.`;
    } else if (!departmentCode || !deptByCode.has(departmentCode)) {
      validationError = `Unknown DepartmentCode '${departmentCode}'.`;
    } else if (program && validPrograms.size > 0 && !validPrograms.has(normalizeProgram(program))) {
      validationError = `Unknown Program '${program}'.`;
    } else if (
      admissionYear &&
      (!/^\d{4}$/.test(admissionYear) || Number(admissionYear) < 1990 || Number(admissionYear) > 2100)
    ) {
      validationError = "AdmissionYear must be a valid 4-digit year (1990–2100).";
    } else if (
      rawSem &&
      (Number.isNaN(currentSemester) || currentSemester! < 1 || currentSemester! > 12)
    ) {
      validationError = "CurrentSemester must be between 1 and 12.";
    } else {
      const targetDept = deptByCode.get(departmentCode)!;
      const quota = targetDept.intakeQuota || 0;
      const currentEnrolled = targetDept.studentCount ?? 0;
      const pendingAdds = projectedAddsByDept.get(departmentCode) ?? 0;
      if (quota > 0 && currentEnrolled + pendingAdds + 1 > quota) {
        validationError = `Department '${departmentCode}' has reached its sanctioned intake quota (${quota} seats).`;
      } else {
        projectedAddsByDept.set(departmentCode, pendingAdds + 1);
      }
    }

    if (emailCheck.valid) seenEmails.add(normalizedEmail);
    if (studentNumber) seenNumbers.add(studentNumber);

    rows.push({
      rowNumber: r,
      studentName,
      email: normalizedEmail || rawEmail,
      studentNumber,
      departmentCode,
      program: program || undefined,
      admissionYear: admissionYear || undefined,
      currentSemester: Number.isNaN(currentSemester) ? undefined : currentSemester,
      status: validationError ? "invalid" : "new",
      isValid: !validationError,
      validationError,
    });
  }

  return { headers, headerError: null, rows };
}
